import type { Metadata } from 'next';
import { WaiterQueue } from '@/components/admin/WaiterQueue';
import { requireMemberPage } from '@/server/auth';
import { getQueue } from '@/server/actions/queue';

export const metadata: Metadata = { title: 'Fila de mesas' };
export const dynamic = 'force-dynamic';

export default async function FilaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug);
  const q = await getQueue(ctx.restaurant.id);
  return <WaiterQueue restaurantId={ctx.restaurant.id} isOwner={ctx.role === 'owner'} initial={q.ok ? q.data : { active: [], today: [], occupiedTables: [] }} />;
}
