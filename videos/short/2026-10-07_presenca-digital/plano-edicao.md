# Plano de edição: presença digital

Estilo: Iman Gadzhi (legendas, zooms lentos, cenas de grelha, componentes de interface) com o sistema de design alexffb | Formato: 1080x1920 a 30 fps | Estado: v4
Sistema de design: `estrategia/sistema-design.md`

Fonte: `gravados/original.mov` (480x848, 58.2 s). Duração final: 48.8 s de fala + 2 s de frame final = 50.8 s. Cortei 16 %.
Tempos abaixo na linha temporal já cortada.

| Tempo | Imagem | Câmara | SFX | Motion graphic |
| --- | --- | --- | --- | --- |
| 0.0 a 2.6 | tu (take largo) | zoom de entrada lento (106 % para 113 %) | pop | Gancho: painel de vidro escuro, "Como fazer com que te **respondam**", palavras a entrar com desfoque |
| 3.55 a 9.27 | **cena** preto e vermelho com grelha | não se aplica | whoosh, 3 notif | "O teu outreach hoje / Sem qualquer resposta" e 3 notificações iOS: Email (Emails em bulk, Sem resposta), Chamadas (Cold calls, Sem reuniões), Mensagens (DMs, Dão em ghost) |
| 9.27 a 13.23 | tu | zoom lento (106 % para 112 %) em "A tua presença digital não é forte" | não | nenhum |
| 13.3 a 15.3 | tu (take próximo) | fixo | pop | Lower third de vidro: emblema com o asterisco da marca, Alex, @alexffb_ |
| 17.97 a 24.57 | **cena** | não se aplica | whoosh, 6 teclas, 2 pop, clique | "Vão pesquisar sobre nós": browser de vidro, a barra escreve "Layout", entram os resultados Site e Funil, o cursor vai a Site e clica (destaque vermelho) |
| 24.57 a 29.5 | tu | fixo | 4 tick | Mosaicos de vidro 2x2 com ícone: Personal brand, Instagram, LinkedIn, YouTube |
| 33.07 a 42.47 | tu | zoom lento (100 % para 110 %) até ao remate | shimmer 40.8 | Remate 40.8 a 42.5: painel de vidro, "Tratar da tua" + "presença digital" em Instrument Serif com brilho |
| 43.2 a 48.8 | tu | volta a 100 % no corte | notif | CTA: notificação de Mensagens que desce do topo, com contorno vermelho: "Manda-me mensagem / ou escreve aqui em baixo nos comentários" |
| 48.8 a 50.8 | **frame final** com grelha e brilho vermelho | não se aplica | whoosh, shimmer | Logo com borda branca, botão "Manda-me mensagem", @alexffb_ |

Sem barra de progresso no topo (removida a pedido).

## Componentes (pesquisa: Iman Gadzhi, UI ao estilo Apple, Ali Abdaal, Dan Koe)
- Paleta à Iman: a cor de acento do vídeo (#FF2E00) com uma variante clara (#FF7A52) e uma escura (#5A1000); fundo preto.
- Vidro fosco: blur de 18 px, saturação a 160 %, borda de 1 px (mais clara em cima). Sobre o vídeo usa a variante escura (80 a 86 % de opacidade) para o texto ter contraste por cima da parede clara.
- Ícones em squircle (raio de 22 px) com gradiente vermelho, traço de 2 px.
- Entrada em mola: escala de 94 % para 100 % com cerca de 5 % de ultrapassagem (back.out 1.25), subida de 18 px e desfoque de 10 px para 0, em 450 ms. As palavras entram com desfoque e 60 ms de intervalo. Saída com desfoque em 250 ms.
- Cenas: fundo preto com brilho vermelho que respira devagar e grelha de 72 px com máscara.

## Legendas (iguais à v3)
Montserrat em minúsculas, brancas, de Light para Bold à medida que falas, sem sobreposições, a 60 px, com gradiente escuro leve atrás.

## Look
Contraste +8 %, saturação +5 %, brilho +1 %, aumento com Lanczos; no fim, grão de filme leve e vinheta suave.

## Áudio
- Voz: WPE (remoção de reverberação) e redução de ruído leve, supressão da reverberação tardia (rt60 0.5). A cauda de eco depois de cada palavra desceu de -15 dB para -21.8 dB. Depois: high-pass a 85 Hz, -2.5 dB a 300 Hz (menos graves embrulhados), +2 dB a 3.5 kHz (presença), +1.5 dB acima de 10 kHz, de-esser, compressor 3:1 e -14 LUFS.
- Música: composta em MIDI e tocada com instrumentos reais (FluidSynth, FluidR3_GM). Piano em arpejo, pad, cordas e violoncelo a partir dos 12 s, melodia e subida a partir dos 36 s, a 80 BPM em Am, F, C, G, com resolução no frame final. Fica a -23 LUFS e, com o ducking, cerca de -28.5 LUFS enquanto falas (14 LU abaixo da voz).
- SFX gerados por código, um por animação, leves (picos 18 a 26 dB abaixo da voz): pop (painéis), whoosh (cenas), notif (notificações), type (teclas), click (cursor), tick (mosaicos), shimmer (remate e frame final).
- Mistura: -13.9 LUFS, pico a -2.8 dBFS.

## Histórico
- v1: zoom em cada corte, palavras a aparecer uma a uma, 7 SFX. Feedback: movimento forte demais.
- v2: zoom só em momentos-chave, legendas por bloco com fade. Feedback: legendas a sobrepor-se e a piscar; pedido estilo Iman.
- v3: legendas Montserrat light para bold, zooms lentos, cenas de grelha. Feedback: tirar a linha do topo, melhorar muito os motion graphics (mais iguais ao Iman), voz sem eco, música leve e SFX nas animações.
- v4: este plano.

## Exportar
Uma pasta por versão em `editado/` (`v1/` a `v4/`), cada uma com o vídeo, a preview a 540x960, o PNG estático, `qa.jpg` e o `config.json`. Versão atual: `editado/v4/presenca-digital_v4.mp4`.
