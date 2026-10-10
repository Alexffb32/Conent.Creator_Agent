#!/usr/bin/env python3
"""Audita o que já foi publicado e sugere a fase, a série e o formato do próximo post.
Uso: python3 proximo-post.py [--raiz .] [--seguidores N] [--mix 60,25,15] [--janela 20] [--dias 90] [--json] [--escrever]
Lê creator.md (objetivo, audiência atual), estrategia/estrategia.md (linha opcional "mix: 60/25/15") e historico/posts.csv
(colunas: data, plataforma, tipo, fase, serie, tema, link, alcance, retencao_3s, partilhas, guardados, conversoes).
O modelo é o de biblioteca/pesquisa/funil-estrategia.md: desvio = alvo - atual, maior desvio decide a fase. Os alvos são hipóteses
(não há estudo que prove uma divisão ideal): corrigem-se com os dados do criador."""
import argparse, csv, datetime as dt, json, re, statistics, sys
from pathlib import Path

MIX_OBJ = {"crescer": (60, 30, 10), "marca": (50, 35, 15), "vender": (40, 30, 30), "parcerias": (40, 35, 25)}
FASES = ["topo", "meio", "fundo"]
TIPO_POR_FASE = {
    "topo": "educativo curto, opinião ou demonstração para quem ainda não te conhece (problema do público, não a tua oferta)",
    "meio": "tutorial mais fundo, bastidores, erro comum, caso real ou carrossel que se guarda",
    "fundo": "prova social, demonstração da oferta ou convite claro à ação (mensagem, marcar conversa)",
}
FORMATO_PADRAO = {"topo": "reel", "meio": "carrossel ou reel", "fundo": "reel com caso ou stories"}
CTA_FASE = {"topo": "seguir, guardar ou enviar a quem tem este problema (sem pedir contacto)",
            "meio": "comentar para receber um recurso, ou guardar",
            "fundo": "mensagem direta ou marcar conversa"}


def texto(raiz, nome):
    f = raiz / nome
    return f.read_text(encoding="utf-8") if f.exists() else ""


def objetivo(raiz):
    m = re.search(r"^objetivo:\s*(\w+)", texto(raiz, "creator.md"), re.M | re.I)
    o = (m.group(1).lower() if m else "crescer")
    return o if o in MIX_OBJ else "crescer"


def seguidores(raiz, arg):
    if arg is not None: return arg
    m = re.search(r"^audi[eê]ncia atual:\s*([\d.\s]+)\s*(mil|k)?", texto(raiz, "creator.md"), re.M | re.I)
    if not m or not m.group(1).strip(" ."): return None
    n = float(m.group(1).replace(" ", "").replace(".", "") or 0)
    return int(n * 1000) if m.group(2) else int(n)


def mix_alvo(raiz, obj, segs, arg):
    if arg:
        return tuple(int(x) for x in re.split(r"[,/ ]+", arg.strip())), "dado por --mix"
    m = re.search(r"^mix:\s*(\d+)\s*[/,]\s*(\d+)\s*[/,]\s*(\d+)", texto(raiz, "estrategia/estrategia.md"), re.M | re.I)
    if m: return tuple(int(x) for x in m.groups()), "escolhido em estrategia/estrategia.md"
    base = MIX_OBJ[obj]
    if segs is not None and segs < 1000:  # sem alcance não há funil: mais topo (hipótese, confiança baixa)
        return (max(base[0], 60), min(base[1], 25), base[2] if base[2] <= 15 else 15), f"objetivo {obj} ajustado a audiência pequena ({segs} seguidores)"
    return base, f"objetivo {obj}"


def historico(raiz):
    f = raiz / "historico" / "posts.csv"
    if not f.exists(): return []
    with f.open(encoding="utf-8", newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if (r.get("fase") or "").strip()]
    for r in rows:
        r["fase"] = r["fase"].strip().lower()
        try: r["_d"] = dt.date.fromisoformat((r.get("data") or "").strip())
        except ValueError: r["_d"] = None
    return sorted(rows, key=lambda r: r["_d"] or dt.date.min)


def num(x):
    try: return float(str(x).replace(",", ".").replace("%", ""))
    except ValueError: return None


def auditar(rows, janela, dias, hoje):
    ult = rows[-janela:]
    if dias: ult = [r for r in ult if r["_d"] is None or (hoje - r["_d"]).days <= dias] or ult
    n = len(ult)
    cont = {f: sum(1 for r in ult if r["fase"] == f) for f in FASES}
    real = {f: (100 * cont[f] / n if n else 0) for f in FASES}
    faltam = {c: sum(1 for r in ult if not (r.get(c) or "").strip()) for c in ("alcance", "retencao_3s", "partilhas", "guardados", "conversoes")}
    return ult, n, cont, real, faltam


def escolher(rows, ult, real, alvo, hoje):
    if not ult: return "topo", "Sem histórico: começar por alcance (topo)."
    ultima = ult[-1]["fase"]
    seguidos_topo = 0
    for r in reversed(ult):
        if r["fase"] != "topo": break
        seguidos_topo += 1
    desvio = {f: alvo[i] - real[f] for i, f in enumerate(FASES)}
    cand = [f for f in FASES if not (f == "fundo" and ultima == "fundo")]
    if seguidos_topo >= 3: cand = [f for f in cand if f != "topo"] or cand
    escolha = max(cand, key=lambda f: (desvio[f], -FASES.index(f)))  # empate: mais perto do topo
    motivo = "; ".join(f"{f} {real[f]:.0f}% (alvo {alvo[i]}%, desvio {desvio[f]:+.0f})" for i, f in enumerate(FASES))
    extra = []
    datas_fundo = [r["_d"] for r in ult if r["fase"] == "fundo" and r["_d"]]
    if (not datas_fundo or (hoje - max(datas_fundo)).days > 7) and escolha != "fundo" and ultima != "fundo":
        extra.append("não há fundo nos últimos 7 dias: considera um (regra de bolso: pelo menos 1 por semana)")
    if seguidos_topo >= 3: extra.append("3 posts de topo seguidos: faltava confiança (meio)")
    if ultima == "fundo": extra.append("o último foi fundo: não repetir")
    return escolha, motivo + (". " + "; ".join(extra) if extra else "")


def serie_formato(ult, fase):
    series = [r.get("serie", "").strip() for r in ult if r["fase"] == fase and r.get("serie", "").strip()]
    todas = [r.get("serie", "").strip() for r in ult if r.get("serie", "").strip()]
    recentes = todas[-2:]
    serie = None
    if series:
        contagem = {s: series.count(s) for s in set(series)}
        livres = [s for s in contagem if not (len(recentes) == 2 and recentes[0] == recentes[1] == s)]
        serie = min(livres or contagem, key=lambda s: contagem[s])
    # formato: o de melhor mediana de retenção aos 3 s nesta fase, só com 3 ou mais posts com dados
    por = {}
    for r in ult:
        v = num(r.get("retencao_3s"))
        if r["fase"] == fase and v is not None and r.get("tipo", "").strip():
            por.setdefault(r["tipo"].strip(), []).append(v)
    ok = {t: statistics.median(v) for t, v in por.items() if len(v) >= 3}
    formato = max(ok, key=ok.get) if ok else None
    return serie, formato, ok


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raiz", default="."); p.add_argument("--seguidores", type=int); p.add_argument("--mix")
    p.add_argument("--janela", type=int, default=20); p.add_argument("--dias", type=int, default=90)
    p.add_argument("--json", action="store_true"); p.add_argument("--escrever", action="store_true", help="grava referencias/AAAA-MM-DD_auditoria.md")
    a = p.parse_args(); raiz = Path(a.raiz); hoje = dt.date.today()
    obj = objetivo(raiz); segs = seguidores(raiz, a.seguidores)
    alvo, origem = mix_alvo(raiz, obj, segs, a.mix)
    rows = historico(raiz); ult, n, cont, real, faltam = auditar(rows, a.janela, a.dias, hoje)
    fase, motivo = escolher(rows, ult, real, alvo, hoje)
    serie, formato, medianas = serie_formato(ult, fase)
    avisos = []
    if n < 12: avisos.append(f"só {n} post(s) na janela: abaixo de 12 a mistura é indicativa (confiança baixa), não decidas por ela sozinha")
    if n and any(v == n for v in faltam.values()): avisos.append("há métricas sem nenhum valor: escreve 'sem dados' no relatório, não estimes")
    if not rows: avisos.append("historico/posts.csv está vazio: pede ao criador os insights (CSV, capturas ou conector) e regista os últimos posts antes de planear")
    out = {"objetivo": obj, "seguidores": segs, "alvo": dict(zip(FASES, alvo)), "origem_do_alvo": origem, "posts_na_janela": n,
           "atual": {f: round(real[f]) for f in FASES}, "metricas_em_falta": faltam, "proxima_fase": fase, "motivo": motivo,
           "tipo_de_conteudo": TIPO_POR_FASE[fase], "serie_sugerida": serie, "formato": formato or FORMATO_PADRAO[fase],
           "formato_por_dados": bool(formato), "cta": CTA_FASE[fase], "avisos": avisos}
    if a.json: print(json.dumps(out, ensure_ascii=False, indent=1))
    else:
        print(f"objetivo: {obj} | seguidores: {segs if segs is not None else 'desconhecido'} | alvo {'/'.join(map(str, alvo))} ({origem})")
        print(f"auditoria: {n} post(s) na janela; mistura atual " + " / ".join(f"{f} {real[f]:.0f}%" for f in FASES))
        print(f"próxima fase: {fase}\ntipo de conteúdo: {TIPO_POR_FASE[fase]}")
        print(f"série: {serie or '(escolher entre as séries da estratégia; a menos usada)'}")
        print(f"formato: {out['formato']}{' (melhor retenção aos 3 s nos teus dados)' if formato else ' (por defeito, sem dados suficientes)'}")
        print(f"CTA: {CTA_FASE[fase]}\nmotivo: {motivo}")
        for av in avisos: print(f"AVISO: {av}")
    if a.escrever:
        d = raiz / "referencias"; d.mkdir(exist_ok=True)
        f = d / f"{hoje.isoformat()}_auditoria.md"
        f.write_text(f"# Auditoria do conteúdo publicado ({hoje.isoformat()})\n\n" +
                     f"Fonte: historico/posts.csv, {n} post(s) na janela. Métricas em falta (nº de posts sem valor): {json.dumps(faltam)}.\n\n" +
                     "| Fase | Atual | Alvo |\n| --- | --- | --- |\n" + "".join(f"| {x} | {real[x]:.0f}% | {alvo[i]}% |\n" for i, x in enumerate(FASES)) +
                     f"\nPróxima fase: **{fase}**. {motivo}\n" + "".join(f"\nAVISO: {av}\n" for av in avisos), encoding="utf-8")
        print(f"escrito: {f}")


if __name__ == "__main__":
    sys.exit(main())
