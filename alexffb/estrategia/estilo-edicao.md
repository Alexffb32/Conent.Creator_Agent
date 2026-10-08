# Estilo de edição: Alex (alexffb)

O perfil de edição do Alex, aprendido com o feedback do short "presença digital" (v1 a v5). O agente lê-o antes de cada plano e atualiza-o depois de cada feedback.

## Regras confirmadas
| Regra | Origem | Notas |
| --- | --- | --- |
| Movimento leve; transições e zooms só em momentos-chave | feedback à v1, 2026-10-07 | zoom em cada corte e palavras a saltar ficaram fortes demais |
| Legendas ao estilo Iman Gadzhi: Montserrat em minúsculas, brancas, de light para bold à medida que fala | feedback à v2, 2026-10-07 | nunca sobrepostas nem a piscar |
| Sem barra de progresso no topo | feedback à v3, 2026-10-08 | |
| Componentes de motion muito parecidos com os do Iman: vidro fosco escuro, notificações iOS, browser com cursor, mosaicos, lower third | feedback à v3, aprovado na v4 | pesquisa de referências antes de desenhar componentes novos |
| Voz sem eco | feedback à v3, 2026-10-08 | WPE e supressão da reverberação tardia (rt60 0,5) |
| Música de fundo muito leve que combine (piano e cordas, calma) | feedback à v3, 2026-10-08 | -23 LUFS com ducking |
| SFX leves em cada animação, com os sons do Alex | pedido depois da v4, 2026-10-08 | sons em `assets/sons/`, mapa em `assets/sons/mapa.json` |
| Sem travessões no texto do ecrã | perfil, 2026-10-07 | |
| Nome da empresa nos exemplos: Layout | aprovação do plano, 2026-10-07 | |

## Parâmetros atuais
| Parâmetro | Valor | Origem |
| --- | --- | --- |
| Estilo de referência | Iman Gadzhi (ficha em `biblioteca/estilos/iman-gadzhi.md` do agente) | onboarding e v3 |
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
| Hipótese | Como testar | Resultado |
| --- | --- | --- |
| Os sinos das notificações podem estar altos demais quando há três seguidos | perguntar no feedback da v5 | |
| Legendas `destaque` (palavra a vermelho) podem render mais em vídeos de topo de funil | um vídeo de topo com `destaque` e comparar a retenção aos 3 s | |

## Não voltar a fazer
- Zoom em cada corte e palavras a aparecer uma a uma (v1).
- Legendas por bloco com fade de 200 ms (v2: piscavam e sobrepunham-se).
- Barra de progresso (v3).
- Sons de meme (Among Us, FAHHH, Vine Boom, Wrong) em vídeos de autoridade.
