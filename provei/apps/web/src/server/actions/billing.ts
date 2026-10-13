'use server';
import 'server-only';
import { redirect } from 'next/navigation';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { type ActionResult, run, UserError } from '../action';
import { requireMemberForAction, requireUserForAction } from '../auth';
import { createAdFreeCheckout, createPortal, createRestaurantCheckout, getStripe, paymentsEnabled } from '../payments';
import { audit } from '../audit';
import { getMailer } from '../mail';

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

/**
 * Função de livre resolução / cancelamento da assinatura sem anúncios (DL 24/2014; Diretiva (UE) 2023/2673).
 * Dentro de 14 dias: termina já. Depois: cancela no fim do período pago. Confirmação por e-mail (suporte duradouro).
 */
export async function withdrawAdFree(): Promise<ActionResult<{ withinWithdrawal: boolean; endsAt: string | null }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const svc = createServiceSupabase();
    const { data: sub } = await svc
      .from('user_subscriptions')
      .select('id, stripe_subscription_id, created_at, current_period_end, status')
      .eq('user_id', me.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) throw new UserError('Não encontrámos nenhuma assinatura ativa na tua conta.');
    const withinWithdrawal = Date.now() - new Date(sub.created_at).getTime() <= 14 * 24 * 3600 * 1000;
    if (sub.stripe_subscription_id) {
      const stripe = getStripe();
      if (withinWithdrawal) await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      else await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
    }
    const endsAt = withinWithdrawal ? new Date().toISOString() : sub.current_period_end;
    if (withinWithdrawal) {
      await svc.from('user_subscriptions').update({ status: 'canceled' }).eq('id', sub.id);
      await svc.from('profiles').update({ is_ad_free: false }).eq('id', me.id);
    }
    await audit({ actorId: me.id, action: withinWithdrawal ? 'subscription.withdrawal' : 'subscription.cancel', entity: 'user_subscriptions', entityId: sub.id });
    if (me.email) {
      const text = withinWithdrawal
        ? 'Confirmamos que exerceste o direito de livre resolução da assinatura Provei sem anúncios. A assinatura terminou hoje. O reembolso, se houver valor pago, é feito pelo mesmo meio de pagamento no prazo máximo de 14 dias.'
        : `Confirmamos o cancelamento da assinatura Provei sem anúncios. Mantém-se ativa até ${endsAt ? new Date(endsAt).toLocaleDateString('pt-PT') : 'ao fim do período pago'} e não será renovada.`;
      await getMailer().send({ to: me.email, subject: 'Provei · confirmação do fim da assinatura', text, html: `<p>${text}</p>` }).catch((e) => console.error('[withdraw mail]', e));
    }
    return { withinWithdrawal, endsAt };
  });
}
