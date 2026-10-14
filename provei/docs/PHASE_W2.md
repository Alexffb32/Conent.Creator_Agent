# Fase W2 · Serviço web PassKit, push de atualização e avisos de pontos (ADENDA 4)

Data: 2026-10-14 · Migração: `supabase/migrations/20261014000016_wallet_webservice.sql` (aplicada no Supabase `provei`).
Flag: `wallet_updates` (desligada). Sem ela os registos de dispositivos são aceites, mas nenhum push é enviado.

## Referência confirmada
Caminhos, cabeçalhos e respostas confirmados na documentação oficial da Apple (Wallet Passes › *Adding a web service to update passes*
e as páginas de cada endpoint), consultada em 2026-10-14:
| Método | Caminho (relativo a `webServiceURL`) | Autenticação | Respostas |
| --- | --- | --- | --- |
| POST | `v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}` (corpo `{pushToken}`) | `ApplePass <authenticationToken>` | 201 novo, 200 já registado, 401 |
| DELETE | o mesmo | `ApplePass` | 200, 401 |
| GET | `v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince=` | o próprio device library id | 200 `{serialNumbers, lastUpdated}`, 204 |
| GET | `v1/passes/{passTypeIdentifier}/{serialNumber}` | `ApplePass` | 200 `.pkpass` + `Last-Modified`, 304, 401 |
| POST | `v1/log` | — | 200 |
Push: payload `{}`, tópico = `passTypeIdentifier`, assinado com o certificado do Pass Type ID; **só funciona em produção**; token inválido → apagar o registo.

## Feito
- Rotas em `apps/web/src/app/api/wallet/apple/v1/…`; lógica pura em `server/wallet/webservice.ts` sobre uma `WebServiceStore` (Supabase em `stores.ts`).
- Autenticação por hash do `authenticationToken` com comparação em tempo constante; limite por IP; corpo limitado; logs do dispositivo truncados.
- Só o último push token por dispositivo (substitui o dos outros registos do mesmo dispositivo).
- Etiqueta **global** (sequência `wallet_update_seq`) atribuída por gatilho a cada alteração do cartão; `pushed_tag` guarda o último envio.
- `pushPendingUpdates`: push a cada dispositivo registado, token inválido apaga o registo, erro deixa pendente, cartão anulado → push e remoção dos registos; transporte APNs HTTP/2 real só em produção com certificados, simulado no resto (registado como "simulado", não conta como envio).
- Disparo: logo a seguir a leitura no restaurante, visita pela mesa, ajuste de pontos, conta apagada e mudança do interruptor; varrimento diário no cron `/api/jobs/maintenance` (e `/api/jobs/wallet`), que também limpa registos de cartões anulados há mais de 30 dias e eventos com mais de 90.
- Aviso de pontos: `changeMessage` "Tens %@ pontos no {restaurante}" (dispara só quando o valor muda e as notificações do cartão estão ativas). Interruptor "Avisos de pontos" no perfil: desligado, o cartão é gerado sem `changeMessage` e atualiza em silêncio.
- Certificado expirado: o fornecedor recusa assinar com mensagem clara.
- Admin `/admin/wallet`: expiração dos certificados (Pass Type ID e WWDR) com alerta a 60 e 30 dias, envios, tokens inválidos, erros, simulados, falhas Google, cartões ativos por plataforma, dispositivos registados, custo por canal.

## Testes
- Dispositivo simulado (9): registo 201/200/401/400 e idempotência; etiqueta global não perde a atualização de outro cartão; só o último token por dispositivo; 200/304/401 no cartão; log limitado; push com tópico = `passTypeIdentifier` e sem repetição; token inválido apaga registo e erro deixa pendente; flag desligada não envia; anulado remove registos; simulado não conta como envio.
- Certificado expirado recusado; alerta 60/30 dias (domínio).
- RLS (2 novos): sequência global e gatilho; eventos de push só para admin com MFA; avisos de pontos ligados por omissão.

## Falta / depende do dono
- Certificados reais e teste num iPhone real (`docs/runbooks/wallet-device-test.md`, passos 5–7).
- O cron do plano gratuito da Vercel corre uma vez por dia: os pushes saem de imediato nas ações; o varrimento diário só apanha falhas.
- [VERIFY] cabeçalhos `apns-push-type: background` e `apns-priority: 5` para cartões (a documentação de cartões não os refere; confirmar com o primeiro envio real).
