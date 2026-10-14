# Fase W1 · Cartão de fidelidade na Apple Wallet (ADENDA 4)

Data: 2026-10-14 · Migração: `supabase/migrations/20261014000015_wallet.sql` (aplicada no Supabase `provei`).
Flags novas, todas desligadas: `wallet_apple`, `wallet_google`, `wallet_updates`, `wallet_location`, `wallet_campaigns`.

## Passos manuais do Alex (secção 0 do ADENDA 4) — em falta
1. Inscrição no Apple Developer Program.
2. Pass Type ID + certificado de assinatura + certificado intermédio Apple WWDR (ver `docs/runbooks/wallet-cert-renewal.md`).
3. Conta de emissor Google Wallet (Google Pay & Wallet Console) + service account (para W4).
Variáveis a criar no ambiente (nunca no repositório): `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_SIGNER_CERT_PEM_B64`,
`APPLE_PASS_SIGNER_KEY_PEM_B64`, `APPLE_PASS_SIGNER_KEY_PASSPHRASE`, `APPLE_WWDR_CERT_PEM_B64`, `WALLET_TOKEN_SECRET` (32+ caracteres),
`GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON`.
**Sem estes segredos tudo funciona com o adaptador simulado (fora de produção) e as flags ficam desligadas.**

## Feito
- `WalletProvider` com `ApplePassKitProvider` (gera e assina `.pkpass` com `passkit-generator` 3.6.1) e `SimulatedAppleProvider` (só fora de produção, devolve o `pass.json`).
- `pass.json` `storeCard` (puro, `packages/domain/src/wallet.ts`): cores da marca, `logoText`, `sharingProhibited`, pontos com `changeMessage` `%@`, progresso, nível, oferta (vazia), verso com termos/privacidade/como desligar avisos/contacto, QR com token opaco, `pt.lproj/pass.strings`, imagens `icon`/`logo`/`strip` @1x/@2x/@3x (logótipo provisório).
- Um cartão por restaurante por cliente (`wallet_passes`), número de série aleatório e imutável; `authenticationToken` e token do QR derivados por HMAC — na base só ficam hashes.
- Botão "Adicionar à Apple Wallet" no cartão do restaurante (com sessão; nome próprio opcional), por URL assinado de 5 minutos.
- Leitor da equipa aceita o QR do cartão (`provei:w:…`), confirma a visita e credita pontos; token roda depois da leitura quando `wallet_updates` estiver ligada (aceita a versão anterior até o telemóvel buscar o cartão novo).
- Mudança de pontos/carimbos/nível avança a etiqueta de atualização (gatilho na base de dados), base do W2.
- Conta apagada: cartões anulados (`voided`) e etiqueta avançada (gatilho).
- Runbooks: `docs/runbooks/wallet-cert-renewal.md`, `docs/runbooks/wallet-device-test.md`.

## Testes
- Domínio (9): campos e cores, `changeMessage`, sem dados pessoais no QR, ≤ 10 localizações, validações, anulado, grupo de controlo ~10% determinístico.
- Assinatura (6): `.pkpass` real assinado com certificados de teste gerados no próprio teste; manifesto SHA-1 de cada ficheiro confere; assinatura PKCS#7 verificada com `openssl smime -verify` e recusada com manifesto adulterado; tokens e URL de descarga (expiração e adulteração).
- RLS (5 novos): flags desligadas, cliente só vê o seu cartão, sem escritas pelo cliente, registos invisíveis, um cartão ativo por restaurante e cliente, anulação ao apagar conta, etiqueta avança com os pontos.

## Falta / depende do dono
- Certificados reais e teste num iPhone real (checklist no runbook). A ferramenta `signpass` da Apple só existe em macOS; a verificação equivalente foi feita com OpenSSL.
- W2 (serviço web PassKit e push), W3, W4; W5 depende do ADENDA 3 (consentimentos + `shouldSend`), que ainda não foi recebido.
- Preview na Vercel: bloqueado (403), ver `docs/STATUS.md`.
