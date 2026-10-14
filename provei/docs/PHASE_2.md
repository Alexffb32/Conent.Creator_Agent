# Fase 2 · Pedidos (ADENDA 2)

Data: 2026-10-14 · Migrações: `20261014000012_orders.sql`, `20261014000013_orders_synthetic.sql`, `20261014000014_orders_hardening.sql` (aplicadas no Supabase `provei`).
Flags: `ordering` (pedidos), `kds` (ecrã de cozinha), `payments` (pagamento online). Todas desligadas por omissão.

## Feito
- **Pedir à mesa sem conta** (exige `SUPABASE_SERVICE_ROLE_KEY` no servidor; a chave de acompanhamento fica num cookie httpOnly do próprio pedido): `/t/{code}` oferece "Pedir sem conta" quando `ordering` está ligado; `/t/{code}/pedir` com menu, alergénios (14 da UE), notas, carrinho guardado no aparelho, envio idempotente (`client_ref`) e fila offline (envia quando a rede volta).
- **Pedir para levantar**: `/levantar/{slug}` (pede o nome).
- **Ticket digital** em `/pedido/{id}`: estado em tempo quase real (consulta a cada 10 s), linhas, total, "Documento de consumo — não é fatura", botão "Pagar online" quando `payments` + conta Stripe pronta.
- **Base de dados**: `place_order` (preços do menu, limites por mesa/cliente, 30 linhas, 1–20 unidades), `get_guest_order`, `set_order_status` (mesmas transições que `packages/domain`), `mark_order_paid_cash`, `close_shift`, `table_public_info`. Clientes sem escrita direta em `orders`.
- **KDS** `/r/{slug}/admin/cozinha`: colunas Novo / Em preparação / Pronto, Realtime filtrado por restaurante com consulta de reserva, filtro por posto, som, idade do pedido.
- **Sala** `/r/{slug}/admin/pedidos`: entregar, receber em dinheiro, cancelar com motivo (fica em `audit_logs`). Push ao cliente com conta quando fica pronto.
- **Fecho de caixa** `/r/{slug}/admin/caixa` (owner/manager): pré-visualização com `reconcileShift`, diferença de caixa, pedidos por pagar, histórico. Não é documento fiscal.
- **Menu**: posto de cozinha, alergénios, "Marcar esgotado".
- **Stripe Connect (teste)**: `PaymentProvider` com conta Express e Checkout na conta do restaurante, fee 0; webhook Connect (`payment_intent.succeeded/failed` com verificação do valor, `account.updated`). Botão "Ligar conta Stripe" nas definições (só dono).
- **`FiscalExporter`** (interface, modo `external`).
- **E-mail transacional** de confirmação para quem tem conta (não repete em reenvios).

## Testes
- Domínio: transições, preço do carrinho, fecho de caixa (35 testes).
- RLS (PGlite): 64 testes, incluindo 10 de F2 (sem flag não há pedido, preço do servidor, idempotência, cozinha não cancela, sala não prepara, restaurante B não vê pedidos de A, convidado só com segredo e não com o hash, mesa pública, anon sem acesso direto, teto de pedidos abertos, pago não se cancela, fechos sem sobreposição, pagamento Stripe só da conta Connect certa).
- Revisão de segurança independente: ver `docs/DECISIONS.md` (F2); todas as falhas médias e baixas corrigidas.
- Webhook: pedidos só pelo endpoint Connect, conta certa e valor igual; conta Connect atualizada.
- E2E `tests/e2e/orders.spec.ts`: QR → pedido sem conta → KDS → pronto → entregue → dinheiro → fecho (corre com `SUPABASE_SERVICE_ROLE_KEY`; sem ela fica *skipped*).
- Manual na cloud (360 px): pedido real de ponta a ponta, total calculado pela base de dados, axe sem violações. Dados de teste marcados sintéticos.

## Falta / depende do dono
- **Chaves Stripe de teste** (`STRIPE_SECRET_KEY` sk_test, `STRIPE_CONNECT_WEBHOOK_SECRET`) e endpoint Connect registado no painel Stripe (eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, "Listen to events on Connected accounts").
- **Contabilista**: confirmar o modelo fiscal (fatura no programa certificado do restaurante) antes de ligar pagamentos.
- **MB WAY / Multibanco** em Connect Express PT: [VERIFY].
- Preview na Vercel: bloqueado (403), ver `docs/STATUS.md`.
- Impressão de talões de cozinha: fora do âmbito.
