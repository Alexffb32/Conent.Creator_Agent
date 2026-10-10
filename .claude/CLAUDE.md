# Repositório

Tem duas partes:
- O agente (plugin `creator-agent`): `skills/creator-agent/` (SKILL.md, estágios, biblioteca, referências, templates, scripts) e `.claude-plugin/`.
- O estúdio do criador Alex (alexffb): `alexffb/`.

Ao usar o agente neste repositório, a pasta do criador é `alexffb/`. Os caminhos do `SKILL.md` (`creator.md`, `videos/`, `estrategia/`, `assets/`…) ficam dentro dela.
Antes de editar um vídeo do Alex, lê `alexffb/estilo/estilo-criador.md` (as regras dele) e `alexffb/estilo/estilo-edicao.md` (os valores da edição). O feedback dele regista-se com `python3 skills/creator-agent/scripts/registar-feedback.py --raiz alexffb ...` (estágio 10).
Cada versão de um vídeo entra num commit só seu, com o título `vN - o que mudou` (é o que o GitHub mostra ao lado da pasta da versão). Depois disso, não voltes a mexer nessa pasta.
Depois de mexer no agente, corre `claude plugin validate .`.
