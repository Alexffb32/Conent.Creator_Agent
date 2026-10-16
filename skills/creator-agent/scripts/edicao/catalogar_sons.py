# Cataloga uma pasta de sons do criador: mede cada som, sugere o tipo de animação a que serve, marca os que não
# combinam com conteúdo de autoridade (memes) e propõe o mapa.json que o pipeline usa nos SFX.
# Uso: python3 catalogar_sons.py <pasta_dos_sons> [--manter-mapa]
# Escreve <pasta>/sons.json (catálogo) e <pasta>/mapa.json (só se não existir, ou sem --manter-mapa).
# O agente confirma o mapa com o criador e ajusta os níveis depois de ouvir o feedback.
import json, re, sys
from pathlib import Path
import numpy as np
from audio_util import SR, ler, lufs_m, envolvente_db

EXT = (".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".aif", ".aiff")
# palavras no nome -> tipo (por ordem de prioridade)
NOMES = [
    ("type", r"keyboard|typing|teclad|tecla|type"), ("click", r"click|clique|mouse|tap"), ("whoosh", r"whoosh|swish|swoosh|swipe|transition|transic"),
    ("riser", r"riser|rise|build|uplifter"), ("boom", r"impact|boom|bass|hit|drop|thud|impacto"), ("notif", r"ding|bell|notif|chime|ping|alert|sino"),
    ("shimmer", r"shimmer|sparkle|magic|brilho|glitter"), ("pop", r"pop|bubble|bolha|blip"),
    ("outro", r"camera|shutter|flash|glitch|static|right|correct|success|certo|core|error|erro"),
]
MEMES = r"among ?us|fah+|vine ?boom|bruh|wrong|errado|oof|airhorn|sad ?trombone|nope|wow|laugh|riso|cash|register|ka-?ching|fart|scream"
ALVO = {"pop": -37, "whoosh": -35, "notif": -35, "click": -45, "tick": -43, "shimmer": -36, "riser": -36, "boom": -38, "type": -52}
pasta = Path(sys.argv[1]); manter = "--manter-mapa" in sys.argv


def analisar(p):
    x = ler(p); mono = x.mean(axis=1); n = len(mono); ab = np.abs(mono); pico = ab.max() + 1e-12
    inicio = int(np.argmax(ab > pico * 10 ** (-30 / 20))); t_pico = int(ab.argmax())
    env, passo = envolvente_db(mono); mx = env.max()
    acima = np.where(env > mx - 25)[0]; fim = (acima[-1] + 1) * passo if len(acima) else n / SR
    w = np.abs(np.fft.rfft(mono * np.hanning(n))); f = np.fft.rfftfreq(n, 1 / SR)
    cent = float((f * w).sum() / (w.sum() + 1e-12)); graves = float((w[f < 200] ** 2).sum() / ((w ** 2).sum() + 1e-12))
    # transientes (teclas): subidas rápidas separadas por > 60 ms
    on, ult = [], -1
    for k in range(3, len(env)):
        if env[k] > mx - 22 and env[k] - env[k - 3] > 12 and (ult < 0 or (k - ult) * passo > 0.06): on.append(round(k * passo, 3)); ult = k
    return {"dur": round(n / SR, 3), "inicio": round(inicio / SR, 3), "pico": round(t_pico / SR, 3), "som_ate": round(fim, 3),
            "pico_dbfs": round(20 * np.log10(pico), 1), "lufs_m": round(lufs_m(x[inicio:]), 1), "centroide_hz": int(cent),
            "graves_pct": round(100 * graves), "transientes": on}


def tipo_por_analise(a):
    util = a["som_ate"] - a["inicio"]; subida = a["pico"] - a["inicio"]
    if len(a["transientes"]) >= 6 and util > 1.0: return "type"
    if subida > 0.5 and a["pico"] > 0.6 * a["som_ate"]: return "riser"
    if a["graves_pct"] > 70 and util > 0.6: return "boom"
    if util < 0.25 and a["centroide_hz"] > 2500: return "click"
    if util < 0.3: return "pop"
    if a["centroide_hz"] > 2000 and util > 0.4 and subida < 0.05: return "notif"
    if 0.05 < subida < 0.4: return "whoosh"
    return "pop"


cat = []
for p in sorted(q for q in pasta.iterdir() if q.suffix.lower() in EXT):
    try: a = analisar(p)
    except Exception as e: print(f"AVISO não consegui ler {p.name}: {e}", file=sys.stderr); continue
    nome = p.stem.lower()
    por_nome = next((t for t, rx in NOMES if re.search(rx, nome)), None)
    meme = bool(re.search(MEMES, nome))
    a.update({"ficheiro": p.name, "tipo": por_nome or tipo_por_analise(a), "tipo_por": "nome" if por_nome else "análise (confiança baixa)",
              "excluir": meme, "motivo": "som de meme ou cómico, não combina com conteúdo de autoridade" if meme else ""})
    cat.append(a)
    print(f"{p.name:28s} {a['tipo']:8s} ({a['tipo_por'][:7]:7s}) {a['dur']:5.2f}s pico {a['pico']:.2f}s {a['lufs_m']:6.1f} LUFS-M"
          + ("  EXCLUÍDO (meme)" if meme else ""))
json.dump(cat, open(pasta / "sons.json", "w"), ensure_ascii=False, indent=1)


def entrada(tipo, a):
    if tipo == "type":
        tec = a["transientes"]; tec = tec[len(tec) // 4: len(tec) // 4 + 6] if len(tec) >= 6 else tec
        return {"ficheiro": a["ficheiro"], "teclas": tec, "dur": 0.08, "pre": 0.004, "lufs": ALVO["type"], "pan": 0.55}
    de = max(0.0, round(a["inicio"] - 0.005, 3))
    imp = round(a["pico"] - de, 3) if tipo in ("whoosh", "riser") else round(a["inicio"] - de + 0.01, 3)
    ate = round(min(a["dur"], a["som_ate"] + (0.6 if tipo in ("notif", "boom", "shimmer") else 0.15)), 3)
    e = {"ficheiro": a["ficheiro"], "de": de, "ate": ate, "impacto": imp, "lufs": ALVO.get(tipo, -40),
         "fade": 0.9 if tipo == "notif" else 1.2 if tipo == "boom" else 0.25 if tipo == "whoosh" else 0.05}
    if tipo == "click": e["pan"] = 0.6
    return e


mapa_p = pasta / "mapa.json"
if mapa_p.exists() and manter:
    print(f"\nMapa existente mantido: {mapa_p}")
else:
    usaveis = [a for a in cat if not a["excluir"]]
    mapa = {}
    for tipo in ("pop", "whoosh", "notif", "type", "click", "riser", "boom", "shimmer"):
        cands = [a for a in usaveis if a["tipo"] == tipo]
        if any(a["tipo_por"] == "nome" for a in cands): cands = [a for a in cands if a["tipo_por"] == "nome"]
        if cands:  # pelo nome primeiro; o mais curto (mais leve), exceto no riser, que precisa de subida
            util = lambda a: a["som_ate"] - a["inicio"]
            a = sorted(cands, key=lambda a: -min(util(a), 3.0) if tipo == "riser" else util(a))[0]
            mapa[tipo] = entrada(tipo, a)
    if "pop" in mapa:  # mosaicos e listas: o pop, mais agudo e mais baixo, a alternar entre esquerda e direita
        mapa["tick"] = dict(mapa["pop"], lufs=ALVO["tick"], semitons=[2, 4, 5, 7], pans=[0.42, 0.58, 0.42, 0.58])
    if "shimmer" not in mapa and "riser" in mapa: mapa["shimmer"] = dict(mapa["riser"])
    elif "shimmer" not in mapa and "notif" in mapa: mapa["shimmer"] = dict(mapa["notif"], lufs=-40)
    json.dump(mapa, open(mapa_p, "w"), ensure_ascii=False, indent=1)
    faltam = [t for t in ("pop", "whoosh", "notif", "type", "click", "tick", "riser", "boom", "shimmer") if t not in mapa]
    print(f"\nMapa proposto em {mapa_p}: " + ", ".join(f"{t} = {m['ficheiro']}" for t, m in mapa.items())
          + (f"\nSem som para: {', '.join(faltam)} (o pipeline salta-os; gera um kit com gerar_sons.py ou junta sons)" if faltam else ""))
