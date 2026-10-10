const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1

/** Código curto de resgate legível. `random` injetável para testes. */
export function makeRedemptionCode(random: (n: number) => number = (n) => Math.floor(Math.random() * n), len = 8): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[random(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export function normalizeCode(input: string): string {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function redemptionState(r: { redeemedAt: Date | null; expiresAt: Date }, now: Date): 'issued' | 'redeemed' | 'expired' {
  if (r.redeemedAt) return 'redeemed';
  return now >= r.expiresAt ? 'expired' : 'issued';
}
