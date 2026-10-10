import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { requireMemberPage } from '@/server/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug);
  return (
    <div className="pv-container flex flex-col gap-4 pt-4 lg:flex-row lg:gap-8">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="mb-3 flex items-center justify-between lg:flex-col lg:items-start lg:gap-2">
          <Link href={`/r/${slug}`} className="pv-title text-2xl text-verde-escuro">{ctx.restaurant.name}</Link>
          <div className="flex gap-1.5">
            <Badge tone={ctx.restaurant.plan === 'paid' ? 'amarelo' : 'neutro'}>{ctx.restaurant.plan === 'paid' ? 'Plano pago' : 'Plano gratuito'}</Badge>
            <Badge tone="neutro">{ctx.role === 'owner' ? 'Dono' : 'Equipa'}</Badge>
          </div>
        </div>
        <AdminNav slug={slug} role={ctx.role} />
      </aside>
      <div className="min-w-0 flex-1 pb-8">
        {ctx.restaurant.verifiedStatus !== 'verified' ? (
          <p role="status" className="mb-4 rounded-m bg-amarelo-tinta p-3 text-sm">
            {ctx.restaurant.verifiedStatus === 'pending' ? 'O restaurante está em verificação. Só tu o vês até a equipa Provei aprovar.' : 'O restaurante foi rejeitado. Fala connosco para resolver.'}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
