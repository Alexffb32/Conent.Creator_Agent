/**
 * Processamento de eventos Stripe, idempotente e testável: não depende do Stripe SDK nem do Supabase,
 * só de uma `BillingStore`. A implementação real está em billing-store.ts.
 */
export interface StripeEventLite {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export interface BillingStore {
  /** Regista o evento; devolve false se já tinha sido processado (idempotência). */
  claimEvent(id: string, type: string): Promise<boolean>;
  activateRestaurantPlan(input: { restaurantId: string; customerId: string | null; subscriptionId: string | null; periodEnd: Date | null; installAmountCents: number | null }): Promise<void>;
  updateRestaurantSubscription(input: { subscriptionId: string; status: string; periodEnd: Date | null }): Promise<void>;
  activateAdFree(input: { userId: string; customerId: string | null; subscriptionId: string | null; periodEnd: Date | null }): Promise<void>;
  updateAdFreeSubscription(input: { subscriptionId: string; status: string; periodEnd: Date | null }): Promise<void>;
  /** Pedido pago por Stripe Connect (cobrança direta na conta do restaurante). Só marca se o valor bater certo. */
  markOrderPaid(input: { orderId: string; paymentIntentId: string; amountCents: number }): Promise<'paid' | 'amount_mismatch' | 'not_found'>;
  markOrderPaymentFailed(input: { orderId: string; paymentIntentId: string }): Promise<void>;
  /** Estado da conta Connect do restaurante (account.updated). */
  setConnectAccountStatus(input: { accountId: string; chargesEnabled: boolean }): Promise<void>;
  /** Liberta o evento para novo processamento se o tratamento falhar. */
  releaseEvent(id: string): Promise<void>;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const date = (v: unknown): Date | null => (typeof v === 'number' ? new Date(v * 1000) : null);
const ACTIVE = new Set(['active', 'trialing']);

export async function processStripeEvent(store: BillingStore, event: StripeEventLite): Promise<'processed' | 'duplicate' | 'ignored'> {
  const isNew = await store.claimEvent(event.id, event.type);
  if (!isNew) return 'duplicate';
  try {
    const o = event.data.object;
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const meta = (o.metadata ?? {}) as Record<string, string>;
        const pi = str(o.id);
        if (meta.kind !== 'order' || !meta.order_id || !pi) return 'ignored';
        if (event.type === 'payment_intent.payment_failed') {
          await store.markOrderPaymentFailed({ orderId: meta.order_id, paymentIntentId: pi });
          return 'processed';
        }
        const amount = typeof o.amount_received === 'number' ? o.amount_received : typeof o.amount === 'number' ? o.amount : -1;
        const r = await store.markOrderPaid({ orderId: meta.order_id, paymentIntentId: pi, amountCents: amount });
        return r === 'paid' ? 'processed' : 'ignored';
      }
      case 'account.updated': {
        const id = str(o.id);
        if (!id) return 'ignored';
        await store.setConnectAccountStatus({ accountId: id, chargesEnabled: o.charges_enabled === true });
        return 'processed';
      }
      case 'checkout.session.completed': {
        const meta = (o.metadata ?? {}) as Record<string, string>;
        const customer = str(o.customer);
        const subscription = str(o.subscription);
        if (meta.kind === 'restaurant_plan' && meta.restaurant_id) {
          await store.activateRestaurantPlan({ restaurantId: meta.restaurant_id, customerId: customer, subscriptionId: subscription, periodEnd: null, installAmountCents: meta.install_cents ? Number(meta.install_cents) : null });
          return 'processed';
        }
        if (meta.kind === 'ad_free' && meta.user_id) {
          await store.activateAdFree({ userId: meta.user_id, customerId: customer, subscriptionId: subscription, periodEnd: null });
          return 'processed';
        }
        return 'ignored';
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const id = str(o.id);
        if (!id) return 'ignored';
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : (str(o.status) ?? 'active');
        const periodEnd = date(o.current_period_end);
        await store.updateRestaurantSubscription({ subscriptionId: id, status, periodEnd });
        await store.updateAdFreeSubscription({ subscriptionId: id, status, periodEnd });
        return 'processed';
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded': {
        const sub = str(o.subscription);
        if (!sub) return 'ignored';
        const status = event.type === 'invoice.payment_failed' ? 'past_due' : 'active';
        const periodEnd = date((o.lines as { data?: { period?: { end?: number } }[] } | undefined)?.data?.[0]?.period?.end);
        await store.updateRestaurantSubscription({ subscriptionId: sub, status, periodEnd });
        await store.updateAdFreeSubscription({ subscriptionId: sub, status, periodEnd });
        return 'processed';
      }
      default:
        return 'ignored';
    }
  } catch (e) {
    await store.releaseEvent(event.id);
    throw e;
  }
}

export const isActiveStatus = (s: string) => ACTIVE.has(s);
