# Estratégia: Alex (alexffb)

Objetivo: marca e autoridade para conseguir clientes de presença digital | Oferta: serviço de presença digital (site, marca pessoal, redes) | Cadência: por confirmar (hipótese: 3 vídeos curtos por semana) | Última revisão: 2026-10-09

Tudo o que está marcado "assumido" ou "hipótese" ainda não foi confirmado pelo Alex nem pelos dados dele. A base é `biblioteca/pesquisa/funil-estrategia.md` do agente: não existe estudo que prove uma divisão ideal entre topo, meio e fundo, por isso os alvos corrigem-se com o histórico real (`historico/posts.csv`).

## Audiência
- Atual: por confirmar (preciso dos Insights do Instagram: seguidores, % que são donos de negócio, alcance a não seguidores).
- Alvo (assumido): donos de negócio e quem faz prospeção (emails, chamadas, DMs) e não recebe resposta.
- Se os seguidores atuais forem sobretudo outros criadores ou jovens e o alvo forem donos de negócio, o agente reduz os temas que atraem a audiência errada e testa 3 posts no tema do alvo, medindo por seguidores-alvo ganhos e não por gostos.

## Funil para este criador
| Fase | Formatos | Séries | Ação ou oferta | Métrica principal |
| --- | --- | --- | --- | --- |
| Topo | Reel de 20 a 40 s, a falar para a câmara, uma só ideia | Erro da semana | Seguir, guardar ou enviar a quem tem o problema | Alcance a não seguidores, retenção aos 3 s, envios |
| Meio | Carrossel que se guarda, Reel com demonstração do processo | Como decido (como avalio um perfil, um site ou um email) | Comentar uma palavra para receber um recurso (checklist) por mensagem | Guardados e envios por alcance, comentários, visitas ao perfil |
| Fundo | Reel com um caso real (só com autorização e resultado confirmado), stories | Perfil por perfil (antes e depois de um trabalho real) | Mensagem direta ou marcar conversa | Mensagens qualificadas, pedidos de proposta |

Provas confirmadas: nenhuma ainda (`creator.md`). Enquanto não houver casos, o fundo é demonstrar o processo e convidar para uma conversa (por exemplo, "manda-me o teu perfil e digo-te o primeiro ajuste"), nunca prometer resultados.

## Mix alvo
mix: 60/25/15
(hipótese: objetivo "marca e autoridade" daria 50/35/15; ajustado para mais topo porque a audiência atual é provavelmente pequena. Rever quando houver o histórico e os Insights.)

## Pilares
1. Presença digital para quem faz prospeção (o tema do vídeo "presença digital").
2. Marca pessoal.
3. Bastidores e processo (como se faz um site ou um perfil).
4. Casos e resultados (só depois de haver casos confirmados).

## Séries
1. Erro da semana (topo).
2. Como decido (meio).
3. Perfil por perfil (fundo, quando houver trabalho real a mostrar).

## Regras
- Nunca dois posts de fundo seguidos; nunca 3 de topo seguidos.
- Pelo menos um fundo por semana de 7 dias (regra de bolso, hipótese).
- Um vídeo = uma ideia = um CTA.
- Sem travessões, texto no ecrã em português europeu, vídeo enviado sempre no chat (ver `estilo/estilo-criador.md`).
- Antes de cada vídeo novo o agente audita o que já foi publicado (`scripts/proximo-post.py --raiz alexffb --escrever`) e sugere a fase, a série e o formato seguintes.

## Growth inspirado no Nik Setting (hipóteses, confiança baixa a média)
Fonte: `biblioteca/pesquisa/nik-setting-growth.md`. O Nik fala a coaches e infoprodutores com margens altas e equipas de setters; o Alex vende a negócios que ainda não conhecem o serviço. Transpõe-se o método, não a escala nem a retórica de dinheiro. Nada do que ele alega de receita serve de meta.

Ações por ordem (as marcadas ◆ dependem de uma decisão do Alex):
1. ◆ Posicionamento numa frase: para quem és (o tipo de negócio) e que problema resolves. Hoje o alvo é "donos de negócio e quem faz prospeção"; escolher um nicho concreto (por exemplo restauração, clínicas, ginásios, oficinas) torna o conteúdo, a bio e a prova mais fortes. O agente não decide isto por ti.
2. O perfil como funil: bio com para quem és, o resultado que entregas e um único passo seguinte (mensagem ou marcar conversa); 3 posts fixados (quem és, um caso ou processo, como trabalhas).
3. Meta de poucas conversas qualificadas por mês (ponto de partida: 3 a 5), medidas em `historico/dms.csv`, em vez de perseguir seguidores.
4. CTA por palavra-chave respondido à mão ("comenta SITE e envio-te a checklist"). Sem automação até confirmar as regras da Meta.
5. Lead magnet pequeno: uma checklist de uma página (por exemplo "o que o site de um [tipo de negócio] precisa") ou uma mini-auditoria de 5 pontos.
6. Fluxo de DMs registado em `historico/dms.csv` (novo, qualificado, conversa marcada, proposta, ganho ou perdido) e resposta em horas.
7. Outreach pontual e personalizado a poucos negócios por semana, com algo específico que observaste e a oferecer ajuda; para além do conteúdo enquanto a audiência é pequena. Antes de escalar, confirmar o RGPD e as regras de comunicações não solicitadas.
8. ◆ Uma oferta clara (site simples + perfil arranjado, preço fixo) e 2 a 3 primeiros clientes com testemunho e autorização para mostrar o caso. Sem casos, a prova é o processo; nunca prometer resultados.
9. Medir todos os meses: alcance dos Reels, comentários com palavra-chave, DMs iniciadas, conversas qualificadas, propostas, clientes.
10. Anúncios só depois de haver clientes e um conteúdo que já funciona.
11. ◆ Antes de faturar: confirmar com as Finanças a atividade aberta e os recibos.

## Sistema de produção (diretor e editor)
Papéis: o Alex é o diretor (escolhe a ideia, aprova, grava, decide a oferta e a hora); o agente é produtor e editor. O manual está em `estrategia/sop-conteudo.md` e as listas em cada vídeo (`checklist-pre-producao.md`, `checklist-pos-producao.md`).
Fluxo de cada vídeo: 1) ideia a partir de gente real (`historico/voz-do-cliente.csv`), 2) auditoria e escolha da fase (`proximo-post.py`), 3) lista de pré-produção, 4) gravar, 5) edição com QA automático, 6) lista de pós-produção (`checklist.py`), 7) publicar na hora fixa, 8) medir ao fim de 24 h e de 7 dias.
Para a ideia, o que falta (◆ do Alex): registar em `voz-do-cliente.csv` as perguntas, objeções e motivos que ouves em DMs, comentários e conversas de prospeção (com autorização de quem as disse), ou, quando houver clientes, os formulários de início e as chamadas.

