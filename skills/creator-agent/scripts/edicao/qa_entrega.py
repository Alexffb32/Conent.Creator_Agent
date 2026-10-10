# Verificação automática antes de entregar uma versão: transforma as regras do criador e as lições técnicas em testes.
# Uso (o pipeline.py exportar chama-o): python3 qa_entrega.py <video.mp4> <config.json> [--criador <pasta>] [--chat <copia.mp4>] [--chat-mb 30] [--saida qa.json]
# Sai com 1 se alguma verificação falhar. Cada regra "dura" ou "confirmada" de estilo/estilo-criador.md aparece no relatório:
# com verificação automática (o texto da regra aciona-a) ou "só por instrução" (o agente tem de a conferir à mão no QA do estágio 7).
import argparse, json, re, subprocess, sys
from pathlib import Path

TRAVESSOES = ("\u2014", "\u2013", "--")
# palavras do português do Brasil que não devem aparecer no ecrã de um criador em português europeu
BRASIL = ("tela", "celular", "arquivo", "gerenciar", "você está fazendo", "ônibus", "equipe", "time de", "legal!", "bacana", "baixar o app")


def textos(o, caminho=""):
    """Todas as cadeias de texto do config, com o caminho onde estão. Ignora chaves técnicas."""
    ignorar = {"sfx_eventos", "sfx_mapa", "takes", "fonte", "logo", "fundo", "cores", "cor", "tokens"}
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ignorar: continue
            yield from textos(v, f"{caminho}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from textos(v, f"{caminho}[{i}]")
    elif isinstance(o, str) and re.search(r"[A-Za-zÀ-ÿ]{2}", o) and not re.fullmatch(r"[#\w./:\-]+", o):
        yield caminho, o


def regras_do_criador(raiz):
    f = Path(raiz) / "estilo" / "estilo-criador.md" if raiz else None
    if not f or not f.exists(): return []
    out = []
    for linha in f.read_text(encoding="utf-8").splitlines():
        m = re.match(r"- \[(dura|confirmada)\] (.+?) \(v[ií]deos com pedido", linha) or re.match(r"- \[(dura|confirmada)\] (.+?) \(pedidos", linha)
        if m: out.append((m.group(1), m.group(2)))
    return out


def medir_audio(mp4):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(mp4), "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True)
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr); p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def sonda(mp4):
    v = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,r_frame_rate:format=duration",
                                   "-of", "json", str(mp4)], capture_output=True, text=True, check=True).stdout)
    vs = next((s for s in v["streams"] if s["codec_type"] == "video"), {})
    a = [s for s in v["streams"] if s["codec_type"] == "audio"]
    num, den = (vs.get("avg_frame_rate", "0/1") + "/1").split("/")[:2]
    return {"w": vs.get("width"), "h": vs.get("height"), "fps": float(num) / float(den or 1), "audio": bool(a), "dur": float(v["format"]["duration"])}


def piscadelas(mp4, limiar=1.5):
    """Fotogramas que diferem dos dois vizinhos enquanto os vizinhos são parecidos (um cartão ou legenda que pisca)."""
    import numpy as np
    w, h = 90, 160
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(mp4), "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    out = []
    for i in range(1, len(f) - 1):
        a, b, c = (np.abs(f[i] - f[i - 1]).mean(), np.abs(f[i] - f[i + 1]).mean(), np.abs(f[i + 1] - f[i - 1]).mean())
        if min(a, b) > limiar and c < 0.5 * min(a, b): out.append(round(i / 30, 2))
    return out


def verificar(mp4, cfg, raiz=None, chat=None, chat_mb=30):
    res = []  # (id, ok, detalhe, regra)

    def r(i, ok, det, regra=""): res.append({"id": i, "ok": bool(ok), "detalhe": det, "regra": regra})
    s = sonda(mp4)
    r("formato", (s["w"], s["h"]) == (1080, 1920), f"{s['w']}x{s['h']} (esperado 1080x1920)")
    r("fps_constante", abs(s["fps"] - 30) < 0.05, f"{s['fps']:.2f} fps (esperado 30)", "licao 1")
    r("audio", s["audio"], "tem faixa de áudio" if s["audio"] else "sem áudio")
    r("duracao_reels", s["dur"] <= 90, f"{s['dur']:.1f} s (o Instagram não recomenda a quem não segue mais de 90 s)")
    i, p = medir_audio(mp4)
    r("loudness", i is not None and abs(i + 14) <= 1.5, f"{i} LUFS (alvo -14 ± 1,5)", "licao 19")
    r("pico", p is not None and p <= -1.0, f"{p} dBFS (máximo -1)", "licao 19")
    pis = piscadelas(mp4)
    r("sem_piscar", not pis, "nenhum fotograma isolado a piscar" if not pis else f"{len(pis)} fotogramas a piscar, por exemplo aos {pis[:5]} s")
    if chat:
        mb = Path(chat).stat().st_size / 2**20
        r("copia_chat", mb <= chat_mb, f"{mb:.1f} MB (máximo {chat_mb})", "licao 24")
    ts = list(textos(cfg))
    mau = [(c, t) for c, t in ts if any(x in t for x in TRAVESSOES)]
    r("sem_travessoes", not mau, "nenhum travessão no texto do ecrã" if not mau else f"{len(mau)} com travessão, por exemplo {mau[0][0]}: {mau[0][1][:60]!r}", "licao 26")
    br = [(c, t) for c, t in ts if any(w in t.lower() for w in BRASIL)]
    r("portugues_europeu", not br, "sem palavras do português do Brasil" if not br else f"{br[0][0]}: {br[0][1][:60]!r}")
    if "barra_progresso" in json.dumps(cfg): r("sem_barra_progresso", False, "o config tem barra de progresso", "licao 14")
    # cada regra do criador: tem verificação automática ou fica por instrução
    auto = {"travess": "sem_travessoes", "portugu": "portugues_europeu", "chat": "copia_chat", "barra": "sem_barra_progresso", "loudness": "loudness"}
    cobertas, so_instrucao = [], []
    for nivel, regra in regras_do_criador(raiz):
        chave = next((v for k, v in auto.items() if k in regra.lower()), None)
        (cobertas if chave else so_instrucao).append({"nivel": nivel, "regra": regra, "verificacao": chave})
    return res, cobertas, so_instrucao


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("mp4"); ap.add_argument("config")
    ap.add_argument("--criador"); ap.add_argument("--chat"); ap.add_argument("--chat-mb", type=float, default=30); ap.add_argument("--saida")
    a = ap.parse_args()
    res, cobertas, so_instrucao = verificar(a.mp4, json.load(open(a.config)), a.criador, a.chat, a.chat_mb)
    for x in res: print(f"  [{'ok' if x['ok'] else 'FALHA'}] {x['id']}: {x['detalhe']}")
    if so_instrucao:
        print(f"  {len(so_instrucao)} regra(s) do criador sem verificação automática (conferir à mão no QA):")
        for x in so_instrucao: print(f"    - [{x['nivel']}] {x['regra']}")
    falhas = [x for x in res if not x["ok"]]
    if a.saida: json.dump({"ok": not falhas, "verificacoes": res, "regras_cobertas": cobertas, "regras_so_por_instrucao": so_instrucao}, open(a.saida, "w"), ensure_ascii=False, indent=1)
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
