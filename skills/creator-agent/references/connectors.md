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

## Skills opcionais de terceiros

Código de terceiros: lê-o antes de instalar, não o metas dentro da pasta de um criador e nunca guardes chaves em ficheiros versionados.

| Skill | Para quê | Instalação |
| --- | --- | --- |
| [instagram-skills](https://github.com/sergebulaev/instagram-skills) (MIT, em inglês) | Legendas com gancho nos primeiros 125 caracteres, carrosséis, hashtags (3 a 5), planeamento semanal, auditoria de perfil | Plugin: `claude plugin marketplace add sergebulaev/instagram-skills --scope project` e `claude plugin install instagram-skills@instagram-skills --scope project`. Usa só o modo rascunho (as partes Publora e Apify são opcionais e pedem chaves). As legendas saem em `videos/<pasta>/adaptacoes/instagram.md`, em português europeu e sem travessões. |
| [OpenMontage](https://github.com/calesthio/OpenMontage) (AGPLv3, em inglês) | Análise de vídeos de referência (cenas, ritmo, transcrição, níveis de áudio) e produção com geração de clips por IA, que precisa de chaves de API pagas | Fora deste repositório, por causa da licença AGPLv3 e do tamanho (cerca de 90 MB): clonar, `python3 -m venv .venv`, `.venv/bin/pip install -r requirements.txt` e `npm install --ignore-scripts` em `remotion-composer/`. As ferramentas locais (`tools/analysis/`) funcionam sem chaves. A edição dos shorts do criador continua a ser feita pelo `pipeline.py` deste agente. |
