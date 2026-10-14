/**
 * Token de mesa assinado (HMAC-SHA256, formato `payload.assinatura`, ambos base64url).
 * Usa WebCrypto, disponível em Node 20+, browsers e edge. Uso único garante-se no servidor
 * registando o `jti` (ver tabela table_token_uses).
 */
export interface TableTokenPayload {
  jti: string;
  tid: string; // table_id
  src: 'qr' | 'nfc';
  exp: number; // epoch seconds
}

export const TABLE_TOKEN_TTL_SECONDS = 300;
export const TABLE_SESSION_DEFAULT_HOURS = 3;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

export async function signTableToken(payload: TableTokenPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export type TokenError = 'malformed' | 'bad_signature' | 'expired';

export async function verifyTableToken(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<{ ok: true; payload: TableTokenPayload } | { ok: false; reason: TokenError }> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts as [string, string];
  let sigBytes: Uint8Array;
  let payload: TableTokenPayload;
  try {
    sigBytes = fromB64url(sig);
    payload = JSON.parse(dec.decode(fromB64url(body))) as TableTokenPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret, ['verify']),
    sigBytes as BufferSource,
    enc.encode(body),
  );
  if (!valid) return { ok: false, reason: 'bad_signature' };
  if (
    typeof payload.jti !== 'string' ||
    typeof payload.tid !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (nowSeconds >= payload.exp) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}

export function newTokenPayload(
  tableId: string,
  src: 'qr' | 'nfc',
  jti: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): TableTokenPayload {
  return { jti, tid: tableId, src, exp: nowSeconds + TABLE_TOKEN_TTL_SECONDS };
}

export function sessionExpiry(start: Date, hours = TABLE_SESSION_DEFAULT_HOURS): Date {
  return new Date(start.getTime() + hours * 3_600_000);
}
