import type { Metadata } from 'next';
import { ReceiptText } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { OrderBoard } from '@/components/admin/OrderBoard';
import { FLOOR, requireMemberPage } from '@/server/auth';
import { listStaffOrders } from '@/server/actions/orders';
import { getFlags } from '@/lib/flags';

export const metadata: Metadata = { title: 'Pedidos', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PedidosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, FLOOR);
  const flags = await getFlags(ctx.restaurant.id);
  if (!flags.ordering) {
    return <EmptyState icon={<ReceiptText size={40} />} title="Os pedidos estão desligados" description="Quando os pedidos pelo Provei forem ligados para este restaurante, aparecem aqui para entregar e receber." />;
  }
  const r = await listStaffOrders(ctx.restaurant.id, 'today');
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Pedidos de hoje</h1>
      <OrderBoard restaurantId={ctx.restaurant.id} mode="floor" initial={r.ok ? r.data : []} />
    </div>
  );
}
