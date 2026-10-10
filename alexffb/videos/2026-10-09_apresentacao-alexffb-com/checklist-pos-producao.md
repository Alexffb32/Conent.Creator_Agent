# Lista de pós-produção: Apresentação alexffb.com

Os pontos com `(auto: nome)` são verificados pelo `pipeline.py exportar` (ficheiro `vN/qa.json`). Os restantes marcam-se à mão. `python3 scripts/checklist.py <pasta do vídeo> --fase pos` diz se o vídeo está pronto a publicar.

## Técnico
- [ ] 1080x1920 (auto: formato)
- [ ] 30 fps constantes (auto: fps_constante)
- [ ] Com áudio (auto: audio)
- [ ] Loudness perto de -14 LUFS (auto: loudness)
- [ ] Pico abaixo de -1 dBFS (auto: pico)
- [ ] Até 90 s para o Instagram recomendar a quem não segue (auto: duracao_reels)
- [ ] Cópia para o chat com menos de 30 MB (auto: copia_chat)

## Texto
- [ ] Sem travessões no ecrã (auto: sem_travessoes)
- [ ] Português europeu (auto: portugues_europeu)
- [ ] Legendas conferidas contra o que é dito, sem erros de nomes ou termos
- [ ] Nenhum texto nos 12 % de cima nem nos 20 % de baixo, nem encostado à direita

## Imagem e som (ver o `qa.jpg` e ouvir)
- [ ] Gancho legível no primeiro fotograma e na capa
- [ ] Nenhum cartão tapa a cara
- [ ] Nada a piscar nem legendas sobrepostas
- [ ] SFX leves e sincronizados com a animação (confirmado pelo criador)
- [ ] Voz sem eco e música baixa (confirmado pelo criador)

## Publicação
- [ ] Legenda, hashtags e primeiro comentário em `adaptacoes/<plataforma>.md`
- [ ] CTA único, o mesmo que o vídeo diz
- [ ] Criador aprovou esta versão no chat
- [ ] Agendado na hora fixa em `calendario/agenda.csv`
- [ ] Lembrete para registar as métricas ao fim de 24 h e de 7 dias em `historico/posts.csv`
