# Plano de edição: presença digital

Estilo: Iman Gadzhi (legendas, zooms lentos, cenas de grelha) com o sistema de design alexffb | Formato: 1080x1920 a 30 fps | Estado: v3
Sistema de design: `estrategia/sistema-design.md`

Fonte: `gravados/original.mov` (480x848, 58.2 s). Duração final: 48.8 s de fala + 2 s de frame final = 50.8 s. Cortei 16 % (menos de 25 %).
Tempos abaixo na linha temporal já cortada.

| Tempo | Imagem | Câmara | SFX | Motion graphic |
| --- | --- | --- | --- | --- |
| 0.0 a 2.6 | tu (take largo) | zoom de entrada lento: 106 % para 113 % em 2.5 s | não | Gancho: "Como fazer com que te respondam" |
| 2.6 a 3.55 | tu | fixo | não | nenhum |
| 3.55 a 9.27 | **cena de grelha** (ecrã inteiro) | não se aplica | whoosh 3.55 | "O teu outreach hoje": Emails em bulk sem resposta (3.6), Cold calls sem reuniões (6.2), DMs que dão em ghost (7.8) |
| 9.27 a 10.17 | tu | fixo | não | nenhum |
| 10.17 a 13.23 | tu | zoom lento: 106 % para 112 % em 3 s ("A tua presença digital não é forte") | não | nenhum |
| 13.23 a 17.97 | tu (take próximo) | fixo | não | Lower third 13.3 a 15.3: Alex, @alexffb_ |
| 17.97 a 24.57 | **cena de grelha** | não se aplica | whoosh 17.97 | "O que encontram quando pesquisam": a barra escreve "Layout"; resultados Site (20.1) e Funil (22.9) |
| 24.57 a 33.07 | tu | fixo | não | Chips: Personal brand (24.7), Instagram (26.9), LinkedIn (27.5), YouTube (27.9), até 29.5 |
| 33.07 a 42.47 | tu | zoom lento: 100 % para 110 % em 9.4 s ("Agora, se as pessoas…" até ao remate) | não | Remate 40.8 a 42.5: "Tratar da tua *presença digital*" |
| 42.57 a 48.8 | tu | volta a 100 % no corte | pop 43.2 | CTA "Manda-me mensagem" 43.2, "ou comenta aqui em baixo" 44.5 |
| 48.8 a 50.8 | frame final | fixo | whoosh 48.8 | Logo com borda branca, CTA, @alexffb_ |

Barra de progresso: linha fina #FF2E00 a 240 px do topo, 72 px de margem.

## Legendas (estilo Iman)
- Montserrat, tudo em minúsculas (menos siglas como DMs), só branco, sem palavras coloridas.
- A linha aparece inteira em Light (300); cada palavra passa a Bold (700) no momento em que a dizes. A largura do Bold fica reservada, por isso nada salta.
- Linhas de 1 a 5 palavras (até 24 a 29 caracteres), partidas pelas vírgulas e pontos, sem separar "presença digital" nem "personal brand", sem palavra funcional sozinha no fim.
- Troca de linha seca (sem fade), sem sobreposições: cada linha acaba quando a seguinte começa.
- 60 px, centro a 1180 px, sombra suave e um gradiente escuro leve atrás da zona das legendas, para o texto Light se ler por cima do sofá.

## Câmara
Só 3 movimentos, todos lentos e contínuos: o zoom de entrada no gancho e dois zooms de tensão. O enquadramento só volta atrás num corte, por isso nunca se vê um zoom out.

## Look
- Base: contraste +8 %, saturação +5 %, brilho +1 %; aumento de 480x848 com Lanczos e nitidez leve.
- Final: grão de filme leve (temporal, força 3) e vinheta suave (PI/7).

## Áudio
- Voz: high-pass a 80 Hz, afftdn leve, compressor suave, -14 LUFS, micro fades de 10 ms.
- Música: base calma gerada por código (90 BPM), a -26 LUFS antes do ducking e cerca de -31.5 LUFS quando falas.
- SFX gerados por código (4 dB abaixo do v1): whoosh na entrada das 2 cenas de grelha e no frame final, pop no CTA.
- Mistura: -13.9 LUFS, pico a -2.8 dBFS.

## Histórico
- v1: zoom em cada corte, palavras a aparecer uma a uma, Instrument Serif em todos os destaques, 7 SFX. Feedback: movimento forte demais.
- v2: zoom só em momentos-chave, legendas por bloco com fade. Feedback: as legendas às vezes sobrepunham-se (blocos com menos de 0.3 s eram esticados) e piscavam com o fade; pedido estilo Iman praticamente igual.
- v3: este plano.

## Exportar
Uma pasta por versão em `editado/`: `v1/`, `v2/` e `v3/`, cada uma com o vídeo (`presenca-digital_vN.mp4`, H.264, AAC 192k), a preview a 540x960, o PNG estático do gancho, a folha de QA (`qa.jpg`) e a configuração usada (`config.json`). A transcrição fica em `editado/transcricao.json`. Versão atual: `editado/v3/presenca-digital_v3.mp4`.
