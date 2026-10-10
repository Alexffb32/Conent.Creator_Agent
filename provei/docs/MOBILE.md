# App iPhone (fase 9)

Estado: esqueleto em `apps/mobile` (Expo + NativeWind) com login por link mágico/OTP e lista do feed lida do mesmo Supabase, a usar `@provei/domain` e `@provei/api-client`. **Não foi corrido nem testado nesta sessão.**

## Plano
- **QR/NFC nativo**: `expo-camera` (QR) e `react-native-nfc-manager` (NDEF) abrem `/t/<código>` na mesma lógica de token/sessão da web (universal links para `https://<domínio>/t/*`).
- **Push**: `expo-notifications` com APNs (token Expo guardado em `push_subscriptions` com `endpoint = ExponentPushToken[...]`); o servidor envia pela API da Expo.
- **Wallet nativa**: `.pkpass` assinado pelo servidor (certificado Pass Type ID) aberto com `PassKit`; atualizações via `webServiceURL` do passe.
- **Partilha de código**: tokens de marca via `@provei/config`; regras via `@provei/domain`. Não importar `next/*` nos pacotes partilhados.
- **Pré-requisitos**: conta Apple Developer (99 €/ano), identificador da app, certificados.

## Arrancar
```
cd apps/mobile && cp .env.example .env && pnpm install --ignore-workspace && pnpm start
```
