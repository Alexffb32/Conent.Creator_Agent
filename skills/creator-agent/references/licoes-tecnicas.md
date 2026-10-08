# Lições técnicas

Erros que já aconteceram e a regra que os evita. Lê esta lista antes de cada edição e confirma no QA as que se aplicam.
Quando resolveres um erro novo, acrescenta-o em `estrategia/licoes-tecnicas.md` do criador e propõe-o aqui (ver `CONTRIBUTING.md`).
Formato: sintoma, causa, regra.

## Captação e preparação
1. **Vídeo de telemóvel em câmara lenta ou dessincronizado.** O iPhone grava a 60 fps ou com fps variável e os cortes contam fotogramas a 30. Regra: converter sempre para 30 fps constantes antes de cortar (o `pipeline.py preparar` faz isto).
2. **Vídeo enviado pelo chat com pouca resolução (480x848).** As apps comprimem. Regra: pedir o original da câmara (carregado no repositório ou num link) antes de editar; se não houver, avisar que vai ficar menos nítido.
3. **Vários takes em `gravados/`.** O pipeline precisa de um ficheiro. Regra: escolher com `--fonte` ou juntar primeiro, pela ordem do guião.

## Transcrição e legendas
4. **Whisper `small` erra nomes e termos.** Regra: usar `large-v3` e dar o vocabulário (nome, handle, marca, termos do nicho) em `--vocabulario`; rever as frases e pôr as correções em `correcoes` no config.
5. **Palavras com tempo zero ou dentro de um silêncio cortado.** Regra: o `mapear.py` mantém a ordem e empurra a palavra para o início do segmento seguinte; nunca apagar palavras faladas.
6. **Legendas a sobrepor-se e a piscar.** Causa: linhas com menos de 0,3 s esticadas para lá da seguinte e fades de 200 ms. Regra: sem sobreposição (cada linha acaba quando a seguinte começa), troca seca, linhas curtas juntas à vizinha. O `compor.py` imprime "sobreposições: 0"; se não for 0, corrigir antes do render.
7. **Primeira legenda sobreposta à segunda durante 1 fotograma.** Causa: a linha começava 0,04 s antes da primeira palavra, num tempo negativo; o render prende o início a 0 mas mantém a duração. Regra: nenhum clip começa antes de 0 (o `compor.py` já garante).
8. **Texto escuro ou claro sem contraste sobre o vídeo (parede clara, sofá).** Regra: gradiente escuro atrás das legendas (`scrim`) e vidro escuro (`dark`) nos painéis sobre o vídeo.

## Enquadramento e motion
9. **Zoom em cada corte cansa ("movimento forte demais").** Regra: zoom de entrada no gancho e pushes lentos só em 2 a 4 momentos-chave por minuto.
10. **A cara fica tapada por um cartão.** Regra: o enquadramento desce a cara para baixo do cartão (o `compor.py` faz isto com o `fundo` de cada componente); confirmar nos fotogramas do QA.
11. **Espaço vazio reservado em cartões e browser.** Regra: a altura cresce à medida que os itens entram, nunca reservada de início.
12. **Conflito de transformações no GSAP (o elemento salta).** Regra: não animar `x`/`scale` e usar `transform` em CSS no mesmo elemento; pôr um invólucro para centrar.
13. **Número a contar fica parado no render.** O render salta no tempo e não dispara callbacks (`onUpdate`). Regra: animar propriedades (`textContent` com `snap`), nunca depender de callbacks.
14. **Barra de progresso no topo** foi pedida para sair por um criador; só usar se o estilo do criador a pedir.

## Áudio
15. **Eco da sala na voz.** O WPE sozinho reduz pouco (cerca de 1,5 dB). Regra: WPE e supressão da reverberação tardia (rt60 0,5), depois EQ, de-esser e compressor; medir a cauda depois das palavras. Na gravação, falar perto de tecidos ou usar microfone de lapela.
16. **SFX com o mesmo pico soam com volumes muito diferentes.** Um sino longo e agudo parece mais alto do que um pop. Regra: normalizar pela sonoridade (LUFS momentâneo) e medir a distância à voz em cada evento: sinos e risers 15 a 18 dB abaixo, pops cerca de 20 dB, teclas, cliques e mosaicos 24 a 27 dB.
17. **Whoosh ou riser fora de tempo.** Regra: alinhar pelo impacto (o pico do whoosh, o fim do riser, o toque do sino) no fotograma em que a animação aparece, não pelo início do ficheiro.
18. **Sons de meme num vídeo de autoridade** (Among Us, Vine Boom, FAHHH). Regra: o `catalogar_sons.py` marca-os como excluídos; só usar se o criador pedir para um vídeo de humor.
19. **Música a competir com a voz.** Regra: música a -23 LUFS com ducking pela voz (fica cerca de 14 LU abaixo enquanto se fala), mistura final a -14 LUFS e pico a -1 dBTP.

## Render e ferramentas
20. **`npx hyperframes` vai buscar uma versão nova que falha.** Regra: fixar a versão (`hyperframes@0.8.140`, ou a de `HYPERFRAMES_VERSAO`).
21. **ffmpeg sem memória com muitos troços (`trim` por segmento).** Regra: selecionar por número de fotograma num só passo (`select=between(n,...)`), como o `base.py`.
22. **OpenCV 5 não tem `CascadeClassifier`.** Regra: `opencv-python-headless<5`.
23. **faster-whisper falha a ler o vídeo (PyAV).** Regra: descodificar o áudio com ffmpeg para numpy, como o `transcrever.py`.
24. **Ficheiro grande demais para enviar no chat (30 MB) ou no Discord (20 MB).** Regra: o vídeo final fica intacto no repositório; para enviar, uma cópia em 2 passagens ao tamanho certo (o `pipeline.py exportar` faz a do chat).

## Entrega e organização
25. **O criador não percebe as pastas.** Regra: cada vídeo com um `README.md` que diz a versão atual e a tabela de versões; uma pasta por versão (`v1/`, `v2/`…), cada uma num commit só seu com o título `vN - o que mudou`; ficheiros técnicos em `trabalho/`.
26. **Travessões no texto do ecrã.** Alguns criadores pedem que não haja; confirmar em `creator.md` (limites) e no `estilo/estilo-criador.md`.
