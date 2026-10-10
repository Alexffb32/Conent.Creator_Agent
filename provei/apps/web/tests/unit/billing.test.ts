import { describe, expect, it } from 'vitest';
import { processStripeEvent, type BillingStore, type StripeEventLite } from '../../src/server/billing-core';

function memoryStore() {
  const seen = new Set<string>();
  const log: string[] = [];
  const store: BillingStore = {
    async claimEvent(id) {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    },
    async releaseEvent(id) {
      seen.delete(id);
    },
    async activateRestaurantPlan(i) {
      log.push(`plan:${i.restaurantId}:${i.installAmountCents}`);
    },
    async updateRestaurantSubscription(i) {
      log.push(`rsub:${i.subscriptionId}:${i.status}`);
    },
    async activateAdFree(i) {
      log.push(`adfree:${i.userId}`);
    },
    async updateAdFreeSubscription(i) {
      log.push(`asub:${i.subscriptionId}:${i.status}`);
    },
  };
  return { store, log, seen };
}

const checkout = (id: string, meta: Record<string, string>): StripeEventLite => ({
  id,
  type: 'checkout.session.completed',
  data: { object: { customer: 'cus_1', subscription: 'sub_1', metadata: meta } },
});

describe('webhook Stripe idempotente', () => {
  it('ativa o plano uma só vez mesmo com entrega repetida', async () => {
    const { store, log } = memoryStore();
    const ev = checkout('evt_1', { kind: 'restaurant_plan', restaurant_id: 'r1', install_cents: '49000' });
    expect(await processStripeEvent(store, ev)).toBe('processed');
    expect(await processStripeEvent(store, ev)).toBe('duplicate');
    expect(await processStripeEvent(store, ev)).toBe('duplicate');
    expect(log).toEqual(['plan:r1:49000']);
  });
  it('assinatura sem anúncios', async () => {
    const { store, log } = memoryStore();
    await processStripeEvent(store, checkout('evt_2', { kind: 'ad_free', user_id: 'u1' }));
    expect(log).toEqual(['adfree:u1']);
  });
  it('cancelamento e falha de pagamento', async () => {
    const { store, log } = memoryStore();
    await processStripeEvent(store, { id: 'e3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    await processStripeEvent(store, { id: 'e4', type: 'invoice.payment_failed', data: { object: { subscription: 'sub_1' } } });
    expect(log).toContain('rsub:sub_1:canceled');
    expect(log).toContain('rsub:sub_1:past_due');
  });
  it('ignora eventos desconhecidos e checkouts sem metadados', async () => {
    const { store } = memoryStore();
    expect(await processStripeEvent(store, { id: 'e5', type: 'charge.refunded', data: { object: {} } })).toBe('ignored');
    expect(await processStripeEvent(store, checkout('e6', {}))).toBe('ignored');
    expect(await processStripeEvent(store, { id: 'e7', type: 'invoice.paid', data: { object: {} } })).toBe('ignored');
  });
  it('liberta o evento se o tratamento falhar, para a Stripe repetir', async () => {
    const { store, seen } = memoryStore();
    store.activateRestaurantPlan = async () => {
      throw new Error('base de dados em baixo');
    };
    await expect(processStripeEvent(store, checkout('e8', { kind: 'restaurant_plan', restaurant_id: 'r1' }))).rejects.toThrow();
    expect(seen.has('e8')).toBe(false);
  });
});
