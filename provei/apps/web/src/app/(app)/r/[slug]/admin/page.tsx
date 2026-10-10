import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardTitle, LinkLike } from '@/components/admin/ui-shim';
import { BarChart } from '@/components/admin/BarChart';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Visão geral' };
export const dynamic = 'force-dynamic';

const METRICS = [
  { type: 'view', label: 'Visualizações' },
  { type: 'follow', label: 'Novos seguidores' },
  { type: 'save', label: 'Guardados' },
  { type: 'visit', label: 'Visitas verificadas' },
  { type: 'call', label: 'Chamadas de mesa' },
] as const;

export default async function AdminHome({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dias?: string; novo?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireMemberPage(slug);
  if (ctx.role === 'staff') redirect(`/r/${slug}/admin/fila`);
  const days = sp.dias === '30' ? 30 : 7;
  const sb = await createServerSupabase();
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const [daily, followers, redemptions, posts] = await Promise.all([
    sb.from('analytics_daily').select('day, type, count').eq('restaurant_id', ctx.restaurant.id).gte('day', since),
    sb.from('restaurants').select('follower_count').eq('id', ctx.restaurant.id).single(),
    sb.from('redemptions').select('id', { count: 'exact', head: true }).eq('restaurant_id', ctx.restaurant.id).eq('status', 'redeemed').gte('redeemed_at', since),
    sb.from('posts').select('id', { count: 'exact', head: true }).eq('restaurant_id', ctx.restaurant.id).eq('status', 'published').is('deleted_at', null),
  ]);
  const dayList = Array.from({ length: days }, (_, i) => new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
  const sum = (type: string) => (daily.data ?? []).filter((d) => d.type === type).reduce((a, d) => a + d.count, 0);
  const series = (type: string) => dayList.map((day) => ({ label: day.slice(5).replace('-', '/'), value: (daily.data ?? []).find((d) => d.day === day && d.type === type)?.count ?? 0 }));
  const basic = ctx.restaurant.plan === 'free';
  return (
    <div className="flex flex-col gap-5">
      {sp.novo ? <p role="status" className="rounded-m bg-verde-tinta p-3 text-verde-escuro">Restaurante criado! Completa o perfil, cria as mesas e publica o primeiro prato.</p> : null}
      <div className="flex items-center justify-between gap-3">
        <h1 className="pv-title text-4xl text-verde-escuro">Visão geral</h1>
        <div className="inline-flex rounded-pill border border-linha bg-branco p-1 text-sm font-semibold">
          <Link href="?dias=7" aria-current={days === 7 ? 'page' : undefined} className={`inline-flex min-h-touch items-center rounded-pill px-4 ${days === 7 ? 'bg-verde text-branco' : ''}`}>7 dias</Link>
          <Link href="?dias=30" aria-current={days === 30 ? 'page' : undefined} className={`inline-flex min-h-touch items-center rounded-pill px-4 ${days === 30 ? 'bg-verde text-branco' : ''}`}>30 dias</Link>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <li><Card><p className="text-sm text-tinta-2">Seguidores</p><p className="pv-title text-4xl text-verde-escuro">{followers.data?.follower_count ?? 0}</p></Card></li>
        <li><Card><p className="text-sm text-tinta-2">Pratos publicados</p><p className="pv-title text-4xl text-verde-escuro">{posts.count ?? 0}</p></Card></li>
        <li><Card><p className="text-sm text-tinta-2">Resgates ({days} d)</p><p className="pv-title text-4xl text-verde-escuro">{redemptions.count ?? 0}</p></Card></li>
        <li><Card><p className="text-sm text-tinta-2">Visitas ({days} d)</p><p className="pv-title text-4xl text-verde-escuro">{sum('visit')}</p></Card></li>
      </ul>
      <div className="grid gap-4 md:grid-cols-2">
        {METRICS.filter((m) => !basic || ['view', 'follow', 'visit'].includes(m.type)).map((m) => (
          <Card key={m.type} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between"><CardTitle className="text-xl">{m.label}</CardTitle><span className="pv-title text-3xl">{sum(m.type)}</span></div>
            <BarChart data={series(m.type)} label={`${m.label} nos últimos ${days} dias`} />
          </Card>
        ))}
      </div>
      {basic ? <Card className="border-amarelo bg-amarelo-tinta">As métricas completas (guardados, chamadas e retenção de vídeo) fazem parte do plano pago. <LinkLike href={`/r/${slug}/admin/plano`}>Ver plano</LinkLike></Card> : null}
    </div>
  );
}
