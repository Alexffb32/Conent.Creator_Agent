#!/usr/bin/env python3
"""Diz se um vídeo está pronto: lê checklist-pre-producao.md ou checklist-pos-producao.md da pasta do vídeo.
Uso: python3 checklist.py <pasta_do_video> [--fase pre|pos] [--json]
Itens `- [ ] texto (auto: nome)` consideram-se feitos se a verificação `nome` passou no `vN/qa.json` da versão mais recente.
Sai com 1 se faltar algum item. Nada é marcado por magia: o que é "à mão" só passa quando alguém o marcar [x]."""
import argparse, json, re, sys
from pathlib import Path

ap = argparse.ArgumentParser(); ap.add_argument("pasta"); ap.add_argument("--fase", choices=["pre", "pos"], default="pos"); ap.add_argument("--json", action="store_true")
a = ap.parse_args()
d = Path(a.pasta)
f = d / {"pre": "checklist-pre-producao.md", "pos": "checklist-pos-producao.md"}[a.fase]
if not f.exists():
    sys.exit(f"Falta {f}. Copia-a de templates/ (o novo-video.sh já o faz nos vídeos novos).")
auto = {}
vs = sorted([p for p in d.glob("v[0-9]*") if p.is_dir()], key=lambda p: int(p.name[1:]))
qa = vs[-1] / "qa.json" if vs else None
if a.fase == "pos" and qa and qa.exists():
    auto = {x["id"]: x["ok"] for x in json.load(open(qa, encoding="utf-8"))["verificacoes"]}
itens, abertos = [], []
for linha in f.read_text(encoding="utf-8").splitlines():
    m = re.match(r"\s*- \[( |x|X)\] (.+)", linha)
    if not m: continue
    feito, texto = m.group(1).lower() == "x", m.group(2)
    am = re.search(r"\(auto: (\w+)\)", texto)
    origem = "mão"
    if am:
        origem = "auto"
        if am.group(1) in auto: feito = auto[am.group(1)]
        elif not feito: origem = "auto, sem qa.json: corre o exportar"
    itens.append({"item": texto, "feito": feito, "origem": origem})
    if not feito: abertos.append(texto)
if a.json: print(json.dumps({"pronto": not abertos, "abertos": abertos, "versao": vs[-1].name if vs else None, "itens": itens}, ensure_ascii=False, indent=1))
else:
    print(f"{f.name}: {len(itens) - len(abertos)}/{len(itens)} feitos" + (f" (versão {vs[-1].name})" if vs and a.fase == 'pos' else ""))
    for x in itens:
        print(f"  [{'x' if x['feito'] else ' '}] {x['item']}" + ("" if x["feito"] else f"   <- falta ({x['origem']})"))
    print("PRONTO" if not abertos else f"NÃO ESTÁ PRONTO: {len(abertos)} por fazer")
sys.exit(0 if not abertos else 1)
