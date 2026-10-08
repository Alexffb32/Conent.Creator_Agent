# Estágio 3: Estratégia, funil e próximo post

## 3a. Estratégia (uma vez, revista de 4 em 4 semanas)

Cria `estrategia/estrategia.md` a partir do objetivo e do que vende o criador (ver `references/funnel.md`):
- **Funil**: o que é topo (alcance), meio (confiança) e fundo (conversão) para ESTE criador, com formatos concretos e uma oferta ou ação para cada fase.
- **Mix alvo** por objetivo (tabela em `references/funnel.md`), ajustado ao estágio do criador.
- **Séries** (3 a 5): temas repetíveis que reduzem a pressão de ter ideias.
- **Cadência** realista para o tempo semanal que o criador disse ter.
- **Tipos de conteúdo**: educativo, lifestyle e bastidores, venda, prova social, entretenimento. Cada série mapeia para uma fase do funil.
- **Métricas** que importam por fase.
Mostra um resumo e pede aprovação com AskUserQuestion.

## 3b. Próximo post (sempre que for pedido ou no fim de uma publicação)

1. Corre `python3 scripts/proximo-post.py` (lê `historico/posts.csv` e `estrategia/estrategia.md`). Devolve a fase do funil e o tipo recomendados, com o motivo.
2. Lê `estrategia/aprendizagens.md` e os últimos 5 posts para não repetir ângulo.
3. Faz pesquisa dirigida ao tema (ver playbook, modo rápido).
4. Propõe 3 ideias para essa fase e série, cada uma com gancho, ângulo, formato (short, long, podcast) e esforço de gravação. O criador escolhe com AskUserQuestion.
5. Cria a pasta com `scripts/novo-video.sh`, escreve `brief.md` e `meta.json`, e segue para o guião.

## 3c. Calendário

Mantém `calendario/agenda.csv` (data, plataforma, tipo, fase, série, tema, estado). Planeia 2 semanas à frente, nunca mais do que o criador consegue gravar.
