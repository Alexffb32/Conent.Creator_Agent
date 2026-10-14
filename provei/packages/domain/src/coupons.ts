/** Cupões: validação pura de um resgate. O desconto é aplicado na caixa do restaurante (não muda faturação). */

export interface Coupon {
  kind: 'percent' | 'amount' | 'item';
  value: number; // percent: 1–100; amount: cêntimos; item: 0
  startsAt: Date;
  endsAt: Date;
  maxRedemptions: number | null;
  perCustomerLimit: number;
  active: boolean;
}

export type CouponRefusal = 'inactive' | 'not_started' | 'expired' | 'sold_out' | 'customer_limit';

export function canRedeemCoupon(c: Coupon, usage: { total: number; byCustomer: number }, now = new Date()): { ok: true } | { ok: false; reason: CouponRefusal } {
  if (!c.active) return { ok: false, reason: 'inactive' };
  if (now < c.startsAt) return { ok: false, reason: 'not_started' };
  if (now > c.endsAt) return { ok: false, reason: 'expired' };
  if (c.maxRedemptions != null && usage.total >= c.maxRedemptions) return { ok: false, reason: 'sold_out' };
  if (usage.byCustomer >= c.perCustomerLimit) return { ok: false, reason: 'customer_limit' };
  return { ok: true };
}

export function couponLabel(c: Pick<Coupon, 'kind' | 'value'>): string {
  if (c.kind === 'percent') return `${c.value}% de desconto`;
  if (c.kind === 'amount') return `${(c.value / 100).toFixed(2).replace('.', ',')} € de desconto`;
  return 'Oferta';
}

export const COUPON_REFUSAL_LABEL: Record<CouponRefusal, string> = {
  inactive: 'Este cupão foi desativado.',
  not_started: 'Este cupão ainda não começou.',
  expired: 'Este cupão já terminou.',
  sold_out: 'Este cupão já atingiu o limite de usos.',
  customer_limit: 'Este cliente já usou este cupão.',
};

/** Código curto legível (sem 0/O/1/I). */
export function makeCouponCode(rand: () => number = Math.random): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += a[Math.floor(rand() * a.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}
