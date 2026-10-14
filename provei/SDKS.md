# SDKS — terceiros que tratam dados

| Fornecedor | O que recebe | Finalidade | Base legal | Cookies | DPA | Transferência |
| --- | --- | --- | --- | --- | --- | --- |
| Supabase (Supabase Inc.; projeto em Frankfurt eu-central-1) | Conta (e-mail), perfil, atividade, ficheiros | Base de dados, autenticação, armazenamento, tempo real | Execução do contrato (RGPD 6.º/1 b) | `sb-<ref>-auth-token` (sessão) | DPA da Supabase [a assinar no painel] | Dados na UE; empresa nos EUA (DPF/SCC) [VERIFY] |
| Vercel Inc. | IP, pedidos HTTP, registos | Alojamento e CDN | Interesse legítimo / contrato | nenhum | DPA Vercel | EUA (DPF) [VERIFY] |
| Resend Inc. | E-mail do destinatário, conteúdo | E-mails transacionais (link mágico, convites) | Contrato | nenhum | DPA Resend | EUA (DPF/SCC) [VERIFY] |
| OpenStreetMap Foundation (tile.openstreetmap.org) | IP e mosaicos pedidos **só depois de o utilizador carregar em "Mostrar mapa"** | Mapa | Consentimento por ação (clique) | nenhum | n/a | Reino Unido (adequação) |
| Stripe (flag `payments`, desligada) | Dados de pagamento no checkout alojado da Stripe | Pagamentos | Contrato | cookies da Stripe só no checkout.stripe.com | DPA Stripe | EUA (DPF/SCC) |
| Mux / Cloudflare Stream (opcional) | Vídeos dos restaurantes | Transcodificação | Contrato | nenhum | DPA do fornecedor | EUA [VERIFY] |
| Apple / Google Wallet (flag `wallet`, desligada) | Nome, pontos do cartão | Passes de fidelização | Pedido do utilizador | n/a | termos dos fornecedores | EUA |
| Web Push (serviço push do navegador) | Endpoint e payload | Notificações | Consentimento | n/a | n/a | conforme navegador |

**Não usados:** Google Analytics, pixels de anúncios, Google Fonts remotas (fontes auto-alojadas via @fontsource), chat de terceiros, Captcha de terceiros.
