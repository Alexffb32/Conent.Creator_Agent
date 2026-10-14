import type { Metadata } from 'next';
import { ChefHat } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { KITCHEN, requireMemberPage } from '@/server/auth';
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
  return <EmptyState icon={<ChefHat size={40} />} title="Ecrã de cozinha" description="Em construção (fase 2)." />;
}
