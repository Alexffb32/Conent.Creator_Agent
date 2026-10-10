import type { Metadata } from 'next';
import { Badge } from '@/components/ui';
import { AdjustForm, LoyaltyProgramForm } from '@/components/admin/forms';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { DEFAULT_PROGRAM } from '@provei/domain';
import { formatDateTime } from '@/lib/media';

export const metadata: Metadata = { title: 'Fidelização' };
export const dynamic = 'force-dynamic';

export default async function FidelizacaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const [{ data: program }, { data: cards }, { data: reds }] = await Promise.all([
    sb.from('loyalty_programs').select('*').eq('restaurant_id', ctx.restaurant.id).maybeSingle(),
    sb.from('loyalty_cards').select('id, user_id, stamps, points, level, completed_cycles').eq('restaurant_id', ctx.restaurant.id).order('points', { ascending: false }).limit(30),
    sb.from('redemptions').select('id, code, reward_text, status, created_at, redeemed_at').eq('restaurant_id', ctx.restaurant.id).order('created_at', { ascending: false }).limit(30),
  ]);
  const ids = (cards ?? []).map((c) => c.user_id);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from('public_profiles').select('id, display_name, handle').in('id', ids);
    for (const p of ps ?? []) names.set(p.id, `${p.display_name || 'Cliente'} (@${p.handle})`);
  }
  const p = program ?? { stamps_required: DEFAULT_PROGRAM.stampsRequired, reward_text: 'Uma sobremesa por conta da casa', points_per_visit: DEFAULT_PROGRAM.pointsPerVisit, points_per_review_photo: DEFAULT_PROGRAM.pointsPerReviewPhoto, points_first_visit: DEFAULT_PROGRAM.pointsFirstVisit, min_interval_hours: DEFAULT_PROGRAM.minIntervalHours, active: true };
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Fidelização</h1>
      <LoyaltyProgramForm restaurantId={ctx.restaurant.id} free={ctx.restaurant.plan === 'free'} program={p} />
      <section aria-labelledby="cartoes" className="flex flex-col gap-2">
        <h2 id="cartoes" className="pv-title text-2xl text-verde-escuro">Cartões dos clientes</h2>
        {(cards ?? []).length === 0 ? <p className="text-tinta-2">Ainda ninguém tem cartão.</p> : (
          <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
            {(cards ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3"><span>{names.get(c.user_id) ?? 'Cliente'}</span><span className="flex gap-2"><Badge tone="neutro">{c.stamps}/{p.stamps_required} carimbos</Badge><Badge tone="amarelo">{c.points} pts</Badge><Badge>{c.level}</Badge></span></li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="resgates" className="flex flex-col gap-2">
        <h2 id="resgates" className="pv-title text-2xl text-verde-escuro">Resgates</h2>
        {(reds ?? []).length === 0 ? <p className="text-tinta-2">Sem resgates ainda. A equipa valida-os no Leitor de QR.</p> : (
          <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
            {(reds ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3"><span><span className="font-mono">{r.code}</span> · {r.reward_text}</span><span className="text-sm text-tinta-2">{r.status === 'redeemed' ? `Entregue ${formatDateTime(r.redeemed_at ?? r.created_at)}` : r.status === 'issued' ? 'Por entregar' : 'Expirado'}</span></li>
            ))}
          </ul>
        )}
      </section>
      <AdjustForm restaurantId={ctx.restaurant.id} />
    </div>
  );
}

