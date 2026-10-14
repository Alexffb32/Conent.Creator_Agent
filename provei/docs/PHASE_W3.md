# Fase W3 · Aviso por proximidade, grupo de controlo e relatório (ADENDA 4)

Data: 2026-10-14 · Flag: `wallet_location` (desligada).

## Feito
- `locations` (máx. 10 por cartão, com a localização do restaurante) e `relevantText` curto ("Tens pontos para trocar aqui" ou "Mostra o cartão no {restaurante}"), só com `wallet_location` ligada e fora do grupo de controlo.
- Sugestão passiva gerida pelo iOS no ecrã de bloqueio. **O servidor nunca recebe a localização do cliente**: a localização está no cartão; um teste estático garante que nenhuma rota da Wallet nem o serviço web lê localização do pedido.
- `storeCard` sem `relevantDate`: a interface diz claramente que não controlamos hora nem frequência.
- Grupo de controlo: 10% dos cartões, atribuição determinística pelo número de série (FNV-1a), guardada em `wallet_passes.location_control`; emitidos sem `locations`.
- Relatório no painel do restaurante (`/r/{slug}/admin/wallet`, owner/manager): cartões emitidos e ativos (Apple/Google), telemóveis a receber atualizações, avisos enviados, visitas e pedidos de quem tem cartão, recompensas trocadas; comparação tratados vs controlo (visitas + pedidos por cartão depois da emissão, últimos 28 dias), diferença com intervalo de 95% (Welch), e veredicto explícito: "poucos dados" (< 30 por grupo), "sem efeito detetável — o efeito pode ser zero", positivo ou negativo.
- Limitações escritas no relatório: não há contagem de impressões no ecrã de bloqueio; o iOS decide quando mostra.

## Testes
- Domínio: grupo de controlo ~10% e determinístico; relatório com poucos dados, sem efeito (intervalo inclui zero) e com efeito positivo/negativo.
- Privacidade: nenhuma rota da Wallet lê latitude/longitude/geolocalização.

## Falta
- Teste em iPhone real (o simulador não mostra cartões no ecrã de bloqueio): passo 8 de `docs/runbooks/wallet-device-test.md`.
- Restaurantes com várias moradas: hoje há uma localização por restaurante (o modelo permite até 10 quando existir).
