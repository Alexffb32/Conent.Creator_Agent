# Instalação

## Requisitos
- Conta Claude e Claude Code (terminal, app desktop ou web com GitHub).
- Conta GitHub e `git`. Para vídeos grandes: `git-lfs`.
- Para edição: Node 22 ou superior, Python 3.11 ou superior, FFmpeg, Whisper (`faster-whisper` em Windows e Linux, `whisper-cpp` em Mac) e HyperFrames (`claude plugin marketplace add heygen-com/hyperframes` e `claude plugin install hyperframes@hyperframes`, depois `npx hyperframes doctor`). Sem isto o agente planeia e escreve, mas a edição fica limitada.

## Passo a passo

1. **Cria o teu repositório privado** no GitHub (por exemplo `o-meu-estudio`) e clona-o.
2. **Instala a skill** dentro dele:
   `git submodule add https://github.com/<utilizador>/creator-agent .claude/skills/creator-agent`
3. **Cria a estrutura**: `bash .claude/skills/creator-agent/scripts/init-creator-repo.sh .`
4. **Git LFS** (se vais pôr vídeos): `git lfs install` (o `.gitattributes` já vem configurado).
5. **Faz commit e push** da estrutura.
6. **Abre o Claude Code** nesse repositório (local, ou na nuvem a escolher o repositório) e escreve `/creator-agent`. Responde às perguntas.
7. **Ligações (opcional)**: liga Instagram e YouTube nas definições de conectores do Claude para o agente ler a tua audiência. Sem isso, dá-lhe capturas ou exportações dos insights.

## Como carregar os vídeos
Depois de o agente te dar o roteiro: no GitHub abre a pasta `videos/<data_slug>/gravados/`, carrega os ficheiros (Add file, Upload files) ou faz `git add` e `git push`. Acima de 100 MB por ficheiro, usa Git LFS. Depois diz ao agente "gravei".

## Atualizar a skill
`git submodule update --remote .claude/skills/creator-agent` e commit.

## Permissões sugeridas (`.claude/settings.json` do teu repositório)
Permitir `ffmpeg`, `ffprobe`, `npx hyperframes` e `git add/commit`; pedir confirmação para `git push` e para qualquer publicação ou envio; negar leitura de `.env`.

## Problemas comuns
- O agente diz que não consegue ler o Instagram: normal, usa capturas ou exportações.
- Falta de memória ao renderizar: pede ao agente para renderizar por partes, a 1080p.
- HyperFrames não instala: corre `npx hyperframes doctor` e segue as indicações.
