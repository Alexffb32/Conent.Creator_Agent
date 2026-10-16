# Instalação

## Requisitos
- Claude Code (terminal, app desktop ou web) e uma conta GitHub com `git`.
- Para editar: Python 3.10 ou superior, FFmpeg completo, Node 20 ou superior, FluidSynth com o soundfont FluidR3_GM, e os pacotes Python
  `faster-whisper "opencv-python-headless<5" nara_wpe noisereduce soundfile scipy mido pillow`. O HyperFrames (motion graphics) corre com `npx`, sem instalar.
  O agente corre `scripts/verificar.py` e diz exatamente o que falta e o comando para o teu sistema. Sem isto, o agente planeia e escreve, mas não edita.

## Passo a passo

1. **Instala o plugin** (uma vez, fica disponível em todos os projetos):
   ~~~
   /plugin marketplace add Alexffb32/Conent.Creator_Agent
   /plugin install creator-agent@alexffb
   ~~~
   Alternativa sem plugin: copia a pasta `skills/creator-agent` para `~/.claude/skills/creator-agent` (e invoca com `/creator-agent`).
2. **Cria o teu estúdio**: um repositório no GitHub (privado, por exemplo `o-meu-estudio`), clonado no teu computador.
3. **Abre o Claude Code nesse repositório** e escreve `/creator-agent:creator-agent`. O agente cria a estrutura (`creator.md`, `estrategia/`, `videos/`…), verifica as dependências e faz as perguntas do onboarding.
4. **Marca e sons (opcional)**: dá-lhe o logo, as cores e os teus sons (pasta ou zip). Ele cataloga os sons e propõe que som entra em cada animação; sem sons, gera um kit.
5. **Ligações (opcional)**: liga Instagram e YouTube nas definições de conectores do Claude para o agente ler a tua audiência. Sem isso, dá-lhe capturas ou exportações.

## Como carregar os vídeos
Depois do roteiro: no GitHub abre `videos/<data_slug>/gravados/` e carrega os ficheiros (Add file, Upload files), ou `git add` e `git push`.
Envia o original da câmara (não a versão comprimida do chat). Acima de 100 MB por ficheiro, usa Git LFS. Depois diz ao agente "gravei".

## Atualizar
`/plugin marketplace update alexffb` e reinicia a sessão (ou `/reload-plugins`).

## Permissões sugeridas (`.claude/settings.json` do teu estúdio)
Permitir `ffmpeg`, `ffprobe`, `python3`, `npx hyperframes` e `git add/commit`; pedir confirmação para `git push` e para qualquer publicação ou envio; negar leitura de `.env`.

## Problemas comuns
- **Falta alguma coisa para editar:** corre `python3 <pasta da skill>/scripts/verificar.py` e segue os comandos que ele mostra.
- **O agente não consegue ler o Instagram:** normal; usa capturas, ficheiros ou links.
- **O render demora:** 5 a 7 minutos para 50 s sem GPU é normal. Com pouca memória, fecha outras apps.
- **HyperFrames falha:** `npx --yes hyperframes@0.8.140 doctor` diz o que falta (normalmente o Chromium).
- **Vídeo de iPhone em câmara lenta:** já não acontece; o pipeline converte para 30 fps antes de cortar.
