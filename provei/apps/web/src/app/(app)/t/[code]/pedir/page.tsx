import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardTitle, LinkButton } from '@/components/ui';
import { OrderMenu } from '@/components/order/OrderMenu';
import { loadOrderMenu, tablePublicInfo } from '@/server/ordering';

export const metadata: Metadata = { title: 'Pedir à mesa', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function OrderAtTablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const info = await tablePublicInfo(code);
  if (!info) notFound();
  if (!info.ordering) {
    return (
      <div className="pv-container max-w-md pt-8">
        <Card className="flex flex-col gap-3 text-center">
          <CardTitle as="h1">{info.name}</CardTitle>
          <p className="text-tinta-2">Este restaurante ainda não recebe pedidos pelo Provei. Chama a equipa para pedir.</p>
          <LinkButton href={`/t/${code}`} variant="secondary">Voltar à mesa</LinkButton>
        </Card>
      </div>
    );
  }
  const menu = await loadOrderMenu(info.restaurant_id);
  return (
    <div className="pv-container max-w-xl pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{info.name}</h1>
        <p className="text-tinta-2">Mesa {info.table_label} · pedes sem criar conta</p>
      </header>
      <OrderMenu restaurantId={info.restaurant_id} kind="table" tableCode={code.toLowerCase()} menu={menu} needsName={false} />
    </div>
  );
}
