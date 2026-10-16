# Estágio 6: Intake dos vídeos gravados

1. Lista `gravados/` do vídeo. Para cada ficheiro, `ffprobe`: duração, resolução, fps, orientação, existência de áudio, loudness aproximado (`ffmpeg -af ebur128`).
2. Compara com a lista de cenas do `roteiro.md`: cenas em falta, takes demasiado curtos, orientação errada, áudio mudo ou com ruído, imagem escura (média de luminância baixa).
3. Se houver problemas graves, diz exatamente o que regravar e como (referência à cena e à regra do roteiro). Se só houver avisos, avança e regista-os.
4. Transcreve (Whisper, se instalado) para `work/transcricao.json` e confirma que o guião foi dito (diferenças relevantes).
5. Atualiza `meta.json` (estado: gravado). Nunca alteres nem apagues ficheiros em `gravados/`.
6. Se os ficheiros forem grandes, lembra que o GitHub exige Git LFS acima de 100 MB (ver README).
