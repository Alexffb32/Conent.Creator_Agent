import { NextResponse } from 'next/server';
import { processStripeEvent, type StripeEventLite } from '@/server/billing-core';
import { supabaseBillingStore } from '@/server/billing-store';
import { getStripe, stripeConfigured } from '@/server/payments';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

/** Webhook assinado e idempotente. O corpo tem de ser lido em bruto para validar a assinatura. */
export async function POST(req: Request) {
  if (!stripeConfigured() || !serverEnv.stripe.webhookSecret) return NextResponse.json({ error: 'Pagamentos não configurados' }, { status: 503 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Sem assinatura' }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, serverEnv.stripe.webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });
  }
  try {
    const result = await processStripeEvent(supabaseBillingStore(), event as unknown as StripeEventLite);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error('[stripe-webhook]', e);
    return NextResponse.json({ error: 'Falha a processar' }, { status: 500 }); // Stripe volta a tentar
  }
}
