import type { Metadata } from 'next';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { DEFAULT_LEVELS, stampProgress } from '@provei/domain';
import { Badge, Card, EmptyState, QrImage } from '@/components/ui';
import { PersonalQr } from '@/components/loyalty/PersonalQr';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Os meus cartões' };
export const dynamic = 'force-dynamic';

export default async function CartaoPage() {
  const me = await requireUser('/cartao');
  const sb = await createServerSupabase();
  const [cards, programs, reds] = await Promise.all([
    sb.from('loyalty_cards').select('id, stamps, points, level, restaurant_id, restaurants(name, slug)').eq('user_id', me.id).order('updated_at', { ascending: false }),
    sb.from('loyalty_programs').select('restaurant_id, stamps_required'),
    sb.from('redemptions').select('id, code, reward_text, expires_at, restaurants(name)').eq('user_id', me.id).eq('status', 'issued').gt('expires_at', new Date().toISOString()),
  ]);
  const req = new Map((programs.data ?? []).map((p) => [p.restaurant_id, p.stamps_required]));
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Os meus cartões</h1>
      <Card className="flex flex-col items-center gap-2 border-amarelo bg-amarelo-tinta">
        <p className="font-semibold">{me.displayName} · {DEFAULT_LEVELS.find((l) => l.key === me.level)?.label} · {me.pointsTotal} pts</p>
        <PersonalQr />
      </Card>
      {(reds.data ?? []).length > 0 ? (
        <section aria-labelledby="recompensas" className="flex flex-col gap-2">
          <h2 id="recompensas" className="pv-title text-2xl text-verde-escuro">Recompensas prontas</h2>
          {(reds.data ?? []).map((r) => (
            <Card key={r.id} className="flex items-center gap-4 border-verde-fresco bg-verde-tinta">
              <QrImage text={`provei:r:${r.code}`} size={96} label={`QR da recompensa ${r.reward_text}`} />
              <div><p className="font-semibold">{r.reward_text}</p><p className="text-sm text-tinta-2">{(r.restaurants as unknown as { name: string }).name}</p><Badge tone="amarelo" className="mt-1 font-mono">{r.code}</Badge></div>
            </Card>
          ))}
        </section>
      ) : null}
      {(cards.data ?? []).length === 0 ? (
        <EmptyState icon={<Wallet size={40} />} title="Ainda não tens cartões" description="Quando confirmares a primeira visita, o cartão do restaurante aparece aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {(cards.data ?? []).map((c) => {
            const r = c.restaurants as unknown as { name: string; slug: string };
            const p = stampProgress(c.stamps, req.get(c.restaurant_id) ?? 8);
            return (
              <li key={c.id}>
                <Link href={`/cartao/${r.slug}`} className="block">
                  <Card className="flex flex-col gap-2 hover:bg-verde-tinta">
                    <div className="flex items-center justify-between"><p className="font-semibold">{r.name}</p><Badge tone="amarelo">{c.points} pts</Badge></div>
                    <div className="flex flex-wrap gap-1" role="img" aria-label={`${p.current} de ${p.required} carimbos`}>
                      {Array.from({ length: p.required }).map((_, i) => <span key={i} className={`h-5 w-5 rounded-pill border ${i < p.current ? 'border-verde bg-verde' : 'border-linha bg-nevoa'}`} />)}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

