import { describe, expect, it } from 'vitest';
import { DEFAULT_SEND_POLICY, inQuietHours, requiredConsent, shouldAutoPause, shouldSend, type SendRequest } from '../src/messaging';
import { customersCsv, segmentFor } from '../src/customers';
import { canRedeemCoupon, couponLabel, makeCouponCode } from '../src/coupons';

const noon = new Date('2026-10-14T12:00:00Z'); // 13h em Lisboa (verão)
const base: SendRequest = {
  channel: 'whatsapp', purpose: 'marketing', restaurantId: 'rA', reason: 'Não vens há 45 dias',
  consents: { whatsapp_marketing: true }, history: [], lastVisitAt: null, restaurantPaused: false, now: noon,
};

describe('shouldSend', () => {
  it('marketing só com consentimento próprio do canal', () => {
    expect(shouldSend(base)).toEqual({ ok: true });
    expect(shouldSend({ ...base, consents: { whatsapp_utility: true } })).toEqual({ ok: false, reason: 'no_consent' });
    expect(shouldSend({ ...base, channel: 'wallet_push', consents: { whatsapp_marketing: true } })).toEqual({ ok: false, reason: 'no_consent' });
    expect(shouldSend({ ...base, channel: 'wallet_push', consents: { wallet_marketing: true } })).toEqual({ ok: true });
  });
  it('≤ 1 oferta por restaurante por semana e ≤ 3 no total', () => {
    const h = (rid: string, daysAgo: number) => ({ channel: 'email' as const, purpose: 'marketing' as const, restaurantId: rid, at: new Date(noon.getTime() - daysAgo * 86400000) });
    expect(shouldSend({ ...base, history: [h('rA', 3)] })).toEqual({ ok: false, reason: 'frequency_cap' });
    expect(shouldSend({ ...base, history: [h('rA', 8)] })).toEqual({ ok: true });
    expect(shouldSend({ ...base, history: [h('rB', 1), h('rC', 2), h('rD', 3)] })).toEqual({ ok: false, reason: 'frequency_cap' });
  });
  it('horas silenciosas, motivo concreto, pausa depois da visita e pausa automática', () => {
    expect(shouldSend({ ...base, now: new Date('2026-10-14T21:30:00Z') })).toEqual({ ok: false, reason: 'quiet_hours' });
    expect(shouldSend({ ...base, reason: null })).toEqual({ ok: false, reason: 'no_reason' });
    expect(shouldSend({ ...base, lastVisitAt: new Date(noon.getTime() - 3600000) })).toEqual({ ok: false, reason: 'cooldown' });
    expect(shouldSend({ ...base, restaurantPaused: true })).toEqual({ ok: false, reason: 'paused' });
  });
  it('transacional passa nas horas silenciosas; serviço respeita o interruptor e o limite diário', () => {
    const night = new Date('2026-10-14T22:00:00Z');
    expect(shouldSend({ ...base, purpose: 'transactional', channel: 'email', consents: {}, now: night })).toEqual({ ok: true });
    const svc = { ...base, purpose: 'service' as const, channel: 'email' as const, reason: 'review_request', consents: {} };
    expect(shouldSend(svc)).toEqual({ ok: true });
    expect(shouldSend({ ...svc, consents: { review_requests: false } })).toEqual({ ok: false, reason: 'no_consent' });
    const hist = Array.from({ length: 3 }, () => ({ channel: 'push' as const, purpose: 'service' as const, restaurantId: null, at: noon }));
    expect(shouldSend({ ...svc, history: hist })).toEqual({ ok: false, reason: 'frequency_cap' });
  });
  it('consentimento exigido e horas silenciosas no fuso de Lisboa', () => {
    expect(requiredConsent('whatsapp', 'service')).toBe('whatsapp_utility');
    expect(requiredConsent('email', 'transactional')).toBeNull();
    expect(inQuietHours(new Date('2026-01-14T08:30:00Z'), DEFAULT_SEND_POLICY.quietHours)).toBe(true);
    expect(inQuietHours(new Date('2026-01-14T09:30:00Z'), DEFAULT_SEND_POLICY.quietHours)).toBe(false);
  });
  it('pausa automática com mais de 5% de recusas e pelo menos 20 envios', () => {
    expect(shouldAutoPause(19, 5)).toBe(false);
    expect(shouldAutoPause(40, 2)).toBe(false);
    expect(shouldAutoPause(40, 3)).toBe(true);
  });
});

describe('base de clientes', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const d = (days: number) => new Date(now.getTime() - days * 86400000);
  it('segmentos', () => {
    expect(segmentFor({ visits: 1, orders: 0, firstSeen: d(5), lastSeen: d(5) }, now)).toBe('novo');
    expect(segmentFor({ visits: 3, orders: 1, firstSeen: d(200), lastSeen: d(10) }, now)).toBe('regular');
    expect(segmentFor({ visits: 2, orders: 0, firstSeen: d(200), lastSeen: d(60) }, now)).toBe('em_risco');
    expect(segmentFor({ visits: 5, orders: 0, firstSeen: d(400), lastSeen: d(120) }, now)).toBe('perdido');
  });
  it('CSV com BOM, separador ; e sem injeção de fórmulas', () => {
    const csv = customersCsv([{ ref: 'c1', firstName: '=HYPERLINK("x")', visits: 1, orders: 2, spendCents: 1950, points: 30, firstSeen: d(5), lastSeen: d(1) }], now);
    expect(csv.startsWith('﻿referencia;nome;segmento')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(';19.50;');
  });
});

describe('cupões', () => {
  const c = { kind: 'percent' as const, value: 10, startsAt: new Date('2026-10-01'), endsAt: new Date('2026-10-31'), maxRedemptions: 2, perCustomerLimit: 1, active: true };
  it('regras de resgate', () => {
    const at = new Date('2026-10-14');
    expect(canRedeemCoupon(c, { total: 0, byCustomer: 0 }, at)).toEqual({ ok: true });
    expect(canRedeemCoupon(c, { total: 2, byCustomer: 0 }, at)).toEqual({ ok: false, reason: 'sold_out' });
    expect(canRedeemCoupon(c, { total: 0, byCustomer: 1 }, at)).toEqual({ ok: false, reason: 'customer_limit' });
    expect(canRedeemCoupon(c, { total: 0, byCustomer: 0 }, new Date('2026-11-02'))).toEqual({ ok: false, reason: 'expired' });
    expect(canRedeemCoupon({ ...c, active: false }, { total: 0, byCustomer: 0 }, at)).toEqual({ ok: false, reason: 'inactive' });
  });
  it('rótulos e códigos', () => {
    expect(couponLabel({ kind: 'amount', value: 250 })).toBe('2,50 € de desconto');
    expect(makeCouponCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});
