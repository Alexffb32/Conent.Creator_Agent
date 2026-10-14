import 'server-only';
import Stripe from 'stripe';
import { publicEnv, serverEnv } from '@/lib/env';
import { getFlags } from '@/lib/flags';
import { UserError } from './action';

export function stripeConfigured(): boolean {
  return Boolean(serverEnv.stripe.secretKey);
}

export function getStripe(): Stripe {
  if (!serverEnv.stripe.secretKey) throw new UserError('Os pagamentos ainda não estão configurados. Contacta-nos.');
  // Segurança: só modo de teste enquanto o dono não aprovar o modo real (ver docs/DECISIONS.md).
  if (serverEnv.stripe.secretKey.startsWith('sk_live_') && process.env.STRIPE_ALLOW_LIVE !== 'true') {
    throw new UserError('O modo real da Stripe está bloqueado. Usa chaves de teste.');
  }
  return new Stripe(serverEnv.stripe.secretKey);
}

export async function paymentsEnabled(restaurantId?: string): Promise<boolean> {
  const flags = await getFlags(restaurantId);
  return flags.payments && stripeConfigured();
}

export async function createRestaurantCheckout(input: { restaurantId: string; slug: string; email?: string | null }) {
  const { priceInstall, priceMonthly } = serverEnv.stripe;
  if (!priceMonthly) throw new UserError('O plano pago ainda não está configurado. Contacta-nos.');
  const stripe = getStripe();
  let installCents: number | null = null;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: priceMonthly, quantity: 1 }];
  if (priceInstall) {
    lineItems.push({ price: priceInstall, quantity: 1 });
    const p = await stripe.prices.retrieve(priceInstall);
    installCents = p.unit_amount;
  }
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: lineItems,
    customer_email: input.email ?? undefined,
    success_url: `${publicEnv.siteUrl}/r/${input.slug}/admin/plano?pago=1`,
    cancel_url: `${publicEnv.siteUrl}/r/${input.slug}/admin/plano`,
    metadata: { kind: 'restaurant_plan', restaurant_id: input.restaurantId, install_cents: installCents != null ? String(installCents) : '' },
    subscription_data: { metadata: { kind: 'restaurant_plan', restaurant_id: input.restaurantId } },
    locale: 'pt',
    allow_promotion_codes: true,
  });
}

export async function createAdFreeCheckout(input: { userId: string; email?: string | null }) {
  const price = serverEnv.stripe.priceAdFree;
  if (!price) throw new UserError('A assinatura sem anúncios ainda não está configurada.');
  return getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer_email: input.email ?? undefined,
    success_url: `${publicEnv.siteUrl}/perfil?semanuncios=1`,
    cancel_url: `${publicEnv.siteUrl}/perfil`,
    metadata: { kind: 'ad_free', user_id: input.userId },
    subscription_data: { metadata: { kind: 'ad_free', user_id: input.userId } },
    locale: 'pt',
  });
}

export async function createPortal(customerId: string, returnPath: string) {
  return getStripe().billingPortal.sessions.create({ customer: customerId, return_url: `${publicEnv.siteUrl}${returnPath}` });
}
