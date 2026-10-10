/**
 * Cria (de forma idempotente) os produtos e preços Stripe em MODO DE TESTE e configura o portal de cliente.
 * Uso: STRIPE_SECRET_KEY=sk_test_... pnpm --filter @provei/web tsx scripts/stripe-setup.ts
 * Imprime as variáveis STRIPE_PRICE_* para colocares no .env.local e na Vercel.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY ?? '';
if (!key.startsWith('sk_test_')) {
  console.error('Usa uma chave de TESTE (sk_test_...). Este script recusa chaves reais.');
  process.exit(1);
}
const stripe = new Stripe(key);
const eur = (n: number) => Math.round(n * 100);

async function ensure(lookupKey: string, name: string, unit: number, recurring: boolean) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  const product = await stripe.products.create({ name, metadata: { provei: lookupKey } });
  return stripe.prices.create({
    product: product.id,
    currency: 'eur',
    unit_amount: unit,
    lookup_key: lookupKey,
    ...(recurring ? { recurring: { interval: 'month' as const } } : {}),
  });
}

const install = await ensure('provei_install', 'Provei: instalação', eur(Number(process.env.PRICE_INSTALL_EUR ?? 490)), false);
const monthly = await ensure('provei_monthly', 'Provei: plano pago (mensal)', eur(Number(process.env.PRICE_MONTHLY_EUR ?? 99)), true);
const adFree = await ensure('provei_ad_free', 'Provei: sem anúncios (mensal)', eur(Number(process.env.PRICE_AD_FREE_EUR ?? 2.99)), true);

const portals = await stripe.billingPortal.configurations.list({ limit: 1, is_default: true });
if (!portals.data[0]) {
  await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Gere a tua subscrição do Provei' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
}

console.log('\nCola estas variáveis (Vercel e .env.local):');
console.log(`STRIPE_PRICE_INSTALL=${install.id}`);
console.log(`STRIPE_PRICE_MONTHLY=${monthly.id}`);
console.log(`STRIPE_PRICE_AD_FREE=${adFree.id}`);
console.log('\nWebhook em desenvolvimento: stripe listen --forward-to localhost:3000/api/stripe/webhook');
console.log('Em produção: criar endpoint https://<dominio>/api/stripe/webhook com os eventos');
console.log('checkout.session.completed, customer.subscription.*, invoice.paid, invoice.payment_failed');
