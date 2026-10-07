# Plano de edição: presença digital

Estilo: ritmo Iman Gadzhi com movimento leve | Formato: 1080x1920 a 30 fps | Estado: v2 (feedback à v1 aplicado)
Sistema de design: `estrategia/sistema-design.md`

Fonte: `gravados/original.mov` (480x848, 58.2 s). Duração final: 48.8 s de fala + 2 s de frame final = 50.8 s. Cortei 16 % (menos de 25 %).
Tempos abaixo na linha temporal já cortada.

| Tempo | Corte | Enquadramento | SFX | Legenda (destaque) | Motion graphic |
| --- | --- | --- | --- | --- | --- |
| 0.0 a 2.6 | abre direto na fala | take largo, 106 % fixo | não | outreach | Gancho: "Como fazer com que te respondam" ("respondam" no acento) |
| 2.6 a 10.2 | 4 pausas removidas, jump cuts no mesmo plano | 106 % fixo | pop 3.5 | resposta, ghost, acontecer | Lista 3.5 a 10.0: o painel cresce com cada item (3.6, 6.2, 7.8) |
| 10.2 a 13.2 | 2 pausas removidas | **momento-chave:** aproximação suave para 113 % (450 ms) em "A tua presença digital não é forte" | não | presença digital | nenhum |
| 13.2 a 17.9 | sai "Vou-te dar um exemplo muito simples"; muda de take | corte para o take próximo, 100 % fixo | não | email, responder | Lower third 13.3 a 15.3: "Alex" e "@alexffb_" |
| 17.9 a 29.5 | 6 pausas removidas | 100 % fixo | whoosh 17.9 | pesquisar, encontrar, site, personal brand | Pesquisa: a barra escreve "Layout"; os resultados entram em chips e o painel cresce |
| 29.5 a 33.2 | 3 pausas removidas | 100 % fixo | não | úteis | nenhum |
| 33.2 a 40.8 | 4 pausas removidas | **momento-chave:** aproximação suave para 107 % (450 ms) em "Agora, se as pessoas…" | não | óbvio, antes | nenhum |
| 40.8 a 42.6 | sem corte | **momento-chave:** aproximação suave para 112 % (450 ms) em "Tratar da tua presença digital" | não | presença digital | Remate: "Tratar da tua *presença digital*" (a única vez com Instrument Serif) |
| 42.6 a 48.8 | 3 pausas removidas | volta suave a 100 % (500 ms) | pop 43.2 | mensagem, resultados | CTA "Manda-me mensagem" 43.2 e "ou comenta aqui em baixo" 44.5 |
| 48.8 a 50.8 | frame final fixo e escurecido | fixo | whoosh 48.8 | não | Logo com borda branca, CTA, @alexffb_ |

Barra de progresso: linha fina #FF2E00 a 240 px do topo, com 72 px de margem de cada lado.

## Movimento (sistema de design, decisão 6)
- Só 4 movimentos de câmara, todos em momentos-chave, de 450 a 500 ms com cubic-bezier(.2,.8,.2,1). Entre eles o plano não mexe.
- Painéis e textos: fade e subida de 8 px em 300 ms, uma vez só; saída só com fade (200 ms, ease in). Sem escala, sem parallax.
- Legendas: o bloco inteiro (1 a 3 palavras) aparece com fade de 200 ms, sem animação por palavra.
- Único destaque com rim: o CTA (satin do acento, borda superior de 1 px, texto preto a 5.6:1).

## Legendas
Inter Bold 76 px branca com contorno preto de 14 px, sobre a t-shirt preta. O destaque de cada frase vai na cor de acento, na mesma fonte. Topo a 1170 px.

## Cor
Contraste +8 %, saturação +5 %, brilho +1 %. Aumento de 480x848 para 1404x2480 com Lanczos e nitidez leve (unsharp 0.55). Sem LUT.

## Áudio
- Voz: high-pass a 80 Hz, redução de ruído leve (afftdn), compressor suave, -14 LUFS. Micro fades de 10 ms em cada corte.
- Música: base calma gerada por código (90 BPM, Am9, Fmaj7, Cmaj7, G6), a -26 LUFS antes do ducking e cerca de -31.5 LUFS quando falas. Sai em fade no frame final.
- SFX gerados por código: 2 pop e 2 whoosh, 4 dB mais baixos do que na v1, sempre com mais de 3 s entre eles.
- Mistura final: -13.9 LUFS integrado, pico a -2.8 dBFS.

## Histórico
- v1: zoom em cada corte (100, 110, 115 %) e punch a 125 %, palavras a aparecer uma a uma, Instrument Serif em todos os destaques, cartão "Presença digital" aos 10 s, 7 SFX. Feedback: movimento forte demais.
- v2: este plano.

## Exportar
`editado/presenca-digital_v2.mp4` (H.264, CRF 18, AAC 192k), `editado/presenca-digital_v2_preview.mp4` (540x960), `editado/presenca-digital_static.png` (frame do gancho, versão estática).
