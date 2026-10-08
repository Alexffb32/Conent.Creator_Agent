#!/usr/bin/env bash
# Cria a estrutura do repositório de um criador. Uso: bash init-creator-repo.sh [pasta]
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
dest="${1:-.}"
mkdir -p "$dest"/{estrategia,referencias,calendario,historico,assets/{fonts,music,lut,broll,logo,sons},videos}
touch "$dest/videos/.gitkeep"
[ -f "$dest/estrategia/aprendizagens.md" ] || printf '# Aprendizagens\n\n(data, conclusão, confiança)\n' > "$dest/estrategia/aprendizagens.md"
[ -f "$dest/calendario/agenda.csv" ] || echo "data,plataforma,tipo,fase,serie,tema,estado" > "$dest/calendario/agenda.csv"
[ -f "$dest/historico/posts.csv" ] || echo "data,plataforma,tipo,fase,serie,tema,link,alcance,retencao_3s,partilhas,guardados,conversoes" > "$dest/historico/posts.csv"
if [ ! -f "$dest/.gitattributes" ]; then
cat > "$dest/.gitattributes" <<'A'
*.mp4 filter=lfs diff=lfs merge=lfs -text
*.mov filter=lfs diff=lfs merge=lfs -text
*.m4v filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
A
fi
[ -f "$dest/.gitignore" ] || printf '.env\n*.key\nnode_modules/\n.DS_Store\n**/work/\n' > "$dest/.gitignore"
echo "Estrutura criada em $dest"
