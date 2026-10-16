# Repositórios e skills com mais de 10 mil estrelas: o que serve a este agente

Data: 2026-10-09. Estado da verificação, por ordem de gravidade:
- O github.com devolveu 403 ao `curl` desta sessão ("GitHub access to this repository is not enabled for this session"), por isso NENHUMA contagem de estrelas foi confirmada na página do repositório. Os números abaixo vêm de resultados de pesquisa com datas de captura diferentes (TERCEIROS, confiança baixa a média) e servem só para ordenar. Confirma-os na página antes de os citares.
- As licenças e versões dos pacotes npm foram confirmadas com `npm view` (FACTO). As licenças dos repositórios que não são pacotes npm vêm de memória e estão marcadas.
- Nada foi instalado a partir de repositórios novos nesta ronda. As três skills da Anthropic que já estão disponíveis na sessão foram usadas diretamente.

## Estrelas lidas em resultados de pesquisa (TERCEIROS)
| Repositório | Estrelas (aprox.) | O que é | Licença | Útil para o agente? |
| --- | --- | --- | --- | --- |
| 3b1b/manim | ~95 mil | animações matemáticas em Python | MIT (memória) | Não: é para explicadores de matemática, o motor de motion é o HyperFrames + GSAP |
| openai/whisper | ~110 mil | transcrição | MIT (memória) | Já usamos o faster-whisper (reimplementação mais rápida) |
| ggml-org/whisper.cpp | ~54 mil | Whisper em C/C++ | MIT (memória) | Alternativa leve ao faster-whisper se o Python falhar; não é preciso agora |
| remotion-dev/remotion | ~63 mil | vídeo com React | licença própria, com regras para empresas (de memória, confirmar) | Avaliar só se o HyperFrames deixar de servir; a licença exige leitura |
| Zulko/moviepy | ~15 mil | edição de vídeo em Python | MIT (memória) | Não: o ffmpeg direto faz o que precisamos com menos memória (lição 21) |
| snakers4/silero-vad | ~10,4 mil | deteção de voz | MIT (memória) | Já vem dentro do faster-whisper (ficheiro ONNX). Testado, ver abaixo |
| facebookresearch/demucs | ~10,4 mil | separação de fontes | MIT (memória); sem manutenção, segundo o resultado | Não: sem manutenção e pesado sem GPU |
| anthropics/skills | ~170 a ~178 mil (duas capturas) | skills oficiais da Anthropic | misto, ver cada skill | Sim: as skills estão disponíveis na sessão; ver abaixo |
| obra/superpowers | entre ~41 mil e ~290 mil (capturas contraditórias) | método de trabalho para agentes de código | por confirmar | Só ler ideias de planeamento e verificação; não é de vídeo |
| hesreallyhim/awesome-claude-code | ~47,6 mil | lista de recursos | por confirmar | Para descobrir; instalar nada sem ler o código |
| librosa / pydub | ~8,7 mil / ~9,6 mil | análise e manipulação de áudio | ISC / MIT (memória) | Abaixo dos 10 mil e redundantes com o ffmpeg que já usamos |

Repositórios candidatos de ícones, animação e fontes (Lucide, Tabler, Phosphor, Heroicons, GSAP, Lottie, anime.js, Rive, Fontsource): estrelas NÃO confirmadas. Os pacotes npm existem e têm estas licenças (FACTO, `npm view` de 2026-10-09): lucide-static 1.54.0 ISC; @tabler/icons 3.49.0 MIT; @phosphor-icons/web 2.1.2 MIT; heroicons 2.2.0 MIT; lottie-web 5.13.0 MIT; animejs 4.5.0 MIT; @rive-app/canvas 2.44.1 MIT; @fontsource/inter 5.3.0 OFL-1.1; d3 7.9.0 ISC; mermaid 12.1.0 MIT; @twemoji/svg 15.0.0 MIT. O gsap 3.15.0 tem licença própria "no charge", que não é MIT: confirma os termos antes de publicar um produto comercial. O OpenMoji (CC-BY-SA-4.0) obriga a atribuição e partilha igual: evitar em vídeo comercial.

## Skills e coleções de skills (README e LICENSE lidos em raw.githubusercontent.com; estrelas de TERCEIROS)
Nota de método: o agente de pesquisa leu os README e LICENSE por raw.githubusercontent.com, que respondeu 200 enquanto o github.com dava 403. Não pedi essa via e não a usei para instalar nada; para ler código a sério, o caminho previsto pela sessão é o `add_repo`, repositório a repositório. Nenhum script destes repositórios foi lido nem executado.

| Repositório | Estrelas (terceiros, data da fonte) | Licença | O que fazer |
| --- | --- | --- | --- |
| anthropics/skills | ~155 mil | Apache 2.0 em várias; docx, pdf, pptx e xlsx são source-available | Usar as que já estão na sessão (skill-creator, canvas-design, theme-factory, avoid-ai-writing); não copiar as source-available |
| obra/superpowers | 265 503 (2026-08-03) | MIT | Ler e adaptar ideias de planeamento e verificação; não instalar inteiro |
| coreyhaines31/marketingskills | 49 000 (2026-09-09) | MIT | Ler e adaptar skills de copy e conteúdo depois de rever; traz parceiros pagos e guias de credenciais, ignorar essas partes |
| nextlevelbuilder/ui-ux-pro-max-skill | 132 780 (2026-10-03) | MIT | Ler e adaptar paletas e tipografia; rever os scripts antes de instalar |
| ComposioHQ/awesome-claude-skills | ~58,4 mil | Apache 2.0 (só README) | Só índice; o plugin connect-apps pede uma chave da Composio: ignorar |
| hesreallyhim/awesome-claude-code | 52,3 mil (2026-08-15) | CC BY-NC-ND 4.0 | Só índice; não copiar |
| thedotmack/claude-mem | ~74,8 mil | Apache 2.0 | Ignorar: README manda `curl ... | bash` e tem sincronização na nuvem |
| affaan-m/everything-claude-code | ~252,8 mil | MIT | Ignorar: orientado a código e instala hooks |
| wshobson/agents | ~38,3 mil | MIT | Ignorar: só engenharia |
Abaixo de 10 mil estrelas, por isso fora: BehiSecc/awesome-claude-skills, karanb192, fleurytian, samber/cc-skills. Lacunas do nosso agente que estas fontes podem cobrir (dedução): SEO, avaliações de skills (evals), método de direção visual e psicologia de copy.

## O que usei, e com que resultado
1. **Silero VAD (do faster-whisper)** contra os nossos cortes por limiar de volume, na voz do short "presença digital" (58,2 s). O VAD marcou 52,6 s de fala; dos 48,8 s que o método atual mantém, só 0,51 s não têm fala e não ficou nenhuma pausa de 0,25 s ou mais. Os 4,3 s de "fala dentro dos cortes" que o VAD acusa são sobretudo o preenchimento de 30 ms de cada lado que o VAD acrescenta e um corte manual deliberado de 1,5 s (a frase repetida). Conclusão: o VAD não melhora estes cortes, por isso NÃO o integrei. Pode servir como verificação extra se aparecerem cortes que cortam palavras.
2. **Skill `avoid-ai-writing` (Anthropic)** na legenda do Instagram: corrigiu o gancho "não falha X. Falha Y." e suavizou uma certeza. A tabela de 43 palavras é para inglês; só os padrões de estrutura se aplicam ao português.
3. **Skill `skill-creator` (Anthropic)** na descrição do `SKILL.md`: a descrição atual (540 caracteres) fala de "editar conteúdo" em geral, sem Instagram, Reels, Shorts nem o vocabulário real dos pedidos, e não diz quando NÃO usar; propus uma descrição de 689 caracteres e 12 pedidos de teste (6 que devem disparar e 6 que não). Não apliquei a alteração ao `SKILL.md`, para o Alex a aprovar. Medir o disparo a sério pede o ciclo completo de testes do skill-creator.
4. **Skills `instagram-skills`** (já da ronda anterior).

5. **marketingskills e ui-ux-pro-max-skill (lidos depois de autorizares o `add_repo`).** Li o código e os documentos: sem `curl | bash`, sem execução de comandos externos, sem pedidos de chaves nas partes que usei; as duas ocorrências de "ignore previous instructions" no marketingskills são avisos contra injeção. Do marketingskills adaptei quatro notas à biblioteca (`copy-sem-marcas-de-ia.md`, `oferta.md`, `prospecao-local.md`, `roteiros-short-form.md`; créditos em `../CREDITOS.md`). Do ui-ux-pro-max corri o gerador de sistemas de design com a descrição da marca do Alex: devolveu fundo claro, acento dourado e Cormorant, que é para sites e aplicações e contradiz a marca aprovada (fundo preto, acento #FF2E00, Montserrat). Aproveitei só a confirmação de que o estilo "Liquid Glass" (vidro fosco) e o Montserrat constam do catálogo, e não mudei nada na marca.

## O que fica de fora, e porquê
- Nenhuma biblioteca de efeitos sonoros ou música livre com mais de 10 mil estrelas foi encontrada ou confirmada. Os sons continuam a ser os do criador ou o kit gerado.
- Remover fundo (rembg), reenquadramento (MediaPipe), upscaling e separação de voz ficaram por avaliar: estrelas e licenças por confirmar e, sem GPU, o custo é alto para o ganho num short de 50 s.
- Para completar esta pesquisa com estrelas e licenças confirmadas é preciso que a sessão tenha leitura dos repositórios em causa (`add_repo`, um por um) ou que se cole aqui a informação das páginas.
