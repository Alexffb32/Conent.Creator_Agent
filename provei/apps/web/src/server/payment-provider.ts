import 'server-only';
import { publicEnv } from '@/lib/env';
import { getStripe, stripeConfigured } from './payments';
import { UserError } from './action';

/**
 * Pagamento de pedidos. A Provei não detém fundos: a cobrança é feita diretamente na conta do restaurante
 * (Stripe Connect Express, "direct charge"), com comissão da Provei = 0. As taxas do processador são do restaurante.
 * Outro PSP (por exemplo, com MB WAY nativo) entra como outra implementação desta interface.
 */
export interface PaymentProvider {
  readonly name: 'stripe_connect';
  isReady(restaurant: { stripeAccountId: string | null; chargesEnabled: boolean }): boolean;
  /** Cria a sessão de pagamento e devolve o URL para onde levar o cliente. */
  startCheckout(input: {
    orderId: string;
    amountCents: number;
    restaurantName: string;
    stripeAccountId: string;
    returnPath: string;
  }): Promise<{ url: string }>;
  /** Onboarding do restaurante (conta Express) e link para concluir os dados. */
  onboardRestaurant(input: { restaurantId: string; existingAccountId: string | null; returnPath: string }): Promise<{ accountId: string; url: string }>;
}

export const stripeConnectProvider: PaymentProvider = {
  name: 'stripe_connect',
  isReady: (r) => stripeConfigured() && Boolean(r.stripeAccountId) && r.chargesEnabled,
  async startCheckout({ orderId, amountCents, restaurantName, stripeAccountId, returnPath }) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        // Sem payment_method_types: a Stripe mostra os métodos ativos na conta (cartão; Multibanco/MB WAY se ativos [VERIFY]).
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amountCents, product_data: { name: `Pedido em ${restaurantName}` } } }],
        payment_intent_data: { metadata: { kind: 'order', order_id: orderId } },
        metadata: { kind: 'order', order_id: orderId },
        success_url: `${publicEnv.siteUrl}${returnPath}${returnPath.includes('?') ? '&' : '?'}pago=1`,
        cancel_url: `${publicEnv.siteUrl}${returnPath}`,
        locale: 'pt',
      },
      { stripeAccount: stripeAccountId, idempotencyKey: `order-checkout-${orderId}` },
    );
    if (!session.url) throw new Error('Sessão de pagamento sem URL');
    return { url: session.url };
  },
  async onboardRestaurant({ restaurantId, existingAccountId, returnPath }) {
    const stripe = getStripe();
    const accountId =
      existingAccountId ??
      (
        await stripe.accounts.create({
          type: 'express',
          country: 'PT',
          capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
          metadata: { restaurant_id: restaurantId },
        })
      ).id;
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${publicEnv.siteUrl}${returnPath}`,
      return_url: `${publicEnv.siteUrl}${returnPath}?stripe=1`,
    });
    return { accountId, url: link.url };
  },
};

export function getPaymentProvider(): PaymentProvider {
  if (!stripeConfigured()) throw new UserError('Os pagamentos online ainda não estão configurados. Paga ao balcão.');
  return stripeConnectProvider;
}
