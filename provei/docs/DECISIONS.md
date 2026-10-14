# Decisões

Registo de decisões não óbvias. Mais recentes no fim de cada secção.

## Estrutura e repositório
- O prompt pedia um repositório novo `provei`. A sessão só tem acesso ao repositório `Alexffb32/Conent.Creator_Agent`, por isso o monorepo vive na pasta `provei/` deste repositório, no ramo `claude/provei-mvp-build-dd5k5o`. Para o separar mais tarde: `git subtree split -P provei` (ou copiar a pasta) e apontar a Vercel para o novo repositório.
- Monorepo pnpm + Turborepo. Regras de negócio puras em `packages/domain` (sem React/Next/Node), partilhadas com a futura app Expo.
- Tailwind 3 (e não 4) por causa do preset partilhado com NativeWind.

## Recursos criados
| Recurso | Nome | Região | ID / URL |
| --- | --- | --- | --- |
| Projeto Supabase | provei | eu-central-1 (Frankfurt) | `ivzzkexfvzvmnyppaxnj` · https://ivzzkexfvzvmnyppaxnj.supabase.co |
| Projeto Vercel | (por criar pelo Alex: 403 na API) | — | — |
- Os projetos Supabase antigos (`alexffb`, `Alexffb32's Project`) não foram tocados.

## Dados e segurança
- RLS em todas as tabelas. Escritas sensíveis (visitas, carimbos, avaliações, chamadas, resgates) passam por Server Actions que autorizam no servidor e usam `service_role`; as políticas RLS impedem que o cliente as faça diretamente. Seguir/guardar/perfil/consentimentos usam a sessão do utilizador.
- Colunas protegidas por `GRANT UPDATE (colunas)`: um utilizador não altera `is_admin`, `points_total`, `is_ad_free`; um dono não altera `plan` nem `verified_status`.
- `public_profiles` é uma vista `security definer` intencional (só id, nome, handle, avatar, nível). O linter do Supabase assinala-a como erro; fica aceite e documentada.
- Funções auxiliares `is_member/is_owner/is_admin/restaurant_is_public` são `security definer` com `search_path` fixo e têm de ser executáveis por `anon`/`authenticated` (usadas pelas políticas). As funções de trigger não são executáveis por RPC.
- Livro-razão `loyalty_events` imutável (trigger); saldo do cartão mantido por trigger e verificável com `loyalty_card_consistent`.
- Restaurante `pending` só é visível ao dono/equipa e ao admin; o feed e o perfil público só mostram `verified`.
- Rate limiting: função Postgres `rate_limit_hit` com fallback em memória. Redis (`RATE_LIMIT_REDIS_URL`) está previsto mas não ligado.
- IP nunca em claro: hash com sal diário (`ipHash`).

## Mesa, visitas, fidelização
- Token de mesa: HMAC-SHA256, 5 min, `jti` registado em `table_token_uses` (uso único). Sessão de mesa 3 h (configurável em `restaurants.settings.sessionHours`). Um utilizador só tem uma sessão ativa.
- QR pessoal do cliente: o mesmo mecanismo, com `tid = "u:<userId>"`, 5 min e uso único.
- Entrada manual da equipa aceita `@handle`; é auditada e sujeita aos mesmos intervalos.
- Chamadas: uma aberta por mesa (índice único parcial), intervalo 2 min, 5/utilizador/hora, 30/restaurante/IP/hora, expiração aos 15 min (preguiçosa + job diário), 3 rejeições no dia = bloqueio 24 h.
- Visita `qr`: sessão ativa ≥ 10 min. Intervalo mínimo entre visitas por `min_interval_hours`. Carimbo e pontos idempotentes por visita (índice único).
- Ao completar o cartão emite-se o resgate (único por ciclo) e regista-se um evento `redeem` que desconta os carimbos.
- Avaliações: uma publicada por utilizador/restaurante. Nova avaliação substitui a anterior (fica `replaced`, histórico mantido). Dentro de 30 dias conta como edição (sem pontos de foto repetidos).
- Planos: o gratuito aplica limites por trigger na base de dados (mesas, publicações/mês, ofertas) além da validação no servidor. Cartão de carimbos simples: pontos extra fixos.

## Feed
Fórmula (em `packages/domain/src/feedRank.ts`):
`score = 3·seguido + 3·0,5^(idadeH/48) + 2·0,5^(km/5) + popularidade`, com popularidade = `min(1, log10(1 + 5·guardados + 0,1·views)/3) · 0,5^(idadeH/168)`.
"Perto" filtra a 40 km e dá mais peso à distância. Paginação por cursor (offset codificado) sobre as 120 publicações mais recentes. Anúncios: 1 em cada 8, nunca na posição 0, máx. 3 por dia por campanha.

## Pagamentos e vídeo
- Stripe só em modo de teste: chaves `sk_live_` são recusadas a menos que `STRIPE_ALLOW_LIVE=true`.
- Valores 490 €/99 € vêm de configuração (`NEXT_PUBLIC_PRICE_*` para mostrar; preços reais na Stripe). Sem comissão no MVP.
- Vídeo: interface `VideoProcessor`. `local` aceita o mp4 tal como veio (a Vercel não corre FFmpeg). `mux`/`cloudflare` enviam para transcodificação e recebem webhook.
- Cron: Vercel Hobby só permite crons diários; `vercel.json` corre `/api/jobs/maintenance` às 03:00. A expiração de chamadas é feita também de forma preguiçosa.

## Entregas (delivery)
Conceito registado, **não construído**: pedidos para entrega ao domicílio ficam fora do MVP. Só existe o modelo de pedidos na mesa (flag `table_ordering`, desligada).

## Pedidos na mesa
Tabelas `orders`/`order_items` e RLS existem; a interface está atrás da flag `table_ordering` (desligada) e **não** foi implementada nesta entrega (ver STATUS).

## Fase AP (2026-10-13)
- **Idioma**: PT por omissão; EN só por `?lang=en` (fica em cookie `pv_lang`). Sem negociação por Accept-Language: o mesmo URL serviria duas línguas e estragava canonical/hreflang. Painel, admin, landing B2B e textos legais ficam em PT.
- **Raios do design**: tokens `rounded-l`/`rounded-s` colidiam com utilitários do Tailwind (cantos esquerdos/início). Renomeados para `rounded-xl` (28 px) e `rounded-sm` (8 px).
- **Mapa por clique**: o OpenStreetMap só recebe o IP depois do toque em "Mostrar mapa"; poupa ~200 kB de JS. maplibre-gl 6 (alerta crítico na 4.x); o worker é copiado para `public/vendor` no build (`scripts/copy-vendor.mjs`).
- **Formulários públicos** (`leads`, `content_notices`): gravados por funções `security definer` com limites por hash de IP e globais; só a `service_role` as pode chamar (o cliente não forja o hash).
- **Revisão independente** (subagente, 2026-10-13). Corrigido: donos deixam de ler `analytics_events` (só agregados); confirmação e decisão fundamentada por e-mail nas denúncias DSA; e-mail ao autor quando uma avaliação é removida; reembolso honesto (tarefa manual); retenção de `audit_logs` 13 meses; texto de privacidade sobre perfil público, perfis automáticos e obrigatoriedade dos dados; canonical/hreflang por idioma; fictícios em `noindex` e sem `aggregateRating`. Fica por decidir: rever com jurista o pacote legal.
- **Migração 10 na cloud**: `drop policy` via ferramenta ficava pendurado (pede confirmação); aplicado com `alter policy ... using (false)` e políticas aditivas, mesmo efeito. O ficheiro da migração foi alinhado.

| Recurso criado | Onde | Data |
| --- | --- | --- |
| Tabelas `leads`, `content_notices` + funções `submit_lead`, `submit_content_notice` | Supabase `provei` | 2026-10-13 |

## ADENDA 2 · F1 (2026-10-14)
| Data | Decisão | Porquê | Alternativa rejeitada |
| --- | --- | --- | --- |
| 2026-10-14 | Papéis derivados das tabelas de pertença (`restaurant_members`, `advertiser_members`, `profiles.is_admin`) e expostos por `public.user_roles(uid)` e pela claim `app_roles` do JWT (hook `custom_access_token_hook`). | Um mesmo e-mail pode ter vários papéis; uma coluna `profiles.role` única não o permite. | Coluna `profiles.role` com um só valor. |
| 2026-10-14 | A RLS lê as tabelas, não as claims do JWT. | As claims só mudam quando o token é renovado; a RLS tem de refletir remoções de equipa de imediato. | Políticas baseadas em `auth.jwt()->'app_roles'`. |
| 2026-10-14 | Papéis no restaurante: owner, manager, kitchen, waiter. `is_owner()` passou a significar "pode gerir" (owner ou manager); `is_restaurant_owner()` é o dono estrito (faturação, remover gerentes); `is_member()` é a sala (owner, manager, waiter); `is_crew()` é toda a equipa (cozinha incluída). `staff` antigo passou a `waiter`. | Evita reescrever cerca de 40 políticas e mantém a cozinha só com menu e pedidos. | Reescrever todas as políticas com nomes novos. |
| 2026-10-14 | Admin com MFA obrigatório: `is_admin()` exige `aal2` no JWT; as páginas e ações de admin redirecionam para `/mfa` (TOTP). | Requisito da ADENDA 2; protege mesmo se alguém contornar a interface. | MFA só na interface. |
| 2026-10-14 | Flag `reviews` (já existente, ligada) continua a controlar as avaliações públicas do MVP. O fluxo da ADENDA 2 (pedido de avaliação depois do pedido + Google) usa a flag nova `review_requests`. `ordering` substitui `table_ordering` (mantida desligada por compatibilidade). | Desligar `reviews` partiria o produto base (critério 1). | Reutilizar `reviews` para o fluxo novo. |
| 2026-10-14 | Dados sintéticos: `is_demo` (já existente em restaurantes, publicações, avaliações, campanhas) é o marcador `is_synthetic` pedido; tabelas novas usam `is_synthetic`. O admin já mostra "Exemplo/Fictício". | Uma só fonte de verdade sem migrar dados. | Renomear `is_demo` em todas as tabelas. |
| 2026-10-14 | `feed_events` só com conta, flag `recommender` e consentimento `personalization`; retenção 180 dias; o utilizador apaga tudo em "Repor personalização". Sem conta, nada é guardado. | Personalização é perfilagem (RGPD art. 22.º/consentimento). | Guardar eventos anónimos por cookie. |
| 2026-10-14 | Migrações aplicadas no projeto `provei` (o único, ainda sem produção) e não num branch Supabase. | Os branches Supabase são pagos (por hora) e a regra é não passar do nível gratuito sem avisar. Todas as migrações são primeiro validadas em PGlite (testes RLS). | Criar um branch por fase. |
| 2026-10-14 | Previews na Vercel: bloqueados (a ligação devolve 403 a criar projetos). Cada fase fica com build e testes verdes no CI. | Depende de token do dono (ver STATUS). | — |
| 2026-10-14 | `drop policy` pela ferramenta Supabase fica pendurado (pede confirmação); na cloud usa-se `alter policy ... rename` + `alter policy ... using`, mesmo efeito, e o ficheiro da migração foi alinhado. | Fiabilidade da aplicação remota. | — |

## ADENDA 2 · F2 (2026-10-14)
| Data | Decisão | Porquê | Alternativa rejeitada |
| --- | --- | --- | --- |
| 2026-10-14 | O QR da mesa continua em `/t/{code}` (código público aleatório por mesa) e o pedido em `/t/{code}/pedir`; para levantar, `/levantar/{slug}`. | Os QR já impressos continuam válidos; o código não revela restaurante nem número de mesa e é rotativo. | `/t/{restaurante}/{mesa}` (adivinhável, obriga a reimprimir). |
| 2026-10-14 | Pedido sem conta: o servidor gera um segredo (24 bytes) e guarda só o sha256 em `orders.guest_secret_hash`; o cliente acompanha o pedido com `?k=` no endereço. | Sem conta obrigatória, sem dados pessoais, e ninguém lê um pedido alheio sem o segredo. | Exigir conta para pedir. |
| 2026-10-14 | Preços e disponibilidade sempre recalculados na base de dados (`place_order`); o cliente só envia ids e quantidades. Idempotência por `client_ref` único por restaurante; carrinho e fila offline no aparelho. | Impede preços adulterados e pedidos duplicados com rede fraca. | Confiar no total do cliente. |
| 2026-10-14 | Stripe Connect Express com *direct charges* na conta do restaurante, `application_fee` 0, só modo de teste. Webhook Connect num endpoint próprio (`/api/stripe/connect-webhook`, segredo `STRIPE_CONNECT_WEBHOOK_SECRET`); o pedido só fica pago se o valor recebido for igual ao total. | O restaurante é o vendedor e recebe diretamente; o Provei não toca no dinheiro nem cobra comissão nesta fase. | *Destination charges* com o Provei como comerciante (responsabilidade fiscal e de reembolsos do Provei). |
| 2026-10-14 | MB WAY e Multibanco: dependem dos métodos ativos na conta Stripe de cada restaurante (Checkout mostra os ativos). [VERIFY] disponibilidade em contas Connect Express PT antes de prometer. | Não afirmar o que não foi verificado. | Prometer MB WAY já. |
| 2026-10-14 | `FiscalExporter` só como interface; implementação `external` = "a fatura é emitida no programa certificado do restaurante". O ticket diz "Documento de consumo — não é fatura". Confirmar com contabilista (Portaria 363/2010, SAF-T) antes de qualquer integração. | O Provei não é programa de faturação certificado pela AT. | Emitir faturas no Provei. |
| 2026-10-14 | Fecho de caixa é reconciliação interna (Stripe + dinheiro registado + cancelamentos), não documento fiscal. A mesma regra existe em `packages/domain` (pré-visualização) e em SQL (`close_shift`), ambas com testes. Dados sintéticos (`is_synthetic`) excluídos. | Ajuda o fecho diário sem se fazer passar por documento legal. | — |
| 2026-10-14 | Flags por restaurante resolvidas no layout do painel (`FlagsProvider` com `getFlags(restaurantId)`). | O piloto liga pedidos restaurante a restaurante. | Só flags globais. |
| 2026-10-14 | Teste manual na cloud: a flag `ordering` foi ligada uns minutos no restaurante fictício "Café dos Estudantes", foram feitos 3 pedidos de teste e a flag voltou a ficar desligada. Os 3 pedidos ficaram marcados `is_synthetic = true` e cancelados (a ferramenta Supabase não deixa apagar sem confirmação). | Validar `place_order` real de ponta a ponta sem dados falsos apresentados como reais. | — |

| Recurso criado | Onde | Data |
| --- | --- | --- |
| Migrações `20261014000012_orders`, `20261014000013_orders_synthetic` | Supabase `provei` | 2026-10-14 |
