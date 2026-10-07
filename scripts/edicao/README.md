# Pipeline de edição (short 9:16)

Scripts usados no estágio 7 (`stages/07-edit.md`). Só ferramentas livres: FFmpeg, faster-whisper, OpenCV, HyperFrames.
Pré-requisitos: `pip install faster-whisper "opencv-python-headless<5" --break-system-packages`, Node 22 e `npx hyperframes`.
Na nuvem do Claude Code, o HyperFrames usa o Chromium da máquina:
`export HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.

Ordem (a partir de uma pasta de trabalho com `gravados/original.*`):

1. `transcrever.py <video> transcricao.json large-v3`: tempos por palavra (o modelo vem do huggingface.co).
2. `ffmpeg -i <video> -ac 1 -ar 16000 voz16k.wav`, depois `cortes.py voz16k.wav '[[ini,fim]]' -40 > cortes.json`: silêncios acima de 0.25 s, mais cortes manuais.
3. `ffprobe ... frame=pts_time > frames_pts.txt`, depois `segmentos.py cortes.json frames_pts.txt segmentos.json`: segmentos alinhados ao fotograma.
4. `mapear.py segmentos.json transcricao.json frases_cortadas.json cortes.json`: palavras na linha temporal cortada.
5. `rostos.py <video> cortes.json rostos.json`: posição da cara por segmento (para o enquadramento).
6. `base.py <video> segmentos.json frames_pts.txt base.mp4`: vídeo cortado, com cor, aumentado.
7. `compor.py <work> config.json`: gera `hf/index.html` (zooms, legendas, cartões, CTA, frame final).
8. `npx hyperframes render hf -o render_video.mp4 --crf 18`.
9. `voz.py`, `musica_sfx.py`, `loudnorm2.py` e a mistura com `sidechaincompress` (ver o plano do vídeo).
10. Junta vídeo e áudio com grão leve e vinheta: `ffmpeg -i render.mp4 -i mix.wav -vf "noise=alls=3:allf=t,vignette=angle=PI/7" -c:v libx264 -crf 19 -c:a aac -b:a 192k`.

Estilo de legendas (estilo Iman): Montserrat em minúsculas, light para bold à medida que fala, sem sobreposições (ver `compor.py`).

`logo_borda.py` faz o logo transparente com borda branca a partir de um PNG com fundo branco.
O `config.json` de trabalho fica em `videos/<tipo>/<pasta>/edicao/` (com cortes, segmentos e rostos). Cada versão entregue vai para `editado/vN/` com o vídeo, a preview, o PNG estático, `qa.jpg` e uma cópia do `config.json` usado.
