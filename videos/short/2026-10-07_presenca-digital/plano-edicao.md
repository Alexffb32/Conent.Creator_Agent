# Plano de edição: presença digital

Estilo: dinâmico (ritmo Iman Gadzhi) | Formato: 1080x1920 a 30 fps | Estado: AGUARDA APROVAÇÃO

Fonte: `gravados/original.mov` (480x848, 58.2 s). Duração final: 48.8 s de fala + 2 s de frame final = 50.8 s. Cortei 16 % (menos de 25 %).
Tempos abaixo na linha temporal já cortada.

| Tempo | Corte | Zoom | B-roll | SFX | Legenda (destaque) | Motion graphic |
| --- | --- | --- | --- | --- | --- | --- |
| 0.0 a 2.6 | abre direto na fala | 112 % | não | não | outreach | Gancho: "Como fazer com que te *respondam*" |
| 2.6 a 6.2 | pausa de 0.67 s removida | 123 % | não | whoosh 3.3 | resposta | Lower third 2.6 a 4.6 (logo, Alex, @alexffb_). Lista entra 3.3, item 1 a 3.6 |
| 6.2 a 9.3 | 2 pausas removidas | 112 %, depois 129 % | não | pop 6.2 | ghost | Lista: "Cold calls sem reuniões" 6.2, "DMs que dão em ghost" 7.8 (sai 10.0) |
| 9.3 a 13.2 | 3 pausas removidas | 112 %, 123 %, 112 % | não | whoosh 10.3 | acontecer, presença digital | Palavra grande "Presença *digital*" 10.3 a 13.2 |
| 13.2 a 17.9 | sai "Vou-te dar um exemplo muito simples" (2 s) | 115 %, 100 % | não | não | email, responder | nenhum |
| 17.9 a 29.5 | 6 pausas removidas | 100 % a 115 % | não | whoosh 17.9, pop 24.1, pop 27.9 | pesquisar, encontrar, site, personal brand | Pesquisa: a barra escreve "Layout"; resultados Site 20.1, Funil 24.1, Personal brand 24.7, Instagram 26.9, LinkedIn 27.5, YouTube 27.9 |
| 29.5 a 40.8 | 7 pausas removidas | alterna 100 %, 110 %, 115 % | não | não | úteis, óbvio, antes | nenhum (só legendas) |
| 40.8 a 42.5 | sem corte | punch a 125 % | não | whoosh 40.8 | presença digital | Remate: "Tratar da tua *presença digital*" |
| 42.5 a 48.8 | 3 pausas removidas | 100 %, 110 % | não | não | mensagem, resultados | CTA "Manda-me mensagem" 43.2, "ou comenta aqui em baixo" 44.5 |
| 48.8 a 50.8 | frame final fixo e escurecido | não | não | whoosh 48.8 | não | Logo com borda branca, pill "Manda-me mensagem" com rim de acento, @alexffb_ |

Barra de progresso: linha fina #FF2E00 a 240 px do topo, do início ao fim.

## Regras de edição
- Cortes: silêncios acima de 0.25 s, com 0.06 s de respiração de cada lado. Fica a pausa curta antes de "é forte" (ênfase).
- Zoom: muda em cada corte (ciclo 100, 110, 100, 115 % sobre a base de cada take), 250 ms, easing cubic-bezier(.2,.8,.2,1). O take largo (até 13.2 s) tem base 112 % para a cara ficar do mesmo tamanho que no take próximo. Quando há cartão em cima, o zoom baixa para a cabeça não ficar tapada.
- Olhos a cerca de 40 % da altura, não a 35 %: com uma fonte de 480x848, chegar aos 35 % obrigava a 125 % de zoom permanente e o vídeo ficava desfocado.
- Legendas: 1 a 3 palavras, aparecem à hora exata de cada palavra (fade e subida de 8 px, 200 ms). Inter Bold 76 px branca com contorno preto; o destaque de cada frase vai em Instrument Serif Italic 96 px #FF2E00. Topo a 1170 px, por cima da t-shirt preta (contraste muito acima de 4.5:1).
- Cartões: #121212 a 94 %, raio 24, borda superior branca a 50 %, sombra para baixo. Entrada de 300 ms com ease out, saída de 200 ms com ease in.
- Zona segura: nada acima de 230 px nem abaixo de 1536 px; as legendas ficam entre 110 e 970 px na horizontal, longe dos botões do Reels.

## Cor
Contraste +8 %, saturação +5 %, brilho +1 %. Aumento de 480x848 para 1404x2480 com Lanczos e nitidez leve (unsharp 0.55). Sem LUT, porque `assets/lut/` está vazio.

## Áudio
- Voz: high-pass a 80 Hz, redução de ruído leve (afftdn), compressor suave, loudnorm a -14 LUFS (pico real -1 dBTP). Micro fades de 10 ms em cada corte para não haver cliques.
- Música: base gerada por código, a -26 dB por baixo da voz, com ducking quando falas; sai em fade no frame final.
- SFX gerados por código: 5 whoosh e 3 pop, sempre com pelo menos 3 s entre eles.

## Exportar
`editado/presenca-digital_v1.mp4` (H.264, CRF 18, AAC 192k), `editado/presenca-digital_preview.mp4` (540x960), `editado/presenca-digital_static.png` (frame do gancho).
