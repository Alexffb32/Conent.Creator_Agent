import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { stampProgress, DEFAULT_LEVELS } from '@provei/domain';
import { Badge, Card, CardTitle } from '@/components/ui';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { walletAvailability } from '@/server/wallet';
import { formatDateTime } from '@/lib/media';

export const metadata: Metadata = { title: 'Cartão de fidelização' };
export const dynamic = 'force-dynamic';

export default async function CartaoRestaurantePage({ params }: { params: Promise<{ restaurante: string }> }) {
  const { restaurante } = await params;
  const me = await requireUser(`/cartao/${restaurante}`);
  const sb = await createServerSupabase();
  const { data: r } = await sb.from('restaurants').select('id, name, slug, plan').eq('slug', restaurante).maybeSingle();
  if (!r) notFound();
  const [{ data: card }, { data: program }, flags] = await Promise.all([
    sb.from('loyalty_cards').select('id, stamps, points, level, completed_cycles').eq('user_id', me.id).eq('restaurant_id', r.id).maybeSingle(),
    sb.from('loyalty_programs').select('stamps_required, reward_text').eq('restaurant_id', r.id).maybeSingle(),
    getFlags(r.id),
  ]);
  const events = card ? (await sb.from('loyalty_events').select('id, type, delta, reason, created_at').eq('card_id', card.id).order('created_at', { ascending: false }).limit(30)).data ?? [] : [];
  const p = stampProgress(card?.stamps ?? 0, program?.stamps_required ?? 8);
  const wallet = flags.wallet && r.plan === 'paid' ? walletAvailability() : { apple: false, google: false };
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <Link href="/cartao" className="text-sm font-semibold text-verde underline">← Todos os cartões</Link>
      <h1 className="pv-title text-4xl text-verde-escuro">{r.name}</h1>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><CardTitle className="text-2xl">{DEFAULT_LEVELS.find((l) => l.key === card?.level)?.label ?? 'Convidado'}</CardTitle><Badge tone="amarelo">{card?.points ?? 0} pontos</Badge></div>
        <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${p.current} de ${p.required} carimbos`}>
          {Array.from({ length: p.required }).map((_, i) => <span key={i} className={`h-8 w-8 rounded-pill border ${i < p.current ? 'border-verde bg-verde' : 'border-linha bg-nevoa'}`} />)}
        </div>
        <p className="text-tinta-2">{program?.reward_text ?? 'Recompensa por definir'} · faltam {p.missing} carimbos. Cartões completos: {card?.completed_cycles ?? 0}.</p>
        {wallet.apple || wallet.google ? (
          <div className="flex flex-wrap gap-2">
            {wallet.apple ? <a className="inline-flex min-h-touch items-center rounded-pill bg-tinta px-5 font-semibold text-branco" href={`/api/wallet/apple/${r.slug}`}>Adicionar ao Apple Wallet</a> : null}
            {wallet.google ? <a className="inline-flex min-h-touch items-center rounded-pill bg-tinta px-5 font-semibold text-branco" href={`/api/wallet/google/${r.slug}`}>Adicionar ao Google Wallet</a> : null}
          </div>
        ) : null}
      </Card>
      <section aria-labelledby="movimentos" className="flex flex-col gap-2">
        <h2 id="movimentos" className="pv-title text-2xl text-verde-escuro">Movimentos</h2>
        {events.length === 0 ? <p className="text-tinta-2">Sem movimentos ainda.</p> : (
          <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-3">
                <div><p className="font-semibold">{e.type === 'stamp' ? 'Carimbo' : e.type === 'points' ? 'Pontos' : e.type === 'redeem' ? 'Recompensa' : 'Ajuste'}</p><p className="text-sm text-tinta-2">{e.reason} · {formatDateTime(e.created_at)}</p></div>
                <span className={e.delta < 0 ? 'text-erro' : 'text-verde-escuro'}>{e.delta > 0 ? '+' : ''}{e.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
