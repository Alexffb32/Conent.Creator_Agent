#!/usr/bin/env python3
"""Regista feedback do criador e regenera estilo/estilo-criador.md.

Uso:
  registar-feedback.py --categoria edicao --regra "texto" --video slug [--tipo correcao|aprovacao|pedido] [--forte] [--raiz .]
  registar-feedback.py --regenerar [--raiz .]
"""
import argparse, csv, datetime, os, re, sys, unicodedata

CAMPOS = ["data", "video", "categoria", "tipo", "regra", "forte"]
CATEGORIAS = ["edicao", "legendas", "motion", "audio", "guiao", "voz", "roteiro", "estrategia", "publicacao"]
TIPOS = ["correcao", "aprovacao", "pedido"]
TITULOS = {"edicao": "Edição", "legendas": "Legendas", "motion": "Motion graphics", "audio": "Áudio",
           "guiao": "Guião", "voz": "Voz e tom", "roteiro": "Gravação", "estrategia": "Estratégia",
           "publicacao": "Publicação"}


def chave(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


def ler(caminho):
    if not os.path.exists(caminho):
        return []
    with open(caminho, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def estado(linhas):
    """Agrupa por regra. A forca conta VIDEOS distintos, nao linhas: dois pedidos sobre o mesmo
    video (ou varias versoes dele) continuam a ser uma so evidencia. Sem video, conta a data."""
    regras = {}
    for l in linhas:
        k = (l["categoria"], chave(l["regra"]))
        r = regras.setdefault(k, {"categoria": l["categoria"], "regra": l["regra"], "pedidos": 0,
                                  "aprovacoes": 0, "forte": False, "ultima": l["data"], "videos": [],
                                  "_ped": set(), "_apr": set()})
        evid = l["video"].strip() or l["data"]
        if l["tipo"] in ("correcao", "pedido"):
            r["_ped"].add(evid)
        elif l["tipo"] == "aprovacao":
            r["_apr"].add(evid)
        if l.get("forte") == "1":
            r["forte"] = True
        r["regra"] = l["regra"]
        r["ultima"] = max(r["ultima"], l["data"])
        if l["video"] and l["video"] not in r["videos"]:
            r["videos"].append(l["video"])
    for r in regras.values():
        r["pedidos"] = len(r["_ped"])
        r["aprovacoes"] = len(r["_apr"] - r["_ped"])  # aprovar o proprio video do pedido nao confirma
        if r["forte"]:
            r["nivel"] = "dura"
        elif r["pedidos"] >= 2 or (r["pedidos"] >= 1 and r["aprovacoes"] >= 2):
            r["nivel"] = "confirmada"
        else:
            r["nivel"] = "hipotese"  # um so video, ou so aprovacao sem pedido previo
    return regras


def parecidas(regras, categoria, texto, limiar=0.6):
    """Regras da mesma categoria com muitas palavras em comum (parafrases): nao somam forca sozinhas."""
    pa = set(chave(texto).split())
    out = []
    for (cat, k), r in regras.items():
        pb = set(k.split())
        if (cat == categoria and k != chave(texto) and pa and pb
                and (len(pa & pb) / len(pa | pb) >= limiar or len(pa & pb) / min(len(pa), len(pb)) >= 0.8)):
            out.append(r["regra"])
    return out


def escrever_perfil(raiz, linhas):
    regras = estado(linhas)
    ordem = {"dura": 0, "confirmada": 1, "hipotese": 2}
    out = ["# Estilo do criador", "",
           "Gerado por `scripts/registar-feedback.py` a partir de `estilo/feedback.csv`. Não editar à mão.",
           f"Atualizado: {datetime.date.today().isoformat()} · {len(linhas)} registos", ""]
    if not regras:
        out.append("(ainda sem regras)")
    for cat in CATEGORIAS:
        itens = sorted([r for r in regras.values() if r["categoria"] == cat],
                       key=lambda r: (ordem[r["nivel"]], r["regra"]))
        itens = [r for r in itens if r["pedidos"] > 0 or r["aprovacoes"] > 0]
        if not itens:
            continue
        out.append(f"## {TITULOS[cat]}")
        for r in itens:
            out.append(f"- [{r['nivel']}] {r['regra']} (vídeos com pedido {r['pedidos']}, com aprovação {r['aprovacoes']}, última {r['ultima']})")
        out.append("")
    os.makedirs(os.path.join(raiz, "estilo"), exist_ok=True)
    with open(os.path.join(raiz, "estilo", "estilo-criador.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out).rstrip() + "\n")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--raiz", default=".")
    p.add_argument("--categoria", choices=CATEGORIAS)
    p.add_argument("--regra")
    p.add_argument("--video", default="")
    p.add_argument("--tipo", choices=TIPOS, default="correcao")
    p.add_argument("--forte", action="store_true")
    p.add_argument("--regenerar", action="store_true")
    a = p.parse_args()
    caminho = os.path.join(a.raiz, "estilo", "feedback.csv")
    if not a.regenerar:
        if not (a.categoria and a.regra):
            sys.exit("Falta --categoria e --regra (ou usa --regenerar).")
        os.makedirs(os.path.dirname(caminho), exist_ok=True)
        novo = not os.path.exists(caminho)
        with open(caminho, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=CAMPOS)
            if novo:
                w.writeheader()
            w.writerow({"data": datetime.date.today().isoformat(), "video": a.video, "categoria": a.categoria,
                        "tipo": a.tipo, "regra": a.regra.strip(), "forte": "1" if a.forte else "0"})
    linhas = ler(caminho)
    escrever_perfil(a.raiz, linhas)
    regras = estado(linhas)
    if a.regra:
        r = regras[(a.categoria, chave(a.regra))]
        print(f"Regra '{r['regra']}': {r['nivel']} (vídeos com pedido {r['pedidos']}, com aprovação {r['aprovacoes']})")
        for outra in parecidas(regras, a.categoria, a.regra):
            print(f"AVISO: parecida com '{outra}'. Se for a mesma regra, usa o texto exato dela para somar força; "
                  "se mudou de ideias, pergunta ao criador qual vale.")
    print("Perfil atualizado em estilo/estilo-criador.md")


if __name__ == "__main__":
    main()
