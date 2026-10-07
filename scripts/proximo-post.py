#!/usr/bin/env python3
"""Sugere a fase do funil e o tipo do proximo post, a partir de historico/posts.csv e creator.md.
Uso: python3 proximo-post.py [--raiz .]   (le creator.md, historico/posts.csv)"""
import argparse, csv, re, sys
from pathlib import Path

MIX = {  # topo, meio, fundo (%), ver references/funnel.md
    "crescer": (60, 30, 10), "marca": (50, 35, 15),
    "vender": (40, 30, 30), "parcerias": (40, 35, 25),
}
FASES = ["topo", "meio", "fundo"]
TIPO_POR_FASE = {
    "topo": "educativo curto, opiniao ou entretenimento",
    "meio": "tutorial mais fundo, bastidores, caso real ou longform",
    "fundo": "prova social, demonstracao da oferta ou convite claro (lista de espera, compra, chamada)",
}


def objetivo(raiz: Path) -> str:
    f = raiz / "creator.md"
    if f.exists():
        m = re.search(r"^objetivo:\s*(\w+)", f.read_text(encoding="utf-8"), re.M | re.I)
        if m and m.group(1).lower() in MIX:
            return m.group(1).lower()
    return "crescer"


def historico(raiz: Path):
    f = raiz / "historico" / "posts.csv"
    if not f.exists():
        return []
    with f.open(encoding="utf-8", newline="") as fh:
        return [r for r in csv.DictReader(fh) if r.get("fase", "").strip()]


def sugerir(rows, mix):
    ultimas = [r["fase"].strip().lower() for r in rows][-10:]
    if not ultimas:
        return "topo", "Sem historico: comecar por alcance (topo)."
    ultima = ultimas[-1]
    seguidos_topo = 0
    for f in reversed(ultimas):
        if f == "topo":
            seguidos_topo += 1
        else:
            break
    if ultima == "fundo":
        # nunca dois fundos seguidos: voltar ao mais abaixo do alvo entre topo e meio
        candidatos = ["topo", "meio"]
    elif seguidos_topo >= 3:
        return "meio", "Ja houve 3 posts de topo seguidos: precisa de confianca (meio)."
    else:
        candidatos = FASES
    total = max(len(ultimas), 1)
    real = {f: 100 * ultimas.count(f) / total for f in FASES}
    alvo = dict(zip(FASES, mix))
    falta = {f: alvo[f] - real[f] for f in candidatos}
    escolha = max(candidatos, key=lambda f: falta[f])
    motivo = (f"Ultimo post: {ultima}. Nos ultimos {len(ultimas)}: "
              + ", ".join(f"{f} {real[f]:.0f}% (alvo {alvo[f]}%)" for f in FASES)
              + f". A fase mais abaixo do alvo entre as permitidas e {escolha}.")
    return escolha, motivo


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raiz", default=".")
    a = p.parse_args()
    raiz = Path(a.raiz)
    obj = objetivo(raiz)
    fase, motivo = sugerir(historico(raiz), MIX[obj])
    print(f"objetivo: {obj}")
    print(f"proxima fase: {fase}")
    print(f"tipo de conteudo: {TIPO_POR_FASE[fase]}")
    print(f"motivo: {motivo}")


if __name__ == "__main__":
    sys.exit(main())
