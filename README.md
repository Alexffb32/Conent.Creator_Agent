# Creator Agent

Um agente open source para o Claude Code que ajuda criadores de conteúdo **iniciantes** a fazer o que normalmente exige uma equipa: estratégia, pesquisa de referências, guiões, instruções de gravação, edição com motion graphics, agendamento e análise. Sem pagar a editor, videógrafo ou argumentista, e sem perder horas a pesquisar.

## O que faz

1. **Pergunta** o essencial (objetivos, nicho, o que vendes, equipamento, tempo) com perguntas de escolha rápida.
2. **Pesquisa** criadores e vídeos de referência do teu nicho, extrai o que funcionou (ganchos, estrutura, CTAs, edição) e guarda tudo com fontes e datas.
3. **Monta o funil** (topo, meio, fundo) e um calendário. Sabe o que publicaste da última vez e diz-te o que publicar a seguir para manter o rumo.
4. **Escreve o guião** (o que dizer) e o **roteiro de gravação** (como gravar: planos, luz, som, B-roll, checklist).
5. Tu **gravas** e pões os ficheiros na pasta `gravados/` do vídeo.
6. Ele **valida** os ficheiros, faz o **plano de edição**, **edita** com legendas e motion graphics e entrega uma pasta por versão (`v1/`, `v2/`…).
7. **Adapta** a peça a cada plataforma (Instagram, YouTube, TikTok, podcast), **agenda** e, depois de publicares, **analisa** os resultados para melhorar o próximo.

Lê a audiência real (a que tens e a que queres atingir) através das ligações a Instagram e YouTube, ou de exportações dos teus insights.

## Instalar (resumo)

Ver [INSTALL.md](INSTALL.md) para o passo a passo completo.

~~~
# 1) cria o teu repositório PRIVADO de criador no GitHub e clona-o
# 2) instala a skill dentro dele
git submodule add https://github.com/<utilizador>/creator-agent .claude/skills/creator-agent
# 3) cria a estrutura
bash .claude/skills/creator-agent/scripts/init-creator-repo.sh .
# 4) abre o Claude Code nesse repositório e escreve
/creator-agent
~~~

## Uso

| Comando | O que faz |
| --- | --- |
| `/creator-agent` | Deteta o estado e propõe a próxima ação (primeira vez: onboarding) |
| `/creator-agent proximo` | Diz o que publicar a seguir e propõe 3 ideias |
| `/creator-agent pesquisa` | Pesquisa de referências do nicho |
| `/creator-agent roteiro <pasta>` | Guião e roteiro de gravação |
| `/creator-agent intake <pasta>` | Valida os vídeos gravados |
| `/creator-agent editar <pasta>` | Plano de edição e edição |
| `/creator-agent agendar <pasta>` | Adaptações por plataforma e calendário |
| `/creator-agent analisar` | Métricas e aprendizagens |

## Estrutura do teu repositório (privado)

Ver `SKILL.md`. Cada vídeo fica em `videos/AAAA-MM-DD_slug/` com `README.md` (versões), `brief`, `guiao`, `roteiro`, `plano-edicao`, `gravados/`, uma pasta por versão (`v1/`, `v2/`…), `trabalho/` e `adaptacoes/<plataforma>.md`.

## Privacidade

Esta repositório (a skill) é público e não contém dados de nenhum criador. Os teus vídeos, estratégia e métricas ficam no **teu** repositório privado. Nunca guardes chaves ou tokens em ficheiros.

## Limites honestos

- Pesquisa depende do que a web e as tuas ligações permitem. Instagram e TikTok bloqueiam leitura automática; nesse caso o agente pede links, capturas ou exportações.
- Não promete resultados. Aprende com padrões, não garante virais.
- Edição automática de qualidade exige FFmpeg, Whisper e, para motion graphics, HyperFrames. O agente avisa o que falta.
- Vídeos grandes pedem Git LFS (quota gratuita limitada) ou outro armazenamento.

## English (short)

Creator Agent is an open-source Claude Code skill for beginner creators. It interviews you (goals, niche, offer, gear), researches reference creators and outlier videos in your niche, builds a TOFU/MOFU/BOFU funnel and posting schedule, writes scripts and shoot guides (shots, lighting, audio), validates your footage, edits with captions and motion graphics, adapts each piece per platform and learns from your analytics. Install per INSTALL.md. Default language follows the creator; the bundled prompts are in European Portuguese and can be translated via pull request.

## Contribuir e licença

Ver [CONTRIBUTING.md](CONTRIBUTING.md). Licença MIT.
