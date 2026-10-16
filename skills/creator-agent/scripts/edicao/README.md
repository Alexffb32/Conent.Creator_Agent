# Pipeline de edição (short 9:16)

Scripts do estágio 7 (`stages/07-edit.md`). Só ferramentas livres: FFmpeg, faster-whisper, OpenCV, nara_wpe, FluidSynth e HyperFrames.
Antes da primeira edição: `python3 ../verificar.py` (diz o que falta e como instalar).
Pré-requisitos: `pip install faster-whisper "opencv-python-headless<5" nara_wpe noisereduce soundfile scipy mido pillow`, FFmpeg completo,
FluidSynth com o soundfont FluidR3_GM, Node 20 ou superior (o HyperFrames corre com `npx`, versão fixa 0.8.140).

## Em 4 comandos
```
python3 pipeline.py preparar <pasta_do_video> [--cortes-manuais "[[15.2,16.98]]"] [--vocabulario "Layout, alexffb"]
#   30 fps constantes, transcrição (large-v3), cortes de silêncio, segmentos, palavras na linha cortada, cara, vídeo base,
#   e trabalho/config.json inicial (takes sugeridos, acento da marca). O agente preenche os componentes (biblioteca/componentes.md).
python3 pipeline.py previa <pasta_do_video> --at 0,1.9   # fotogramas da composição em segundos, sem render (hyperframes snapshot)
python3 pipeline.py render <pasta_do_video>      # composição HyperFrames (compor.py) e render; SFX em trabalho/sfx_eventos.json
python3 pipeline.py audio <pasta_do_video>       # voz sem eco, música com ducking, SFX do mapa, mistura a -14 LUFS
python3 pipeline.py exportar <pasta_do_video> v1 --titulo "primeira edição"
#   vN/ com vídeo, capa.png, qa.jpg e config.json; cópia para o chat (abaixo de 30 MB); meta.json e README do vídeo atualizados
```
`tudo <pasta> vN --titulo "..."` faz render, áudio e exportar seguidos. Tempo num portátil sem GPU, para 50 s de vídeo: preparar cerca de 2 min
(mais a transcrição), render 5 a 7 min, áudio 1 min.

Pastas: `gravados/` (originais, nunca alterados), `trabalho/` (JSON de trabalho, vai para o git), `trabalho/tmp/` (intermédios, fora do git), `vN/` (entrega).
Na nuvem do Claude Code, o HyperFrames usa o Chromium da máquina (o pipeline encontra-o em `/opt/pw-browsers`; noutro sítio, define `HYPERFRAMES_BROWSER_PATH`).

## Os scripts por dentro
| Script | Faz |
| --- | --- |
| `transcrever.py` | faster-whisper com tempos por palavra (`--lingua`, `--prompt` com o vocabulário) |
| `cortes.py` | silêncios acima de 0,25 s (limiar -40 dB) e cortes manuais |
| `segmentos.py` | segmentos alinhados ao fotograma (a 30 fps) |
| `mapear.py` | palavras na linha temporal cortada (aceita a transcrição do Whisper e o formato documentado com `frases`) |
| `rostos.py` | posição da cara por segmento (para o enquadramento e os takes) |
| `base.py` | vídeo cortado, com cor, aumentado para 2480 px de altura |
| `compor.py` | composição HyperFrames: legendas (`iman`, `destaque`, `simples`), zooms, componentes, frame final, eventos de SFX |
| `voz_crua.py`, `dereverb.py`, `reverb_tardia.py`, `loudnorm2.py` | voz cortada, WPE, reverberação tardia, normalização em 2 passos |
| `musica_midi.py` | música composta em MIDI e tocada com FluidSynth |
| `sfx_amostras.py` | SFX com os sons do criador (mapa), alinhados pelo impacto e normalizados pela sonoridade |
| `sfx.py`, `gerar_sons.py` | SFX gerados por código e o kit de sons para quem não tem |
| `catalogar_sons.py` | catálogo dos sons do criador e proposta de mapa |
| `audio_util.py` | leitura de áudio, LUFS momentâneo, envolvente |
| `logo_borda.py` | logo transparente com borda branca a partir de um PNG de fundo branco |

Estilo de legendas, componentes e o formato do `config.json`: `biblioteca/componentes.md`. Erros conhecidos: `references/licoes-tecnicas.md`.
