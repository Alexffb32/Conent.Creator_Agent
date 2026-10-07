# Estágio 7: Edição com motion graphics

Pré-requisitos: intake feito. Ferramentas: FFmpeg, Whisper e HyperFrames (ver `INSTALL.md`). Sem HyperFrames, usa FFmpeg e legendas ASS e diz ao criador o que ficou mais simples.

1. **Estilo.** Lê o estilo escolhido em `creator.md` e `references/editing-styles.md`. Se a última pesquisa de edição tiver mais de 30 dias ou se o estilo for novo, faz pesquisa rápida de exemplos recentes do nicho (playbook) e ajusta.
2. **Plano.** Escreve `plano-edicao.md` (template): cortes por tempo, zooms, B-roll, SFX, legendas, motion graphics com tempo, tipo, texto, cor, posição e animação, cor e áudio. Mostra um resumo e pede aprovação com AskUserQuestion. Sem aprovação, não renderizes.
3. **Execução.** Mezanino leve para trabalhar (1440x2560 ou 1080p), cortes de pausas acima de 0,3 s, legendas palavra a palavra, zoom suave, motion graphics com HyperFrames (`npx hyperframes preview`, depois `render`), música baixa por baixo da voz, SFX discretos, loudness -14 LUFS, zona segura (nada nos 20% de baixo nem encostado à direita). Renderiza em partes se a memória for pouca.
4. **QA.** Vê frames de início, meio e fim (`ffmpeg` snapshots), confirma duração, loudness, legendas sem erros e dentro da zona segura. Corrige antes de entregar.
5. **Entrega.** Exporta para `editado/` com nome `slug_v1.mp4`. Diz o que fizeste em 3 linhas e pede feedback (AskUserQuestion: Aprovar / Ajustar ritmo / Ajustar legendas / Ajustar gráficos). Itera em `v2`, `v3`.
6. Atualiza `meta.json` (estado: editado).
