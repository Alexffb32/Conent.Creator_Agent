# Fichas de estilo de edição

Uma ficha por estilo de referência (normalmente um criador). Serve para planear a edição com dados e traduzir o estilo em componentes e parâmetros.
As fichas do agente (`biblioteca/estilos/`) só têm padrões gerais e fontes públicas; as de cada criador ficam em `referencias/estilos/` do repositório dele.

## Como fazer uma ficha
1. 3 a 5 vídeos recentes do estilo. Com o ficheiro: `python3 scripts/analisar_referencia.py <video> <pasta>` e olhar para `planos.jpg` e `gancho.jpg`.
2. Fontes abertas (páginas, guias, entrevistas), com data. Resultados de pesquisa que não abriste não contam como fonte; se uma página estiver bloqueada, diz isso e baixa a confiança.
3. Preenche o modelo abaixo. Separa o que mediste ("observado em N vídeos") do que leste ("segundo a fonte X") e do que deduziste ("hipótese").

## Modelo
```
# Estilo: <nome>
Última verificação: AAAA-MM-DD | Confiança: alta, média ou baixa | Vídeos analisados: N

## Ritmo
cortes por minuto, plano médio, pausas, duração típica
## Gancho (0 a 3 s)
## Legendas
fonte, caixa, cor, animação, posição, palavras por linha
## Motion
componentes, frequência, transições, cenas de ecrã inteiro
## Câmara
zooms, enquadramento, B-roll
## Cor e look
paleta, contraste, grão, vinheta
## Som
música (estilo, nível), SFX (quais, quando)
## CTA e fim
## Tradução para o compor.py
legendas.estilo, componentes, zoom_chave, tokens, sfx
## Fontes
```

## Fichas
- [Iman Gadzhi](iman-gadzhi.md): premium e calmo, legendas minúsculas brancas, UI em vidro, poucas cenas fortes.
