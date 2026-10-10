# Estilo híbrido: Iman Gadzhi + Nik Setting

Estado: HIPÓTESE (2026-10-09). O Iman e o Nik não têm a edição medida (ver as fichas de cada um). Esta mistura combina o que está visto nas páginas deles com o que um criador já aprovou na edição à Iman (v3 a v5). Testa-se com 3 a 5 vídeos e corrige-se com o feedback e os dados.

## A ideia
Estrutura e conteúdo do Nik (resultado concreto, método em passos, caso real, conversa por DM). Acabamento visual e ritmo do Iman (legendas, motion em vidro, SFX leves, grão). Português europeu informal, em primeira pessoa, só com números reais.

| Camada | De quem | Como aplicar |
| --- | --- | --- |
| Gancho | Nik + Iman | Resultado ou problema concreto na primeira frase, sem prazo nem dinheiro inventados ("Mandas emails e ninguém responde. O problema não é o email."). Título com prazo e promessa só quando for verdade e demonstrável. |
| Estrutura | Nik | Problema, método em 2 ou 3 passos, prova (caso real com autorização) e um passo seguinte. Arco: parecia bem, o problema escondido, o ajuste, o sistema. |
| Prova | Nik | "Perfil por perfil" ou "antes e depois" de um trabalho real; sem caso confirmado, demonstra o processo e não prometas resultados. |
| CTA | Nik | Um só, por palavra-chave respondida à mão ("comenta SITE e envio-te a checklist"), ou mensagem direta. Nunca automatizar sem confirmar as regras da Meta. |
| Edição | Iman | Legendas `iman`, motion em vidro leve, 1 a 2 cenas de grelha, SFX leves, música baixa, grão leve. |
| Tom | Alex | Direto, ambicioso e educativo; sem gíria de guru, sem montras de riqueza. |

## Tradução para o `compor.py`
`gancho` (painel com a promessa), `numero` (só com número real), `lista` (método em passos), `mosaicos` ou `notificacoes` (antes e depois, respostas de clientes só se autorizadas), `cta` em notificação com a palavra-chave, frame final com handle.

## Como testar
1. Alterna 3 vídeos de topo (Erro da semana), 1 de meio (Como decido) e 1 de fundo (Perfil por perfil).
2. Compara retenção aos 3 s, envios, guardados e mensagens qualificadas por vídeo (`historico/posts.csv`).
3. Cada correção do criador vai para o diário (estágio 10).
