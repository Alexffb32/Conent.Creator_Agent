'use server';
import 'server-only';
import { redirect } from 'next/navigation';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { type ActionResult, run, UserError } from '../action';
import { requireMemberForAction, requireUserForAction } from '../auth';
import { createAdFreeCheckout, createPortal, createRestaurantCheckout, paymentsEnabled } from '../payments';

export async function startRestaurantCheckout(restaurantId: string): Promise<ActionResult> {
  const res = await run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    if (!(await paymentsEnabled(restaurantId))) throw new UserError('Os pagamentos ainda não estão ativos. Contacta-nos e ativamos o plano contigo.');
    if (ctx.restaurant.plan === 'paid') throw new UserError('Já tens o plano pago.');
    const s = await createRestaurantCheckout({ restaurantId, slug: ctx.restaurant.slug, email: ctx.me.email });
    if (!s.url) throw new Error('Sem URL de checkout');
    return s.url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}

export async function openBillingPortal(restaurantId: string): Promise<ActionResult> {
  const res = await run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const { data } = await createServiceSupabase().from('subscriptions').select('stripe_customer_id').eq('restaurant_id', restaurantId).not('stripe_customer_id', 'is', null).limit(1).maybeSingle();
    if (!data?.stripe_customer_id) throw new UserError('Ainda não há subscrição Stripe associada. Contacta-nos.');
    return (await createPortal(data.stripe_customer_id, `/r/${ctx.restaurant.slug}/admin/plano`)).url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}

export async function startAdFreeCheckout(): Promise<ActionResult> {
  const res = await run(async () => {
    const me = await requireUserForAction();
    const flags = await getFlags();
    if (!flags.ad_free_subscription || !(await paymentsEnabled())) throw new UserError('A assinatura sem anúncios ainda não está disponível.');
    const s = await createAdFreeCheckout({ userId: me.id, email: me.email });
    if (!s.url) throw new Error('Sem URL de checkout');
    return s.url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}
