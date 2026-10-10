# Guião de demonstração (10 minutos)

Preparação: `pnpm seed` e abrir a app. Contas de teste (link mágico; no Supabase local abre o Inbucket em http://127.0.0.1:54324): `user@provei.test`, `dono@provei.test`, `staff@provei.test`, `admin@provei.test`. Tudo o que aparece é fictício e está marcado como tal.

1. **Feed (1 min)**: abrir `/` como visitante. Mostrar vídeo e foto, "Para ti" e "Perto". Tocar em Seguir: pede entrada.
2. **Entrar (1 min)**: `user@provei.test`. Seguir e guardar um prato; ver `/guardados`.
3. **Restaurante (1 min)**: abrir "Sabores da Serra": mapa, horário, menu, ofertas, avaliações com selo "Visita verificada".
4. **Mesa (3 min)**: no painel do dono, `Mesas e QR`, mostrar o QR. Noutro telemóvel abrir `/t/<código>`. "Chamar empregado". Num segundo ecrã com `staff@provei.test` abrir `Fila de mesas`: aparece em tempo real; Atender, Resolver; o cliente vê "A caminho".
5. **Fidelização (2 min)**: no `/mesa`, "Confirmar a minha visita" (depois de 10 min; para a demo recuar `started_at` no seed). Ver carimbo e pontos. Staff: `Leitor de QR`, validar uma segunda visita por `@utilizador`; ao completar o cartão aparece a recompensa; validar o código.
6. **Painel (1 min)**: `Visão geral`, `Retenção de vídeo` (plano pago), limites do plano gratuito em `Plano`.
7. **Admin (1 min)**: `admin@provei.test` > `/admin`: aprovar restaurante, flags, planos manuais, auditoria.
