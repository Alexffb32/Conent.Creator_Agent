# Estilo de edição: Alex (alexffb)

Os valores atuais da edição do Alex, afinados da v1 à v5 do short "presença digital". O agente usa-os no `config.json` de cada vídeo.
As regras (o que o Alex pediu, corrigiu ou aprovou) estão no diário `feedback.csv` e no perfil gerado `estilo-criador.md`, nesta pasta.

## Parâmetros atuais
| Parâmetro | Valor | Origem |
| --- | --- | --- |
| Estilo de referência | Iman Gadzhi no acabamento (ficha `biblioteca/estilos/iman-gadzhi.md`) e Nik Setting na estrutura e no conteúdo: mistura em `biblioteca/estilos/iman-x-nik.md` (hipótese a testar em 3 a 5 vídeos) | onboarding e v3; pedido de 2026-10-09 |
| Legendas | `iman`, 60 px, topo a 1180 px, até 4 palavras e 22 caracteres por linha | v3 a v5 |
| Movimento | leve: zoom de entrada no gancho e 3 a 4 pushes lentos por vídeo | v2 a v5 |
| Componentes preferidos | gancho em painel de vidro, cenas de ecrã inteiro com grelha e brilho vermelho, notificações, browser, mosaicos, remate com Instrument Serif, CTA em notificação, frame final com logo | v4 |
| Cenas de ecrã inteiro | poucas (2 por vídeo de 50 s) | v4 |
| Música | piano e cordas, 80 BPM, -23 LUFS, ducking ao falar | v4 |
| SFX | Pop, Swish Whoosh, Bell Ding, Keyboard Typing, Click, Metallic Riser, Bass Impact (muito baixo); 15 a 27 dB abaixo da voz | v5 |
| Voz | WPE, reverberação tardia, EQ (-2,5 dB a 300 Hz, +2 dB a 3,5 kHz), de-esser, compressor 3:1, -14 LUFS | v4 |
| Look | contraste +8 %, saturação +5 %, grão leve, vinheta suave | v3 |
| Frame final | logo com borda branca, botão "Manda-me mensagem", @alexffb_, 2 s | v4 |
| Acento | #FF2E00 (o asterisco do logo) | `sistema-design.md` |

## Entrega
| Preferência | Valor |
| --- | --- |
| Onde enviar | sempre no chat (cópia 1080x1920 com menos de 30 MB), além do GitHub |
| Organização | uma pasta por versão, commit `vN - o que mudou`, README do vídeo com a tabela de versões |

## Hipóteses a testar
Ideias do agente ou dos dados que o Alex ainda não pediu nem aprovou.
| Hipótese | Como testar | Resultado |
| --- | --- | --- |
| Os sinos das notificações podem estar altos demais quando há três seguidos | perguntar no feedback da v5 | |
| Legendas `destaque` (palavra a vermelho) podem render mais em vídeos de topo de funil | um vídeo de topo com `destaque` e comparar a retenção aos 3 s | |
