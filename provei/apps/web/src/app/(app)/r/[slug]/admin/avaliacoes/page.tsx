import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { Badge, Card, RatingStars } from '@/components/ui';
import { ReviewReply } from '@/components/admin/forms';
import { ReportButton } from '@/components/restaurant/ReportButton';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';

export const metadata: Metadata = { title: 'Avaliações e feedback' };
export const dynamic = 'force-dynamic';

export default async function AvaliacoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const [{ data: reviews }, { data: feedback }] = await Promise.all([
    sb.from('reviews').select('id, rating, text, verified, created_at, user_id, review_replies(body)').eq('restaurant_id', ctx.restaurant.id).eq('status', 'published').order('created_at', { ascending: false }).limit(50),
    sb.from('private_feedback').select('id, message, created_at, user_id').eq('restaurant_id', ctx.restaurant.id).order('created_at', { ascending: false }).limit(50),
  ]);
  const ids = [...new Set([...(reviews ?? []).map((r) => r.user_id), ...(feedback ?? []).map((f) => f.user_id)])];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from('public_profiles').select('id, display_name, handle').in('id', ids);
    for (const p of ps ?? []) names.set(p.id, p.display_name || `@${p.handle}`);
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="pv-title text-4xl text-verde-escuro">Avaliações e feedback</h1>
      <section aria-labelledby="av" className="flex flex-col gap-3">
        <h2 id="av" className="pv-title text-2xl text-verde-escuro">Avaliações públicas</h2>
        {(reviews ?? []).length === 0 ? <p className="text-tinta-2">Ainda sem avaliações.</p> : null}
        {(reviews ?? []).map((r) => {
          const reply = Array.isArray(r.review_replies) ? r.review_replies[0] : r.review_replies;
          return (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{names.get(r.user_id) ?? 'Cliente'}</span><RatingStars value={r.rating} />{r.verified ? <Badge><ShieldCheck size={14} aria-hidden /> Visita verificada</Badge> : null}<time className="text-sm text-tinta-2" dateTime={r.created_at}>{formatDateTime(r.created_at)}</time></div>
              {r.text ? <p>{r.text}</p> : null}
              {reply ? <p className="rounded-m bg-nevoa p-3 text-sm"><strong>A tua resposta:</strong> {(reply as { body: string }).body}</p> : <ReviewReply reviewId={r.id} />}
              <div><ReportButton targetType="review" targetId={r.id} /></div>
            </Card>
          );
        })}
      </section>
      <section aria-labelledby="fb" className="flex flex-col gap-3">
        <h2 id="fb" className="pv-title text-2xl text-verde-escuro">Feedback privado</h2>
        <p className="text-sm text-tinta-2">Só tu vês estas mensagens.</p>
        {(feedback ?? []).length === 0 ? <p className="text-tinta-2">Sem mensagens.</p> : null}
        {(feedback ?? []).map((f) => <Card key={f.id}><p>{f.message}</p><p className="mt-1 text-sm text-tinta-2">{names.get(f.user_id) ?? 'Cliente'} · {formatDateTime(f.created_at)}</p></Card>)}
      </section>
    </div>
  );
}
