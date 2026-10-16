# Contribuir

- Abre uma issue com o problema, o nicho e a plataforma.
- Pull requests bem-vindos, sobretudo:
  - **Lições técnicas** (`skills/creator-agent/references/licoes-tecnicas.md`): um erro que aconteceu numa edição real, com sintoma, causa e regra.
  - **Fichas de estilo** (`biblioteca/estilos/`): com vídeos analisados (`scripts/analisar_referencia.py`), fontes abertas e datas, separando o medido do lido e do deduzido.
  - **Componentes de motion** (`scripts/edicao/compor.py` e `biblioteca/componentes.md`): dentro dos tokens e das seis decisões do sistema de design, com um exemplo de config e um render de teste.
  - **Música** (novos estilos em `musica_midi.py`), formatos de vídeo (`biblioteca/ideias.md`), traduções do banco de perguntas e dos estágios.
- Regras: nenhum dado pessoal de criadores; fontes e datas em tudo o que seja "o que funciona"; sem texto, imagens, música ou sons protegidos; ficheiros em UTF-8; linguagem clara.
- Antes de abrir o PR: `claude plugin validate .`, `python3 skills/creator-agent/scripts/verificar.py` e, se mexeste no pipeline, uma edição de teste de ponta a ponta (`pipeline.py preparar`, `render`, `audio`, `exportar`).
