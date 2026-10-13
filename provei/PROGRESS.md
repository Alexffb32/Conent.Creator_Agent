# PROGRESS

## Feito
- MVP técnico (fases 1–8 do prompt de construção): ver docs/STATUS.md.
- Supabase `provei` (Frankfurt) com migrações, RLS endurecida e seed fictício aplicado (12 restaurantes, 40 pratos, 20 contas).
- App verificada localmente contra a base real: screenshots 360/390/768/1440, axe WCAG 2.2 AA e alvos de toque nas vistas públicas.
- Intake AP: ENI (Alexandre Bento), contacto ola@provei.pt provisório, PT + EN, landing /para-restaurantes.
- Pesquisa legal inicial (LEGAL.md).

## A seguir
- Design system: seis decisões em todos os componentes.
- i18n PT/EN nas superfícies públicas do cliente final.
- Landing /para-restaurantes com formulário de pedido de visita.
- Pacote legal (aviso legal, privacidade, cookies, termos com DSA, denúncias, livre resolução).
- SEO técnico (sitemap, robots, OG, JSON-LD, hreflang).
- Auditoria final (Lighthouse, axe, cabeçalhos, pnpm audit, revisor independente).

## Bloqueado (dono: Alex)
- Chave `service_role` do Supabase → e2e e ações de servidor em produção.
- Projeto Vercel (API devolveu 403) → deploy.
- NIF e morada do ENI → aviso legal.
- Revisão jurídica (LEGAL.md "Pontos por confirmar").
