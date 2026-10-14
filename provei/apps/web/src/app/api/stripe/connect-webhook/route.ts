import { NextResponse } from 'next/server';
import { processStripeEvent, type StripeEventLite } from '@/server/billing-core';
import { supabaseBillingStore } from '@/server/billing-store';
import { getStripe, stripeConfigured } from '@/server/payments';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

/** Eventos das contas Connect dos restaurantes (pedidos pagos, estado da conta). Assinado e idempotente. */
export async function POST(req: Request) {
  if (!stripeConfigured() || !serverEnv.stripe.connectWebhookSecret) return NextResponse.json({ error: 'Pagamentos não configurados' }, { status: 503 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Sem assinatura' }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, serverEnv.stripe.connectWebhookSecret);
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });
  }
  try {
    const result = await processStripeEvent(supabaseBillingStore(), event as unknown as StripeEventLite);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error('[stripe-connect-webhook]', e);
    return NextResponse.json({ error: 'Falha a processar' }, { status: 500 });
  }
}
