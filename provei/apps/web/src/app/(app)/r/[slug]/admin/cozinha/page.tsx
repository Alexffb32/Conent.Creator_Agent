import type { Metadata } from 'next';
import { ChefHat } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { OrderBoard } from '@/components/admin/OrderBoard';
import { KITCHEN, requireMemberPage } from '@/server/auth';
import { listStaffOrders } from '@/server/actions/orders';
import { getFlags } from '@/lib/flags';

export const metadata: Metadata = { title: 'Cozinha', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CozinhaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, KITCHEN);
  const flags = await getFlags(ctx.restaurant.id);
  if (!flags.kds || !flags.ordering) {
    return <EmptyState icon={<ChefHat size={40} />} title="O ecrã de cozinha está desligado" description="Os pedidos na mesa ainda não estão ativos neste restaurante. Quando forem ligados, os pedidos aparecem aqui em tempo real." />;
  }
  const r = await listStaffOrders(ctx.restaurant.id, 'active');
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Cozinha</h1>
      <OrderBoard restaurantId={ctx.restaurant.id} mode="kitchen" initial={r.ok ? r.data : []} />
    </div>
  );
}
