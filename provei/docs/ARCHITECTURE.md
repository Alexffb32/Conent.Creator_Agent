# Arquitetura

```
apps/web         Next.js 15 (App Router) PWA, pt-PT, mobile first
apps/mobile      Expo + React Native (esqueleto, fase 9)
packages/domain  Regras puras TS (pontos, níveis, limites, ordenação, tokens). Sem React/Next/Node.
packages/api-client  Schemas Zod + tipos partilhados
packages/config  Tokens da marca (JSON + CSS) e preset Tailwind
supabase         Migrações, config local, testes de RLS (PGlite)
```

## Fluxos principais
- **Autenticação**: link mágico (e Google opcional). `/auth/callback` (PKCE) e `/auth/confirm` (token_hash, funciona noutro dispositivo). O middleware renova a sessão.
- **Feed**: `getFeed` (servidor) lê candidatos recentes com RLS, ordena com `packages/domain/feedRank`, insere anúncios e devolve página + cursor. O cliente regista progresso de vídeo por segundo em lotes de 5 s (`/api/analytics/watch`).
- **Upload**: `requestUpload` valida e devolve URL assinado; o browser envia direto para o Storage; `finalizeUpload` confirma o tipo real pelos bytes e chama o `VideoProcessor`; `createPost` publica.
- **Mesa**: `/t/[code]` emite token assinado (5 min) → `enterTable` troca-o por sessão (jti de uso único) → `/mesa`. Chamadas passam por `createWaiterCall` (regras do domínio + índice único). A equipa vê a fila por Realtime (com sondagem de reserva).
- **Visita e fidelização**: `recordVerifiedVisit` aplica regras do domínio, grava visita, carimbo e pontos (idempotentes), emite resgate e atualiza níveis.
- **Cobrança**: Checkout Stripe → webhook assinado e idempotente → `processStripeEvent`. Sem Stripe, o admin ativa o plano à mão (auditado).
- **Flags**: `feature_flags` + `restaurant_flags`; lidas por `getFlags`.

## Link mágico por token_hash
Modelo de e-mail (já em `supabase/templates/magic_link.html`): o botão aponta para `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/`. No Supabase cloud cola-se este modelo em Authentication > Email Templates > Magic Link.
