# SOP de conteúdo: Alex (alexffb)

O manual que qualquer editor (o agente, ou uma pessoa que venhas a contratar) segue para produzir o teu conteúdo sem te perguntar nada. Tu és o **diretor**: decides o que se diz e aprovas cada versão. O **editor** executa. Tudo vem de `estilo/estilo-criador.md`, `estilo/estilo-edicao.md` e `estrategia/sistema-design.md`; se mudar lá, muda aqui. "Por decidir" = o editor não inventa, pergunta uma vez.

## 1. Tipos de conteúdo
| Tipo | Fase do funil | Duração | Plataformas | Estado |
| --- | --- | --- | --- | --- |
| Reel ou short a falar para a câmara, sentado no sofá, com motion | topo e meio (série "Erro da semana" e "Como decido") | 20 a 50 s (hipótese: 20 a 40 s; o primeiro tem 50,8 s) | Instagram Reels, YouTube Shorts | em produção |
| Reel com um caso real ou demonstração | fundo (série "Perfil por perfil") | por decidir | Instagram | só quando houver caso autorizado |
| Carrossel | meio | por decidir | Instagram | por decidir |
| Vídeo longo | por decidir | por decidir | YouTube | por decidir |
| Stories | fundo | por decidir | Instagram | por decidir |

## 2. Estrutura do short
- Gancho (0 a 3 s): painel de vidro com o problema que dizes na primeira frase, escrito e dito ao mesmo tempo (ex.: "O teu outreach não funciona?").
- Corpo: o problema em 3 exemplos reais (cena de notificações), o método ou a prova (cena de pesquisa, mosaicos), uma só ideia.
- CTA: um só, dito na voz e mostrado numa notificação. Hoje: "manda-me mensagem ou escreve nos comentários".
- Frame final: logo com borda, botão, @alexffb_, 2 s.

## 3. Aspeto
- Legendas: estilo `iman`, Montserrat Light para Bold, minúsculas, brancas, 60 px, até 5 palavras e 24 caracteres por linha.
- Tipografia: Montserrat (800 títulos, 500 a 700 corpo); Instrument Serif Italic para 1 a 3 palavras de destaque por peça.
- Cores: fundo #000000, superfície #222222, texto #FFFFFF, secundário #B3B3B3, acento #FF2E00 (único).
- Componentes que usa: gancho em vidro, notificações iOS, browser com cursor, mosaicos, lower third com o asterisco, remate em serif, CTA em notificação. Evita: barra de progresso, cenas de ecrã inteiro além de 2 por vídeo.
- Movimento: leve; zoom de entrada no gancho e 3 a 4 pushes lentos; nunca zoom em cada corte.
- Texto no ecrã: português europeu, sem travessões, sem emojis.
- Capa: o fotograma do gancho com o texto completo (por volta de 1,9 s).

## 4. Som
- Voz: sem eco (dereverb), EQ, compressor, -14 LUFS na mistura final.
- Música: piano e cordas, 80 BPM, -23 LUFS com ducking.
- SFX: os teus sons em `assets/sons/` (Pop, Swish Whoosh, Bell Ding, Keyboard Typing, Click, Metallic Riser, Bass Impact), 15 a 27 dB abaixo da voz, no máximo um sino por vez. Nunca sons de meme.

## 5. Regras duras
- Enviar sempre o vídeo no chat (cópia 1080x1920 com menos de 30 MB), além do repositório.
- Sem travessões em nenhum texto do ecrã.
- Todo o texto no ecrã em português europeu.

## 6. Entrega
- Pasta por versão `vN/` com vídeo, `capa.png`, `qa.jpg`, `qa.json` e `config.json`; commit só dessa pasta, `vN - o que mudou`; depois não se mexe.
- O `pipeline.py exportar` recusa a versão se o QA automático falhar.
- Tu aprovas no chat; cada correção vira regra (`scripts/registar-feedback.py`).

## 7. Publicação
- Hora fixa: por decidir (◆ decisão tua). Proposta para testar, em hora de Lisboa: almoço (12h a 13h), fim da tarde (18h a 19h) e noite (20h a 21h), 2 a 3 semanas cada, e decide-se pelos teus Insights.
- Dias: por decidir (hipótese: 3 curtos por semana mais stories, ver `estrategia/estrategia.md`).
- Legenda, hashtags e primeiro comentário em `adaptacoes/<plataforma>.md`; o agente prepara, tu publicas ou aprovas o agendamento.

## 8. Quem faz o quê
| Papel | Quem | Faz |
| --- | --- | --- |
| Diretor | Alex | Escolhe a ideia entre as 3 propostas, aprova guião e versão, grava, decide a oferta e a hora de publicação, responde às mensagens |
| Produtor e estratega | agente | Audita o histórico, propõe o próximo vídeo, prepara guião, roteiro, listas e calendário |
| Editor | agente | Corta, legenda, anima, mistura o som, exporta com QA automático, regista o feedback |
| Editor humano (se um dia contratares) | pessoa | Segue este SOP e as listas; o repositório é a passagem de testemunho |
