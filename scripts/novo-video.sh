#!/usr/bin/env bash
# Uso (na raiz do repositório do criador): bash novo-video.sh short|long|podcast "tema" [AAAA-MM-DD] [topo|meio|fundo]
set -euo pipefail
tipo="${1:?uso: novo-video.sh short|long|podcast \"tema\" [data] [fase]}"
tema="${2:?falta o tema}"
data="${3:-$(date +%F)}"
fase="${4:-}"
case "$tipo" in short|long|podcast) ;; *) echo "tipo invalido"; exit 1;; esac
slug=$(python3 -c 'import sys,re,unicodedata;t=unicodedata.normalize("NFKD",sys.argv[1]).encode("ascii","ignore").decode().lower();print(re.sub(r"[^a-z0-9]+","-",t).strip("-")[:40])' "$tema")
dir="videos/$tipo/${data}_${slug}"
mkdir -p "$dir/gravados" "$dir/editado" "$dir/adaptacoes"
touch "$dir/gravados/.gitkeep" "$dir/editado/.gitkeep" "$dir/adaptacoes/.gitkeep"
printf '# Brief: %s\n\nTipo: %s | Data: %s | Fase: %s\n\n(objetivo, público, ângulo, referências)\n' "$tema" "$tipo" "$data" "$fase" > "$dir/brief.md"
printf '{ "tema": "%s", "tipo": "%s", "data": "%s", "estado": "ideia", "fase": "%s", "serie": "", "plataformas": [] }\n' "$tema" "$tipo" "$data" "$fase" > "$dir/meta.json"
echo "$dir"
