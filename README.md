# Creator Agent

> **Alex:** o teu conteúdo (vídeos, versões, marca e sons) está em [`alexffb/`](alexffb/). O agente está em [`skills/creator-agent/`](skills/creator-agent/).

Um agente open source para o Claude Code que faz por um criador de conteúdo **iniciante** o trabalho de uma equipa: estratégia, pesquisa de referências, guiões, instruções de gravação, edição de shorts com legendas, motion graphics, música e SFX, agendamento e análise. E aprende o estilo de cada criador com o feedback.

## O que faz

1. **Pergunta** o essencial (objetivos, nicho, oferta, equipamento, tempo, marca, sons, referências de edição) com perguntas de escolha rápida.
2. **Pesquisa** criadores e vídeos de referência do teu nicho e faz **fichas de estilo** com dados (ritmo de cortes, paleta, sonoridade, fotogramas do gancho), sempre com fontes e datas.
3. **Monta o funil** (topo, meio, fundo) e um calendário, e diz-te o que publicar a seguir.
4. **Escreve o guião** e o **roteiro de gravação** (planos, luz, som, B-roll).
5. Tu **gravas** e pões os ficheiros em `gravados/`.
6. **Edita** num pipeline de 4 comandos: cortes, legendas, zooms, componentes de motion, voz sem eco, música e os teus sons. Entrega uma pasta por versão, num commit com o título `vN - o que mudou`, e manda-te o vídeo no chat.
7. **Aprende**: cada feedback vira regra no teu `estilo-edicao.md` ("motion leve", "sem barra de progresso", "SFX baixos"), e cada erro técnico vira uma lição que não se repete.
8. **Adapta**, **agenda** e, depois de publicares, **analisa** os resultados para o próximo.

## Instalar

Passo a passo em [INSTALL.md](INSTALL.md). No Claude Code:
~~~
/plugin marketplace add Alexffb32/Conent.Creator_Agent
/plugin install creator-agent@alexffb
~~~
Depois, no teu repositório privado de criador, escreve `/creator-agent:creator-agent` ou simplesmente "usa o creator-agent". Na primeira vez faz o onboarding e verifica o que falta instalar para editar (`scripts/verificar.py`).

## Uso

| Pedido | O que faz |
| --- | --- |
| `/creator-agent:creator-agent` | Deteta o estado e propõe a próxima ação (primeira vez: onboarding) |
| `... proximo` | Diz o que publicar a seguir e propõe 3 ideias |
| `... pesquisa` | Pesquisa de referências do nicho |
| `... estilo <criador ou vídeo>` | Ficha de estilo de edição com dados |
| `... roteiro <pasta>` | Guião e roteiro de gravação |
| `... editar <pasta>` | Plano de edição, edição e entrega da versão |
| `... agendar <pasta>` | Adaptações por plataforma e calendário |
| `... analisar` | Métricas e aprendizagens |

Também funciona em linguagem natural: "edita o vídeo que gravei no meu estilo", "na v2 baixa os sons", "analisa o estilo do Iman Gadzhi".

## O que está dentro

| Pasta | O que tem |
| --- | --- |
| `skills/creator-agent/SKILL.md` | O agente: princípios, ponto de entrada, estrutura do repositório do criador |
| `stages/` | Os 9 estágios (onboarding, pesquisa, estratégia, guião, roteiro, intake, edição, publicação, análise) |
| `scripts/edicao/` | O pipeline de edição (`pipeline.py`) e os scripts por dentro |
| `scripts/` | `verificar.py` (dependências), `analisar_referencia.py`, estrutura e próximo post |
| `biblioteca/` | Componentes de motion, fichas de estilo, sons, música, formatos de vídeo e prompts |
| `references/` | Funil, ganchos, CTAs, plataformas, pesquisa, edição por objetivo e lições técnicas |
| `templates/` | Perfil, estilo de edição, sistema de design, guiões, roteiro, plano de edição |

## Privacidade

O agente não guarda dados de nenhum criador. Os teus vídeos, estratégia e métricas ficam no **teu** repositório (de preferência privado). Este repositório tem também o estúdio do Alex (`alexffb/`), público por escolha dele. Nunca guardes chaves ou tokens em ficheiros.

## Limites honestos

- A pesquisa depende do que a web e as tuas ligações permitem. Instagram e TikTok bloqueiam leitura automática; nesse caso o agente pede links, capturas ou ficheiros.
- Não promete resultados. Aprende com padrões, não garante virais.
- A edição precisa de FFmpeg, Python, Node e FluidSynth (o `verificar.py` diz como instalar). O render de 50 s demora 5 a 7 minutos num portátil sem GPU.
- O agente não ouve o áudio: mede-o (sonoridade, distância dos SFX à voz) e confia no teu feedback para o resto.

## English (short)

Creator Agent is an open-source Claude Code plugin for beginner creators. It interviews you, researches reference creators and builds data-backed editing style cards, plans a TOFU/MOFU/BOFU funnel and schedule, writes scripts and shoot guides, and edits short-form videos with a 4-command pipeline (captions, motion graphics, de-reverbed voice, generated music, your own SFX). It learns each creator's editing style from feedback and never repeats a logged technical mistake. Install with `/plugin marketplace add Alexffb32/Conent.Creator_Agent` and `/plugin install creator-agent@alexffb`. Prompts are in European Portuguese and can be translated via pull request.

## Contribuir e licença

Ver [CONTRIBUTING.md](CONTRIBUTING.md). Licença MIT.
