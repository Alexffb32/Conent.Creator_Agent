# Música

A música de fundo é composta por código (`scripts/edicao/musica_midi.py`) e tocada com instrumentos reais (FluidSynth e o soundfont FluidR3_GM), por isso não tem direitos de terceiros.

## Disponível
| Estilo | Como soa | Onde encaixa |
| --- | --- | --- |
| Calmo, piano e cordas (o atual) | 80 BPM, Am F C G; piano em arpejo e pad desde o início, cordas e violoncelo a partir do compasso 5, melodia simples e uma subida perto do fim, resolução no frame final | Meio de funil, autoridade, educativo |

## Regras de mistura
- Música a -23 LUFS, com ducking pela voz (`sidechaincompress`, rácio 2): enquanto se fala fica cerca de 14 LU abaixo.
- Entrada com fade de 1,2 s, saída de 2,2 s a acabar no fim do frame final.
- Sem música: `pipeline.py audio --sem-musica` ou `"musica": {"ativa": false}` no config.
- Mais presença (topo de funil): `"musica": {"lufs": -21}`.

## Música do criador
Se o criador tiver música com licença (biblioteca paga, música própria), põe o ficheiro em `assets/music/` e substitui `trabalho/tmp/musica.wav`
depois de normalizar (`loudnorm2.py <entrada> trabalho/tmp/musica.wav -23 -3`), antes da mistura. Nunca usar música comercial sem licença.

## Por fazer
Estilos que ainda não existem e quando os criar: energético (topo de funil, 100 a 120 BPM, bateria leve), tensão (antes de uma revelação), lo-fi (lifestyle).
Cria-os como funções novas em `musica_midi.py`, com a mesma estrutura, e acrescenta uma linha à tabela.
