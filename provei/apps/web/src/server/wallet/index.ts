import 'server-only';
import { serverEnv } from '@/lib/env';
import { getAppleProvider } from './provider';
import { getGoogleProvider } from './google';

/** Disponibilidade técnica (credenciais). As flags `wallet_apple`/`wallet_google` decidem se aparece. */
export function walletAvailability() {
  const w = serverEnv.wallet;
  const apple = getAppleProvider();
  return {
    apple: apple.isConfigured(),
    appleSimulated: apple.simulated,
    google: getGoogleProvider() !== null,
    googleSimulated: !(w.googleIssuerId && w.googleServiceAccountJson),
  };
}
