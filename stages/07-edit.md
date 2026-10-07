# Estágio 7: Edição com motion graphics

Pré-requisitos: intake feito. Ferramentas: FFmpeg, Whisper e HyperFrames (ver `INSTALL.md`). Sem HyperFrames, usa FFmpeg e legendas ASS e diz ao criador o que ficou mais simples.

1. **Estilo.** Lê o estilo escolhido em `creator.md` e `references/editing-styles.md`. Se a última pesquisa de edição tiver mais de 30 dias ou se o estilo for novo, faz pesquisa rápida de exemplos recentes do nicho (playbook) e ajusta.
2. **Plano.** Escreve `plano-edicao.md` (template): cortes por tempo, zooms, B-roll, SFX, legendas, motion graphics com tempo, tipo, texto, cor, posição e animação, cor e áudio. Mostra um resumo e pede aprovação com AskUserQuestion. Sem aprovação, não renderizes.
3. **Execução.** Mezanino leve para trabalhar (1440x2560 ou 1080p), cortes de pausas acima de 0,3 s, legendas palavra a palavra, zoom suave, motion graphics com HyperFrames (`npx hyperframes preview`, depois `render`), música baixa por baixo da voz, SFX discretos, loudness -14 LUFS, zona segura (nada nos 20% de baixo nem encostado à direita). Renderiza em partes se a memória for pouca.
4. **QA.** Vê frames de início, meio e fim (`ffmpeg` snapshots), confirma duração, loudness, legendas sem erros e dentro da zona segura. Corrige antes de entregar.
5. **Entrega.** Exporta para `editado/v1/` (uma pasta por versão) com `slug_v1.mp4`, `slug_v1_preview.mp4` (540x960), `slug_v1_static.png`, `qa.jpg` e o `config.json` usado. A transcrição fica em `editado/transcricao.json`. Diz o que fizeste em 3 linhas e pede feedback (AskUserQuestion: Aprovar / Ajustar ritmo / Ajustar legendas / Ajustar gráficos). Cada iteração vai para uma pasta nova (`editado/v2/`, `editado/v3/`); as anteriores ficam intactas.
6. Atualiza `meta.json` (estado: editado).
