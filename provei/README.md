# Provei

Rede social de restaurantes: pratos em vídeo e foto num feed, entrada na mesa por QR/NFC, chamar empregado, pontos e cartão de fidelidade. PWA em pt-PT, mobile first. Covilhã e Fundão.

> Estado detalhado em [`docs/STATUS.md`](docs/STATUS.md). Decisões em [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Arrancar (5 comandos)
```bash
cd provei
pnpm install
cp apps/web/.env.example apps/web/.env.local   # preencher Supabase (ver abaixo)
pnpm seed                                      # dados fictícios (precisa de SUPABASE_SERVICE_ROLE_KEY)
pnpm dev                                       # http://localhost:3000
```
Sem variáveis o site arranca e mostra um aviso. Requisitos: Node 20+ e pnpm 9.

### Supabase
- **Cloud** (já criado): projeto `provei` (`ivzzkexfvzvmnyppaxnj`, Frankfurt). Em *Settings > API* copia o URL, a chave `anon` e a chave `service_role` para `apps/web/.env.local`:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Gera `TABLE_TOKEN_SECRET` e `CRON_SECRET` com `openssl rand -hex 32`.
- **Local** (precisa de Docker): `supabase start` aplica `supabase/migrations`; e-mails de teste em http://127.0.0.1:54324.

## Testes
```bash
pnpm lint && pnpm typecheck && pnpm test   # regras, schemas, webhook; +integração se houver backend
pnpm test:rls                              # políticas RLS (Postgres embebido, sem Docker)
pnpm test:e2e                              # Playwright; precisa de backend e SUPABASE_SERVICE_ROLE_KEY
```
Contra um deploy: `E2E_BASE_URL=https://....vercel.app pnpm test:e2e`.

## Publicar (Vercel + Supabase)
1. Vercel > *Add New Project* > importa o repositório. **Root Directory:** `provei/apps/web`. Framework: Next.js.
2. Variáveis de ambiente (Production e Preview): as de `apps/web/.env.example` (mínimo: Supabase ×3, `NEXT_PUBLIC_SITE_URL`, `TABLE_TOKEN_SECRET`, `CRON_SECRET`).
3. Supabase > *Authentication > URL Configuration*: Site URL = URL da Vercel; Redirect URLs = `https://<url>/auth/callback` e `/auth/confirm`.
4. Supabase > *Authentication > Email Templates > Magic Link*: colar `supabase/templates/magic_link.html`.
5. Supabase > *Authentication > SMTP*: Resend (`smtp.resend.com`, porta 465, utilizador `resend`, palavra-passe = chave Resend).
6. Cron: `vercel.json` já agenda `/api/jobs/maintenance` (diário).
7. `pnpm seed` uma vez com a chave de serviço para teres dados de demonstração.

### Stripe (modo de teste)
`STRIPE_SECRET_KEY=sk_test_... pnpm --filter @provei/web tsx scripts/stripe-setup.ts` cria produtos/preços e o portal e imprime as variáveis. Liga a flag `payments` em `/admin/flags`. Webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## O que só tu podes fazer
Ver a lista por ordem de importância em [`docs/STATUS.md`](docs/STATUS.md).

## Estrutura
Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Guião de demonstração: [`docs/DEMO.md`](docs/DEMO.md). Segurança: [`docs/SECURITY.md`](docs/SECURITY.md). App iPhone: [`docs/MOBILE.md`](docs/MOBILE.md).
