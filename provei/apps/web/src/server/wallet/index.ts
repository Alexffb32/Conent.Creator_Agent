import 'server-only';
import { serverEnv } from '@/lib/env';
import { getAppleProvider } from './provider';

/** Disponibilidade técnica (credenciais). As flags `wallet_apple`/`wallet_google` decidem se aparece. */
export function walletAvailability() {
  const w = serverEnv.wallet;
  const apple = getAppleProvider();
  return {
    apple: apple.isConfigured(),
    appleSimulated: apple.simulated,
    google: Boolean(w.googleIssuerId && w.googleServiceAccountJson),
  };
}
