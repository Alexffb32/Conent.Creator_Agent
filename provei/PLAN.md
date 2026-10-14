# PLAN — Provei (produto próprio AP)

> Estado no disco para sobreviver a reinícios. Ler primeiro: PLAN.md, PROGRESS.md, LEGAL.md, SDKS.md, ASSETS.md, CLAIMS.md.

## Brief (secção 2)
- **Projeto:** Provei · tipo: produto próprio (software + landing) · dono: Alexandre Bento (ENI) · Covilhã/Fundão.
- **Objetivo único:** pôr restaurantes da Covilhã e do Fundão a usar o Provei (piloto: 3–5 restaurantes a publicar sozinhos 4 semanas).
- **Concluído significa:** app em produção (Vercel + Supabase UE), landing `/para-restaurantes` a gerar pedidos de visita, pacote legal pronto para revisão por jurista.
- **Avatar (restaurante):** dono de restaurante/tasca/café de bairro, pouco tempo, sem redes sociais geridas, cartões de fidelização em papel. **Avatar (cliente final):** estudante/residente local que escolhe onde comer pelo telemóvel.
- **Onde se juntam:** Instagram/TikTok locais, Google Maps, UBI (estudantes), associações de comércio.
- **Isco/oferta:** visita de demonstração gratuita no restaurante (QR de teste na mesa); plano gratuito.
- **Resultado prometido (honesto):** mostrar o prato real todos os dias e dar razões para o cliente voltar. Sem garantias de resultados.
- **Top 4 %:** desconhecido (sem clientes ainda). [MISSING]
- **Tráfego:** presencial (visita), QR nas mesas, boca a boca, redes do Provei. Temperatura: quente (visita) e morna (indicação).
- **Preços (hipóteses):** instalação 490 €, mensalidade 99 € (acresce IVA, B2B); sem anúncios para utilizadores 2,99 €/mês (IVA incluído). Configuráveis.
- **Prova disponível:** nenhuma ainda (pré-piloto). Nada de testemunhos inventados.
- **Utilizadores e dispositivo:** telemóvel (360–414 px) primeiro; painel também em tablet/portátil.
- **Stack:** Next.js 15 + Supabase (UE) + Vercel; monorepo pnpm/Turborepo.
- **Línguas:** PT-PT (principal) e EN (estudantes Erasmus) nas superfícies públicas do cliente final; painel e landing B2B só PT.
- **Bandeiras legais:** vende a consumidores (assinatura sem anúncios, atrás de flag) e a empresas; dados pessoais; sem analytics de terceiros; conteúdos de utilizadores (avaliações) → DSA; e-mail transacional; sem IA visível ao utilizador; sem promoções; sem alegações ambientais; menores de 13 não podem criar conta.
- **Entidade:** Alexandre Bento, ENI. NIF, morada [MISSING]. Contacto: ola@provei.pt (provisório).

## Mapa de páginas
Públicas: `/` feed · `/descobrir` · `/r/[slug]` · `/para-restaurantes` (landing B2B) · `/legal/termos` · `/legal/privacidade` · `/legal/cookies` · `/legal/aviso-legal` · `/denunciar` (DSA art. 16) · `/offline`.
Conta: `/entrar` · `/onboarding` · `/perfil` · `/perfil/definicoes` · `/perfil/desistir` (livre resolução da assinatura) · `/guardados` · `/notificacoes` · `/cartao` · `/mesa` · `/t/[code]`.
Restaurante: `/r/[slug]/admin/*`. Admin: `/admin/*`.

## Funil (landing B2B)
Visita/QR de teste/indicação → `/para-restaurantes` → formulário curto (nome, restaurante, contacto, cidade) → confirmação + e-mail ao Alex → visita presencial → piloto gratuito → plano pago.

## Métricas de sucesso
Pedidos de visita por semana; restaurantes a publicar ≥ 1 prato/semana; retenção semanal de utilizadores (meta 30 %); vídeos com > 50 % a passar os 5 s.

## Decisões (resumo; detalhe em docs/DECISIONS.md)
- i18n: dicionário próprio (sem dependência), locale por `?lang=` + cookie `pv_lang`; hreflang com `?lang=en`.
- Mapa por clique (fachada) para não enviar o IP ao servidor de mosaicos do OSM sem ação do utilizador.
- Sem banner de cookies: só cookies estritamente necessários/funcionais pedidos pelo utilizador (justificação em LEGAL.md) [VERIFY].
- Movimento: mantêm-se 150/250/400 ms da marca Provei (sobrepõe-se aos 100/200/300 ms genéricos do AP).
