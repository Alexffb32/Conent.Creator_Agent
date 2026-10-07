# Ligações (conectores) e exportações

O agente funciona sem ligações: pede exportações. Com ligações, personaliza mais.

| Fonte | Para quê | Como |
| --- | --- | --- |
| Instagram (conta profissional) | Audiência (idade, país, horas ativas), desempenho de posts | Conector do Claude para Instagram se existir na tua conta, ou API oficial do Instagram, ou exportar insights |
| YouTube | Retenção, tráfego, audiência, vídeos principais | Conector, ou YouTube Data API e Analytics (chave tua), ou exportar do YouTube Studio |
| Calendário (Google) | Lembretes de gravação e publicação | Conector do Claude |
| Design (Canva, Figma) | Miniaturas e capas | Conector do Claude |
| Newsletter (Beehiiv e outras) | Fundo de funil | Conta tua e chave em `.env` |
| DM por comentário (ManyChat e outras) | CTA por palavra-chave | Conta tua, consentimento do utilizador |

Como verificar: `claude mcp list` e `/mcp`. Não inventes URLs de MCP: procura a documentação oficial do serviço. Segredos só em variáveis de ambiente, nunca em ficheiros versionados.
