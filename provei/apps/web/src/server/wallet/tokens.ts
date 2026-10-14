import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/** Segredo da Wallet. Em produção é obrigatório; em desenvolvimento usa um valor fixo (nunca em produção). */
export function walletSecret(): string {
  const s = serverEnv.wallet.tokenSecret;
  if (s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('WALLET_TOKEN_SECRET em falta ou com menos de 32 caracteres');
  return 'dev-only-wallet-secret-change-me-00000000';
}

const hmac = (purpose: string, data: string) => createHmac('sha256', walletSecret()).update(`${purpose}:${data}`).digest('base64url');

export const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

/** Número de série: 32 hex aleatórios, único e imutável. */
export const newSerial = () => randomBytes(16).toString('hex');

/** authenticationToken (43 caracteres, 32 bytes): derivado do número de série, imutável. Só o hash fica guardado. */
export const authTokenFor = (serial: string) => hmac('pass-auth', serial);

/** Token do QR: opaco, derivado do número de série e da versão (roda ao subir a versão). */
export const memberTokenFor = (serial: string, version: number) => hmac('member', `${serial}:${version}`);

/** Comparação em tempo constante de dois hashes hex. */
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** URL de descarga assinado e temporário (5 minutos) para o .pkpass. */
export function signDownload(passId: string, ttlSeconds = 300, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${passId}.${exp}.${hmac('download', `${passId}.${exp}`)}`;
}

export function verifyDownload(token: string, now = Date.now()): string | null {
  const m = /^([0-9a-f-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!m) return null;
  const [, passId, exp, sig] = m;
  if (Number(exp) < Math.floor(now / 1000)) return null;
  const expected = Buffer.from(hmac('download', `${passId}.${exp}`));
  const got = Buffer.from(sig!);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return passId!;
}
