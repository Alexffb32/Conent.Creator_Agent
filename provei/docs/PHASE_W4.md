# Fase W4 · Google Wallet (ADENDA 4)

Data: 2026-10-14 · Migração: `supabase/migrations/20261014000018_wallet_google.sql` (aplicada). Flag: `wallet_google` (desligada).

## Referência
Google Wallet › Loyalty cards › *Trigger push notifications* (consultada em 2026-10-14): `notifyPreference: "notifyOnUpdate"` é transitório
e só avisa nos campos suportados (objeto: `loyaltyPoints.balance`, `secondaryLoyaltyPoints.balance`); mensagens `TEXT` ou `TEXT_AND_NOTIFY`;
máximo de 3 avisos por cartão em 24 h, acima disso `QuotaExceededException` → voltar a `TEXT`.

## Feito
- Domínio (`packages/domain/src/wallet-google.ts`): classe por restaurante (cor da marca, país PT) e objeto por cliente (pontos, QR opaco `provei:w:…` igual ao Apple, progresso, nível, oferta, termos, como desligar avisos; nome próprio só com escolha do cliente; anulado = `INACTIVE` sem nome); PATCH de pontos com `notifyOnUpdate` só quando pedido; mensagem `TEXT`/`TEXT_AND_NOTIFY`.
- `GoogleWalletProvider` com transporte real (service account → OAuth `wallet_object.issuer`, timeout 10 s) e simulado (dev/testes). Ligação "Adicionar à Google Wallet" por JWT assinado que só referencia o objeto já criado pela API.
- Mesmo registo `wallet_passes` (plataforma `google`), mesmo token do QR (o leitor do restaurante funciona igual), mesmo grupo de controlo.
- Sincronização (`google-sync.ts`): cartões com alterações; o saldo vai num PATCH próprio com aviso só se o saldo mudou e o cliente tem "avisos de pontos" ligado; quota excedida → atualiza sem aviso e regista; anulações seguem sempre; erros ficam pendentes. Corre logo a seguir a leituras/visitas/ajustes/conta apagada e no varrimento diário.
- `merchantLocations` (≤ 10) só com `wallet_location` e fora do grupo de controlo; a interface não promete distância, tempo nem texto (a Google decide e exige notificações e localização precisa sempre ativa).
- Botão "Adicionar à Google Wallet" no cartão do restaurante; em modo de teste mostra o conteúdo do cartão.
- Admin `/admin/wallet` já mostra falhas Google; painel do restaurante conta cartões Google.

## Testes
- Domínio (3): ids, classe/objeto, ≤ 10 localizações só com a flag, sem dados pessoais, anulado, PATCH com/sem aviso, TEXT vs TEXT_AND_NOTIFY.
- Fornecedor (6, transporte simulado): cria/atualiza classe; aviso só quando pedido; quota → repete sem aviso; mensagens → TEXT na quota; deteção da QuotaExceededException; erro da API.
- RLS: pendentes por plataforma só para o servidor.

## Falta / depende do dono
- Conta de emissor Google Wallet + service account (`GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`) e aprovação da classe pela Google (`reviewStatus`).
- Teste num Android real.
- Mensagens de oferta (`addMessage`) só no W5, com consentimento próprio.
