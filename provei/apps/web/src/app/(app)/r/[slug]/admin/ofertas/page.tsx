import type { Metadata } from 'next';
import { Card } from '@/components/ui';
import { OfferForm, RemoveOfferButton } from '@/components/admin/forms';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';

export const metadata: Metadata = { title: 'Ofertas' };
export const dynamic = 'force-dynamic';

export default async function OfertasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const { data: offers } = await sb.from('offers').select('id, title, description, ends_at, active').eq('restaurant_id', ctx.restaurant.id).order('ends_at', { ascending: false });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Ofertas</h1>
      <p className="text-tinta-2">As ofertas aparecem no ecrã da mesa e no perfil do restaurante enquanto forem válidas.</p>
      <OfferForm restaurantId={ctx.restaurant.id} allowed={ctx.restaurant.plan === 'paid'} />
      <ul className="flex flex-col gap-2">
        {(offers ?? []).map((o) => (
          <li key={o.id}><Card className="flex items-center justify-between gap-3"><div><p className="font-semibold">{o.title}</p><p className="text-sm text-tinta-2">Até {formatDateTime(o.ends_at)}</p></div><RemoveOfferButton restaurantId={ctx.restaurant.id} offerId={o.id} /></Card></li>
        ))}
      </ul>
    </div>
  );
}
