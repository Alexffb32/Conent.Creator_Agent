# Estágio 1: Onboarding

Objetivo: criar `creator.md` com tudo o que é preciso para trabalhar sozinho. Usa AskUserQuestion com as rondas de `references/question-bank.md`.

0. Corre `python3 scripts/verificar.py` e diz ao criador o que falta instalar para editar (o resto do onboarding não depende disso).
1. Antes de perguntar, recolhe o que já sabes: README, `creator.md` (se existir), ficheiros em `assets/`, ligações disponíveis (`claude mcp list`), nomes de perfis que o utilizador tenha dado.
2. Se houver Instagram ou YouTube ligados, lê o perfil e as métricas gerais e pré-preenche as respostas (diz ao criador o que assumiste).
3. Faz as rondas 1 a 5 do banco de perguntas, saltando o que já sabes. Máximo de 5 rondas.
4. Escreve `creator.md` a partir de `templates/creator.md`. Mostra um resumo de 8 linhas e pergunta uma única vez se está certo (AskUserQuestion: Está certo / Quero corrigir).
5. Corre `scripts/init-creator-repo.sh` se a estrutura ainda não existir.
6. **Marca:** escreve `estrategia/sistema-design.md` (template) com as cores e fontes do criador; se houver logo, guarda-o em `assets/logo/` e faz a versão com borda para usar sobre vídeo (`scripts/edicao/logo_borda.py`).
7. **Sons:** se o criador tiver sons (pasta, zip ou Drive), guarda-os em `assets/sons/` e corre `scripts/edicao/catalogar_sons.py assets/sons` (mostra o mapa proposto e o que ficou excluído); se não tiver, `scripts/edicao/gerar_sons.py assets/sons`.
8. **Estilo de edição:** cria `estrategia/estilo-edicao.md` (template) com o que o criador escolheu (as respostas entram como regras confirmadas) e o estilo de referência. Se o criador nomear criadores cujo estilo quer seguir, faz a ficha de estilo (estágio 2) antes do primeiro vídeo.
9. Segue para `stages/02-research.md`.

Regras: perguntas curtas, sem jargão. Se o criador responder "não sei", escolhe a opção recomendada, regista como "assumido" em `creator.md` e segue.
