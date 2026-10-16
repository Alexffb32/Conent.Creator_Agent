# Ferramentas instaladas (2026-10-09)

Código lido antes de instalar. Versões: task-observer 3.5.0, claude-code-setup 1.0.0, claude-mem 13.35.0, headroom 0.40.0.

| Ferramenta | O que faz | Onde ficou | Estado e limites |
| --- | --- | --- | --- |
| task-observer (rebelytics, CC BY 4.0) | Regista o que corriges e propõe melhorias às skills, para tu aprovares. Não altera skills sozinho | Plugin; declarado no `.claude/settings.json` deste repositório | Ativo. Só tem efeito se for carregado nas sessões (instrução no `CLAUDE.md` do estúdio) e o registo (`skill-observations/`) tem de ficar numa pasta estável: numa sessão na nuvem o disco perde-se, por isso guarda o registo no estúdio e faz commit |
| claude-code-setup (Anthropic) | Lê o repositório e recomenda hooks, skills, subagentes e servidores MCP. Só lê, não cria ficheiros | Plugin; declarado no `.claude/settings.json` | Ativo |
| claude-mem (thedotmack, Apache 2.0) | Memória entre sessões: hooks em cada pedido e ferramenta, um processo em segundo plano (bun) e uma base local; resume as sessões com um modelo | Plugin; declarado no `.claude/settings.json` do estúdio privado (não do repositório público, para não ativar nos outros) | Instalado. Telemetria anónima (PostHog) vem LIGADA por defeito: desliguei com `DO_NOT_TRACK=1`, `CLAUDE_MEM_TELEMETRY=0` e `CLAUDE_MEM_TELEMETRY_ERRORS=0`; redação automática ligada; início de sessão sem conta (`CLAUDE_MEM_ONLINE_OPTIN=false`); fornecedor `claude` (usa a quota do plano). Não arranquei o processo nesta sessão. Sincronização na nuvem (cmem.ai) desligada. Duplica o nosso diário de estilo (`estilo/`): a memória oficial do Alex continua a ser o `estilo/feedback.csv` |
| headroom (chopratejas, Apache 2.0) | Comprime saídas de ferramentas e logs antes de chegarem ao modelo, num proxy local | Plugin (hooks de arranque) e o programa `headroom-ai` 0.40.0 num ambiente virtual neste ambiente | Os hooks do plugin só chamam `headroom init hook ensure`, que não faz nada enquanto não for inicializado. NÃO inicializei (`headroom init claude` / `wrap claude`): redireciona o tráfego do Claude para um proxy local, o que numa sessão na nuvem pode partir a ligação. Serve para o computador do Alex, não para a nuvem. Os 60 a 95 % de poupança são números do próprio projeto |

## Duas coisas importantes
1. Os plugins instalados nesta sessão ficam em `~/.claude` do ambiente temporário. O que persiste é o que está declarado nos `settings.json` dos repositórios, que o Claude Code lê em cada sessão nova.
2. Para os usar no computador do Alex: `claude plugin install claude-mem@thedotmack`, `claude plugin install headroom@headroom-marketplace` (depois `uv tool install headroom-ai` e `headroom wrap claude`), pondo antes as variáveis de telemetria acima.
