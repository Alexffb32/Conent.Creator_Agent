# Estado do Provei

Atualizado em 2026-10-10. Ramo: `claude/provei-mvp-build-dd5k5o`.

## Verificado (corrido nesta sessão)
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: passam.
- `packages/domain`: 30 testes, cobertura 100 % (limiar 80 %).
- `pnpm test:rls`: 41 testes de RLS num Postgres embebido (PGlite) com as migrações reais (isolamento entre restaurantes, dados privados, anónimo sem escrita, ledger imutável, limites do plano, flags).
- Migrações aplicadas no projeto Supabase `provei` (UE) e advisors de segurança tratados (ver DECISIONS).
- Webhook Stripe idempotente testado com um armazém em memória; deteção de tipo real de ficheiros testada.

## Escrito mas ainda NÃO executado contra um backend real
Falta apenas a chave `SUPABASE_SERVICE_ROLE_KEY` (a ligação de ferramentas só dá a chave pública):
- E2E Playwright 1 a 7, teste de viewports 360/390/768/1440 + `axe` + alvos de toque (`apps/web/tests/e2e`).
- Testes de integração anti-abuso (token de uso único, limites de chamadas, carimbo duplicado) em `apps/web/tests/integration`.
- `pnpm seed` (12 restaurantes fictícios, 40 pratos, 20 utilizadores, 3 campanhas).
Com a chave em `apps/web/.env.local` correm com `pnpm seed`, `pnpm test` e `pnpm test:e2e`.

## Depende de ti (ver README, secção "O que só tu podes fazer")
1. Chave `service_role` do Supabase (Settings > API) para seed, e2e e produção.
2. Criar o projeto na Vercel (a API devolveu 403): importar o repositório, root `provei/apps/web`.
3. Supabase Auth: Site URL, Redirect URLs e modelo de e-mail do link mágico (token_hash); SMTP Resend.
4. Stripe em modo de teste: `pnpm tsx scripts/stripe-setup.ts` com a chave de teste.
5. Resend: chave e remetente. Domínio próprio com SPF/DKIM/DMARC (registos abaixo).
6. Chaves VAPID para push; credenciais Apple/Google para Wallet.
7. Domínio (provei.pt/.eu), conta Apple Developer, revisão jurídica dos textos, pesquisa INPI/EUIPO.

### Registos DNS para e-mail (quando houver domínio)
SPF `v=spf1 include:amazonses.com ~all` (valor exato fornecido pela Resend), DKIM (3 CNAME da Resend), DMARC `v=DMARC1; p=none; rua=mailto:dmarc@teu-dominio`.

## Em falta ou simplificado
- **Pedidos e pagamento na mesa (`table_ordering`)**: só modelo de dados e RLS; sem interface. Flag desligada.
- **Apple Wallet**: deteção de credenciais e botão prontos; geração do `.pkpass` assinado por ligar (precisa do certificado). Google Wallet: JWT "Save to Google Wallet" implementado, não testado sem credenciais.
- **Atualização de pontos na Wallet** (push de atualização): não implementada.
- **Mux/Cloudflare**: adaptadores e webhook escritos, não testados sem contas. Em `local` o mp4 é servido tal como veio (sem poster nem 720p).
- **Retenção por segundo**: depende de vídeos reais; o seed inclui um vídeo-marcador de 8 s.
- **Banners de fotos nas avaliações**: o modelo suporta foto, o formulário ainda não tem upload de foto de avaliação.
- **Rate limiting com Redis**: previsto, não ligado.
- **Fase 9 (app iPhone)**: só esqueleto em `apps/mobile` (ver `docs/MOBILE.md`), não corrido nem testado.
- **Tipos do Supabase**: o cliente está sem tipos gerados (`any` nas respostas); gerar com `supabase gen types` quando houver CLI.
- **Cobrança real**: nunca ativada. Só modo de teste.

## Riscos técnicos
1. O fluxo da mesa e as chamadas em tempo real dependem de Realtime com RLS; foi desenhado com sondagem de reserva (8–10 s), mas precisa de teste em restaurante real.
2. Vídeo: sem transcodificação, vídeos pesados em 4G vão ser lentos. Precisa de Mux/Cloudflare antes do piloto.
3. Escritas sensíveis usam `service_role` no servidor; um erro de autorização numa Server Action seria grave. Mitigação: `requireMemberForAction` em todas, testes de RLS e e2e.
