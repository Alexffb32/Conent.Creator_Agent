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

## 3b. Próximo post (sempre antes de um vídeo novo, e no fim de cada publicação)

0. **Ler o que já existe (auditoria).** Antes de sugerir nada, vê o que o criador já publicou:
   - Com ligação (Instagram, YouTube, vidIQ, Metricool ou Supermetrics, ver `references/connectors.md`), lê os últimos posts e métricas. Sem ligação, pede um CSV ou capturas dos Insights dos últimos 20 posts (ou 90 dias). O agente não consegue abrir o Instagram do criador sozinho.
   - Regista cada post em `historico/posts.csv` (data, plataforma, tipo, fase, série, tema, link, alcance, retenção aos 3 s, partilhas, guardados, conversões). A fase de cada post classifica-se assim: tem CTA de contacto ou mostra resultado de cliente = fundo; ensina como ou porquê sem pedir contacto = meio; fala de um problema ou opinião para qualquer pessoa = topo; na dúvida, topo. Campos que não existem ficam vazios: nunca estimes uma métrica, escreve "sem dados".
   - Corre `python3 scripts/proximo-post.py --raiz <pasta do criador> --escrever`. Mostra ao criador a mistura atual contra o alvo, o desvio e o que o histórico diz da audiência (quem é o alvo, quem já lá está). Com menos de 12 posts, diz que a mistura é indicativa.
1. O resultado da auditoria dá a fase, a série e o formato do próximo post, e o motivo. O alvo é uma hipótese (`references/funnel.md` e `biblioteca/pesquisa/funil-estrategia.md`): corrige-o com os dados do criador, no `estrategia/estrategia.md` (linha `mix: 60/25/15`).
2. Lê `estilo/estilo-criador.md`, `estrategia/aprendizagens.md` e os últimos 5 posts para não repetir ângulo, gancho nem CTA.
3. Faz pesquisa dirigida ao tema (ver playbook, modo rápido) e, se o criador segue um estilo de referência, a ficha de estilo (estágio 2).
4. Propõe 3 ideias para essa fase e série, cada uma com gancho (fórmulas em `biblioteca/pesquisa/hooks-ctas-copy.md`), ângulo, formato, CTA ligado ao valor entregue e esforço de gravação. O criador escolhe com AskUserQuestion. Acompanha sempre com a pergunta "isto aproxima-te da audiência que queres?".
5. Cria a pasta com `scripts/novo-video.sh`, escreve `brief.md` e `meta.json`, e segue para o guião.

Cada vídeo publicado entra no `posts.csv` e a auditoria seguinte já o conta. O criador é orientado por este ciclo: auditar, sugerir, produzir, medir, ajustar o alvo.

## 3c. Calendário

Mantém `calendario/agenda.csv` (data, plataforma, tipo, fase, série, tema, estado). Planeia 2 semanas à frente, nunca mais do que o criador consegue gravar.
