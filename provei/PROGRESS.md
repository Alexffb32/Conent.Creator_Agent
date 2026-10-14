# PROGRESS

## Feito
- MVP técnico (fases 1–8): ver docs/STATUS.md.
- Supabase `provei` (Frankfurt): 10 migrações, RLS endurecida, seed fictício.
- Design system com as seis decisões; tokens de profundidade e contraste; corrigida colisão de tokens de raio.
- PT/EN nas vistas públicas do cliente final.
- Landing /para-restaurantes com pedido de visita.
- Pacote legal (aviso legal, privacidade, cookies, termos com DSA, denúncias, livre resolução) com [VERIFY]/[MISSING].
- SEO técnico (sitemap, robots, OG, JSON-LD, hreflang).
- Auditoria final: axe, toque, overflow, Lighthouse, cabeçalhos, pnpm audit, revisão independente com correções.

## A seguir
- Deploy na Vercel e repetir Lighthouse em produção (LCP).
- E2E Playwright e integração anti-abuso com a `service_role`.

## Bloqueado (dono: Alex)
- Chave `service_role` do Supabase → formulários públicos, admin, e2e e ações de servidor em produção.
- Projeto Vercel (API devolveu 403) → deploy.
- NIF e morada do ENI → aviso legal, privacidade e termos.
- Revisão jurídica (LEGAL.md "Pontos por confirmar").
