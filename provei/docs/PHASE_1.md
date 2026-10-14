# Fase 1 · Contas e fundações (ADENDA 2)

Data: 2026-10-14 · Migração: `supabase/migrations/20261014000011_roles_rbac.sql` (aplicada no Supabase `provei`).

## Feito
- **Quatro tipos de conta**: cliente (sempre), restaurante (`restaurant_members`), anunciante (`advertisers`, `advertiser_members`), admin (`profiles.is_admin`). Um e-mail pode ter vários. `public.user_roles(uid)` e hook `custom_access_token_hook` (claim `app_roles`).
- **Papéis no restaurante**: owner, manager, kitchen, waiter, com navegação do painel por papel (cozinha vai para `/cozinha`, sala para a fila). Convites com papel.
- **RLS**: isolamento por restaurante e por papel; anunciante sem acesso a dados pessoais; admin só com `aal2`.
- **Admin com MFA** (TOTP) em `/mfa`; e2e do admin atualizado (gera TOTP, verificado contra o vetor do RFC 6238).
- **Flags** da ADENDA 2 criadas e desligadas: `ordering`, `kds`, `whatsapp`, `review_requests`, `coupons`, `analytics`, `ai_advisor`, `recommender`, `kitchen_forecast` (+ `ads`, que já existia). Hook `useFlag()` no cliente.
- **`feed_events`** com `impression_id`, endpoint `POST /api/feed/events` (só com conta + `recommender` + consentimento), retenção 180 dias, "Repor personalização".
- **Consentimentos** alargados: `personalization`, `whatsapp_utility`, `whatsapp_marketing`, `email_marketing`.
- **Onboarding de anunciante** em `/anunciante` (atrás da flag `ads`).
- `audit_logs` (já existia) regista as ações novas.

## Testes
- RLS (PGlite com as migrações reais): 54 testes, incluindo 9 novos de F1 (admin sem MFA, manager vs waiter vs kitchen, restaurante A vs B em todos os papéis, anunciante sem dados pessoais, `feed_events` próprios, papéis derivados e claim do JWT).
- Unitários, lint, tipos e build: verdes.

## Falta / depende do dono
- **Ativar o hook** no painel Supabase: Authentication › Hooks › Custom Access Token → `public.custom_access_token_hook`. Sem isto a claim `app_roles` não aparece (a RLS não depende dela).
- **Ativar MFA TOTP** no Supabase (Authentication › Sign In / Providers › Multi-Factor: TOTP ligado; já vem ligado por omissão em projetos novos [VERIFY]).
- Preview na Vercel: bloqueado (403), ver `docs/STATUS.md`.
- Com todas as flags desligadas o produto base comporta-se como antes (verificado pelos testes de RLS de flags e pelo build).
