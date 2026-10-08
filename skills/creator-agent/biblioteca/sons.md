# Sons (SFX)

Cada animação do `compor.py` gera um evento de som com um tipo. O mapa (`assets/sons/mapa.json` do criador) diz que ficheiro toca em cada tipo,
onde está o impacto e a que sonoridade. O pipeline usa o mapa do vídeo (`trabalho/sfx_mapa.json`) se existir, senão o do criador, senão sons gerados.

## Tipos
| Tipo | Animação | Som típico | Sonoridade alvo (LUFS-M, antes de +4 dB na mistura) | Distância à voz |
| --- | --- | --- | --- | --- |
| `pop` | painéis, resultados, gancho | pop curto | -37 | cerca de 20 dB |
| `whoosh` | entrada de cenas, frame final | swish | -35 | 15 a 17 dB |
| `notif` | notificações, CTA | sino ou ding | -35 | 16 a 18 dB |
| `type` | letras a ser escritas | teclas soltas de um teclado | -52 por tecla | 24 a 27 dB |
| `click` | cursor a clicar | clique de rato | -45 | cerca de 25 dB |
| `tick` | mosaicos, itens de lista | o pop, mais agudo (2 a 7 meios-tons), a alternar esquerda e direita | -43 | cerca de 25 dB |
| `riser` / `shimmer` | remate (a ideia principal) | riser que acaba no impacto, ou brilho | -36 | 15 a 17 dB |
| `boom` | gancho e frame final | impacto grave, muito baixo | -38 | cerca de 20 dB |

Valores afinados num vídeo de autoridade com SFX "leves" (pedido do criador). Para topo de funil, sobe 2 a 3 dB; nunca acima da voz.

## Fluxo
1. O criador dá os seus sons (pasta, zip, Drive) e ficam em `assets/sons/`. Só sons que ele tem direito de usar.
2. `python3 scripts/edicao/catalogar_sons.py assets/sons` mede cada som, sugere o tipo (pelo nome e pela forma de onda), marca os de meme como excluídos e propõe o `mapa.json`.
3. Mostra o mapa ao criador numa frase por som e o que ficou de fora; ajusta se ele quiser.
4. Depois do render, mede a distância de cada SFX à voz e afina a `lufs` no mapa. O feedback ("sons altos", "não se ouvem") vai para o `estilo-edicao.md`.

Sem sons: `python3 scripts/edicao/gerar_sons.py assets/sons` cria um kit gerado por código (pop, whoosh, sino, teclas, clique, tick, shimmer, riser, boom) e o mapa.

## Campos do mapa
```json
{
 "pop":    {"ficheiro": "Pop.MP3", "de": 0.036, "ate": 0.3, "impacto": 0.015, "lufs": -37, "fade": 0.12},
 "type":   {"ficheiro": "Keyboard Typing.MP3", "teclas": [1.16, 1.34, 1.544, 2.318, 2.398, 2.102], "dur": 0.08, "pre": 0.004, "lufs": -52, "pan": 0.55},
 "tick":   {"ficheiro": "Pop.MP3", "de": 0.036, "ate": 0.3, "impacto": 0.015, "lufs": -43, "semitons": [2, 4, 5, 7], "pans": [0.42, 0.58, 0.42, 0.58]}
}
```
`de` e `ate` cortam o ficheiro; `impacto` é o tempo (a partir de `de`) que cai no fotograma da animação; `fade` é a saída; `pan` de 0 (esquerda) a 1 (direita).
