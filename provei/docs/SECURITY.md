# Segurança — checklist

- [x] RLS ativa em todas as tabelas `public` (teste automático `toda a tabela pública tem RLS ativa`).
- [x] Testes de isolamento: restaurante A não lê nem escreve em B; utilizador só lê o seu feedback privado; anónimo não escreve; staff não altera plano.
- [x] Colunas sensíveis protegidas por `GRANT UPDATE (colunas)`.
- [x] Zod em todas as Server Actions e route handlers; mensagens de erro em pt-PT sem vazar detalhes.
- [x] Cabeçalhos: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy (`next.config.mjs`).
- [x] CSRF: Server Actions do Next verificam `Origin`; cookies de sessão `SameSite=Lax`.
- [x] Rate limiting: autenticação (Supabase), entrada em mesa, chamadas, resgates, uploads, denúncias, exportação.
- [x] Uploads: MIME real pelos bytes, tamanho, duração, nomes gerados no servidor, URLs assinados com expiração.
- [x] Tokens de mesa: HMAC, 5 min, uso único (`jti`), limitação por IP/utilizador.
- [x] Auditoria de ações sensíveis; IP só como hash com sal diário.
- [x] Sem `dangerouslySetInnerHTML` com conteúdo de utilizadores (único uso: JSON-LD gerado por nós, com `<` escapado). Texto de utilizadores é sanitizado (`sanitizeText`) e renderizado como texto.
- [x] Sem rastreadores de terceiros; analytics próprio.
- [x] RGPD: consentimentos versionados e revogáveis, exportação JSON, apagamento lógico + job de remoção (`ACCOUNT_RETENTION_DAYS`), anonimização de analytics aos 13 meses.
- [x] Stripe: webhook assinado e idempotente; chaves live bloqueadas por omissão.
- [ ] Revisão jurídica dos textos (modelos marcados).
- [ ] Teste de penetração / revisão externa antes de abrir ao público.
- [ ] Ativar MFA nas contas Supabase, Vercel, GitHub e Stripe do dono.
- [ ] Rodar a chave `service_role` se alguma vez for exposta.
