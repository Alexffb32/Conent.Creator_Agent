import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardTitle, LinkButton } from '@/components/ui';
import { OrderMenu } from '@/components/order/OrderMenu';
import { getFlags } from '@/lib/flags';
import { loadOrderMenu, pickupRestaurant } from '@/server/ordering';

export const metadata: Metadata = { title: 'Pedir para levantar', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PickupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await pickupRestaurant(slug);
  if (!r) notFound();
  const flags = await getFlags(r.id);
  if (!flags.ordering) {
    return (
      <div className="pv-container max-w-md pt-8">
        <Card className="flex flex-col gap-3 text-center">
          <CardTitle as="h1">{r.name}</CardTitle>
          <p className="text-tinta-2">Este restaurante ainda não recebe pedidos para levantar pelo Provei.</p>
          <LinkButton href={`/r/${r.slug}`} variant="secondary">Ver restaurante</LinkButton>
        </Card>
      </div>
    );
  }
  const menu = await loadOrderMenu(r.id);
  return (
    <div className="pv-container max-w-xl pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{r.name}</h1>
        <p className="text-tinta-2">Pedido para levantar ao balcão</p>
      </header>
      <OrderMenu restaurantId={r.id} kind="pickup" menu={menu} needsName />
    </div>
  );
}
