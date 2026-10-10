import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { type BillingStore, isActiveStatus } from './billing-core';

export function supabaseBillingStore(): BillingStore {
  const svc = createServiceSupabase();
  return {
    async claimEvent(id, type) {
      const { error } = await svc.from('stripe_events').insert({ id, type });
      if (!error) return true;
      if (error.code === '23505') return false;
      throw new Error(error.message);
    },
    async releaseEvent(id) {
      await svc.from('stripe_events').delete().eq('id', id);
    },
    async activateRestaurantPlan({ restaurantId, customerId, subscriptionId, periodEnd, installAmountCents }) {
      await svc.from('restaurants').update({ plan: 'paid', plan_since: new Date().toISOString() }).eq('id', restaurantId);
      await svc.from('subscriptions').upsert(
        { restaurant_id: restaurantId, plan: 'paid', status: 'active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, current_period_end: periodEnd?.toISOString() ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'stripe_subscription_id' },
      );
      if (installAmountCents != null) await svc.from('install_fees').insert({ restaurant_id: restaurantId, amount_cents: installAmountCents, status: 'paid', paid_at: new Date().toISOString() });
      await svc.from('audit_logs').insert({ actor_id: null, action: 'plan.activated.stripe', entity: 'restaurant', entity_id: restaurantId, restaurant_id: restaurantId });
    },
    async updateRestaurantSubscription({ subscriptionId, status, periodEnd }) {
      const { data } = await svc.from('subscriptions').update({ status, current_period_end: periodEnd?.toISOString() ?? undefined, updated_at: new Date().toISOString() }).eq('stripe_subscription_id', subscriptionId).select('restaurant_id');
      for (const row of data ?? []) {
        await svc.from('restaurants').update(isActiveStatus(status) || status === 'past_due' ? { plan: 'paid' } : { plan: 'free' }).eq('id', row.restaurant_id);
      }
    },
    async activateAdFree({ userId, customerId, subscriptionId, periodEnd }) {
      await svc.from('user_subscriptions').upsert({ user_id: userId, kind: 'ad_free', status: 'active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, current_period_end: periodEnd?.toISOString() ?? null }, { onConflict: 'stripe_subscription_id' });
      await svc.from('profiles').update({ is_ad_free: true }).eq('id', userId);
    },
    async updateAdFreeSubscription({ subscriptionId, status, periodEnd }) {
      const { data } = await svc.from('user_subscriptions').update({ status, current_period_end: periodEnd?.toISOString() ?? undefined }).eq('stripe_subscription_id', subscriptionId).select('user_id');
      for (const row of data ?? []) await svc.from('profiles').update({ is_ad_free: isActiveStatus(status) || status === 'past_due' }).eq('id', row.user_id);
    },
  };
}
