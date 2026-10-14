# Provei — memória do projeto (Claude Code)

Produto próprio da Aeternus Progressus (dono: Alexandre Bento, ENI). Rede social de restaurantes da Covilhã e Fundão: feed de pratos só de restaurantes, mesa por QR/NFC, chamar empregado, fidelização. PWA pt-PT (+ EN nas vistas públicas do cliente final).

## Ao retomar
Ler por esta ordem: `PLAN.md`, `PROGRESS.md`, `LEGAL.md`, `SDKS.md`, `ASSETS.md`, `CLAIMS.md`, `docs/STATUS.md`, `docs/DECISIONS.md`.

## Comandos
```
pnpm install            # Node 20+, pnpm 9
pnpm dev                # apps/web em http://localhost:3000 (precisa de apps/web/.env.local)
pnpm lint && pnpm typecheck && pnpm test && pnpm test:rls && pnpm build
pnpm test:e2e           # Playwright; precisa de SUPABASE_SERVICE_ROLE_KEY
node apps/web/scripts/audit-ui.mjs / /descobrir   # screenshots + axe + alvos de toque (BASE=http://localhost:3000)
```
Supabase cloud: projeto `ivzzkexfvzvmnyppaxnj` (Frankfurt). Migrações em `supabase/migrations`, seed em `supabase/seed.sql`.

## Regras do projeto
- Lógica de negócio em `packages/domain` (TS puro, sem React/Next/Node). Tokens da marca em `packages/config`.
- Texto visível em pt-PT direto e caloroso (EN onde houver dicionário). Código em inglês.
- RLS em todas as tabelas; escritas sensíveis só por Server Actions que autorizam no servidor.
- Feature flags (`feature_flags`/`restaurant_flags`); a app arranca sem chaves externas.
- Nunca segredos no repositório. Stripe só em modo de teste.

## Regras AP (resumo das secções 2–14 do prompt AP)
- Uma página = um objetivo e um CTA. Ações com verbo + objeto ("Pedir visita", nunca "Enviar").
- Seis decisões em cada componente: alvos ≥ 44 px (48 em botões), texto ≥ 16 px, contraste ≥ 4.5:1 (texto) e 3:1 (UI/foco), luz de cima/sombra para baixo, um destaque por ecrã, feedback < 100 ms e reduced-motion.
- Movimento da marca Provei: 150/250/400 ms ease-out (decisão sobre o genérico AP).
- Nada inventado: sem números, testemunhos ou prova falsa; cada afirmação em `CLAIMS.md`; [MISSING: …] quando falta conteúdo.
- Legal PT/UE: identificação do prestador (DL 7/2004), Livro de Reclamações, RAL (Lei 144/2015), RGPD/Lei 58/2019, cookies (Lei 41/2004), DSA (avaliações), DL 24/2014 (assinatura), DL 57/2008 (sem escassez falsa). Pesquisar sempre a versão em vigor e registar em `LEGAL.md`. Marcar [VERIFY]; revisão por jurista antes de publicar.
- Terceiros só com finalidade nomeada e listados em `SDKS.md`; fontes auto-alojadas; mapa por clique.
- Ativos com origem e licença em `ASSETS.md`. Fotos reais dos restaurantes com autorização escrita.
- Desempenho: Lighthouse mobile ≥ 90, LCP ≤ 2,5 s, CLS ≤ 0,1, JS ≤ 200 kB nas landings.
- SEO: sitemap, robots, canonical, um H1, OG 1200×630, JSON-LD validado, hreflang PT/EN.
- Contas e domínios em nome do dono; AP como colaborador.
- "Feito" = verificado (build, testes, screenshots 360/1440, axe).
