import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderTicket } from '@/components/order/OrderTicket';
import { createServerSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { loadOrder } from '@/server/actions/orders';

export const metadata: Metadata = { title: 'O teu pedido', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string; pago?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const guestKey = sp.k ?? null;
  const order = await loadOrder(id, guestKey);
  if (!order) notFound();
  const sb = await createServerSupabase();
  const [{ data: r }, flags] = await Promise.all([
    sb.from('restaurants').select('name, stripe_charges_enabled').eq('id', order.restaurant_id).maybeSingle(),
    getFlags(order.restaurant_id),
  ]);
  const canPayOnline = flags.ordering && flags.payments && Boolean(r?.stripe_charges_enabled);
  return (
    <div className="pv-container max-w-md pt-6">
      <OrderTicket initial={order} guestKey={guestKey} restaurantName={r?.name ?? 'Restaurante'} canPayOnline={canPayOnline} justPaid={sp.pago === '1'} />
    </div>
  );
}
