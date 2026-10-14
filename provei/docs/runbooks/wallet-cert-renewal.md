# Runbook · Renovar o certificado da Apple Wallet (Pass Type ID)

O certificado de assinatura do Pass Type ID **expira** (normalmente ao fim de 1 ano [VERIFY] na conta Apple Developer).
Cartão assinado com certificado expirado deixa de instalar, e o push de atualização (APNs) falha.
O painel de admin vai mostrar a data de expiração com alerta a 60 e 30 dias (ADENDA 4 §7, fase W2).

## Lembrete
- Criar um evento no calendário do dono 60 dias antes da data "Expires" do certificado, e outro 30 dias antes.

## Passos (no Mac do dono ou de quem gere a conta Apple Developer)
1. developer.apple.com › Certificates, Identifiers & Profiles › Identifiers › o Pass Type ID do Provei.
2. Criar um certificado novo para esse Pass Type ID (pede um CSR: Acesso a Porta-chaves › Assistente de Certificados › Pedir certificado a uma autoridade).
3. Descarregar o `.cer`, abrir no Porta-chaves e exportar certificado + chave privada como `.p12` (com palavra-passe).
4. Converter para PEM (num terminal, fora do repositório):
   - `openssl pkcs12 -in pass.p12 -clcerts -nokeys -out signerCert.pem -legacy`
   - `openssl pkcs12 -in pass.p12 -nocerts -out signerKey.pem -legacy` (fica cifrada com a frase que escolheres)
5. Confirmar o certificado intermédio Apple WWDR em vigor (apple.com/certificateauthority) e convertê-lo para PEM.
6. Codificar cada PEM em base64 numa linha e guardar **só** no gestor de segredos / variáveis de ambiente do Vercel:
   `APPLE_PASS_SIGNER_CERT_PEM_B64`, `APPLE_PASS_SIGNER_KEY_PEM_B64`, `APPLE_PASS_SIGNER_KEY_PASSPHRASE`, `APPLE_WWDR_CERT_PEM_B64`.
7. Fazer novo deploy. Verificar: descarregar um cartão no iPhone de teste (ver `wallet-device-test.md`).
8. Apagar do computador os ficheiros `.p12` e `.pem` intermédios.

## Nunca
- Pôr certificados, chaves ou palavras-passe no repositório, em mensagens ou em tickets.
- Mudar `APPLE_PASS_TYPE_ID` ou `WALLET_TOKEN_SECRET` na renovação: invalida todos os cartões emitidos.
