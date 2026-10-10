import 'server-only';
import { createSign, randomUUID } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/** Disponibilidade dos passes: sem credenciais devolve "indisponível" e a UI esconde os botões. */
export function walletAvailability() {
  const w = serverEnv.wallet;
  return {
    apple: Boolean(w.appleTypeId && w.appleTeamId && w.appleCertBase64),
    google: Boolean(w.googleIssuerId && w.googleServiceAccountJson),
  };
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

/** JWT RS256 "Save to Google Wallet" (generic/loyalty class). */
export function googleSaveUrl(card: { restaurantName: string; restaurantSlug: string; serial: string; points: number; stamps: number; stampsRequired: number; holder: string }): string | null {
  const w = serverEnv.wallet;
  if (!w.googleIssuerId || !w.googleServiceAccountJson) return null;
  const sa = JSON.parse(w.googleServiceAccountJson) as { client_email: string; private_key: string };
  const classId = `${w.googleIssuerId}.provei_loyalty`;
  const payload = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [process.env.NEXT_PUBLIC_SITE_URL ?? ''],
    payload: {
      loyaltyClasses: [{ id: classId, issuerName: 'Provei', programName: card.restaurantName, programLogo: { sourceUri: { uri: `${process.env.NEXT_PUBLIC_SITE_URL}/icons/icon-192.png` } }, reviewStatus: 'UNDER_REVIEW' }],
      loyaltyObjects: [
        {
          id: `${w.googleIssuerId}.${card.serial}`,
          classId,
          state: 'ACTIVE',
          accountName: card.holder,
          loyaltyPoints: { label: 'Pontos', balance: { int: card.points } },
          secondaryLoyaltyPoints: { label: `Carimbos (de ${card.stampsRequired})`, balance: { int: card.stamps } },
          barcode: { type: 'QR_CODE', value: `${process.env.NEXT_PUBLIC_SITE_URL}/cartao/${card.restaurantSlug}` },
        },
      ],
    },
  };
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key);
  return `https://pay.google.com/gtw/save/${head}.${body}.${b64u(sig)}`;
}

export const newWalletSerial = () => randomUUID().replace(/-/g, '');
