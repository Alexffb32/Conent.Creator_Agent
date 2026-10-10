import type { Metadata } from 'next';
import { Card, CardTitle, LinkButton } from '@/components/ui';
import { BarChart } from '@/components/admin/BarChart';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { passedFiveSeconds, retentionCurve } from '@provei/domain';

export const metadata: Metadata = { title: 'Retenção de vídeo' };
export const dynamic = 'force-dynamic';

export default async function RetencaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  if (ctx.restaurant.plan !== 'paid') {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="pv-title text-4xl text-verde-escuro">Retenção de vídeo</h1>
        <Card className="flex flex-col gap-3 border-amarelo bg-amarelo-tinta"><p>Vê a que segundo as pessoas saem de cada vídeo. Faz parte do plano pago.</p><LinkButton href={`/r/${slug}/admin/plano`}>Ver o plano</LinkButton></Card>
      </div>
    );
  }
  const sb = await createServerSupabase();
  const { data: posts } = await sb.from('posts').select('id, dish_name, media_assets(duration_ms)').eq('restaurant_id', ctx.restaurant.id).eq('type', 'video').is('deleted_at', null).order('created_at', { ascending: false }).limit(20);
  const ids = (posts ?? []).map((p) => p.id);
  const { data: buckets } = ids.length ? await sb.from('video_watch_buckets').select('post_id, second, views').in('post_id', ids) : { data: [] };
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Retenção de vídeo</h1>
      <p className="text-tinta-2">Percentagem de quem chegou a cada segundo, face a quem começou o vídeo.</p>
      {(posts ?? []).length === 0 ? <p>Ainda não tens vídeos publicados.</p> : null}
      {(posts ?? []).map((p) => {
        const media = p.media_assets as unknown as { duration_ms: number | null } | null;
        const dur = Math.min(30, Math.ceil((media?.duration_ms ?? 15000) / 1000));
        const curve = retentionCurve((buckets ?? []).filter((b) => b.post_id === p.id), dur);
        const started = curve[0]?.views ?? 0;
        return (
          <Card key={p.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2"><CardTitle className="text-xl">{p.dish_name}</CardTitle><span className="text-sm text-tinta-2">{started} visualizações</span></div>
            <BarChart data={curve.map((c) => ({ label: `${c.second}s`, value: c.pct }))} label={`Retenção por segundo de ${p.dish_name}`} />
            <p className="text-sm">{started === 0 ? 'Sem dados ainda.' : passedFiveSeconds(curve) ? 'A maioria passa os 5 segundos.' : 'Menos de metade passa os 5 segundos: experimenta um início mais forte.'}</p>
          </Card>
        );
      })}
    </div>
  );
}
