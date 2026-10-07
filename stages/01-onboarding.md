# Estágio 1: Onboarding

Objetivo: criar `creator.md` com tudo o que é preciso para trabalhar sozinho. Usa AskUserQuestion com as rondas de `references/question-bank.md`.

1. Antes de perguntar, recolhe o que já sabes: README, `creator.md` (se existir), ficheiros em `assets/`, ligações disponíveis (`claude mcp list`), nomes de perfis que o utilizador tenha dado.
2. Se houver Instagram ou YouTube ligados, lê o perfil e as métricas gerais e pré-preenche as respostas (diz ao criador o que assumiste).
3. Faz as rondas 1 a 4 do banco de perguntas, saltando o que já sabes. Máximo de 4 rondas.
4. Escreve `creator.md` a partir de `templates/creator.md`. Mostra um resumo de 8 linhas e pergunta uma única vez se está certo (AskUserQuestion: Está certo / Quero corrigir).
5. Corre `scripts/init-creator-repo.sh` se a estrutura ainda não existir.
6. Segue para `stages/02-research.md`.

Regras: perguntas curtas, sem jargão. Se o criador responder "não sei", escolhe a opção recomendada, regista como "assumido" em `creator.md` e segue.
