import type { Metadata } from 'next';
import { Badge, Card } from '@/components/ui';
import { PostComposer } from '@/components/admin/PostComposer';
import { PostRowActions } from '@/components/admin/PostRowActions';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { formatDateTime, formatPrice } from '@/lib/media';
import { DEFAULT_PLAN_LIMITS } from '@provei/domain';

export const metadata: Metadata = { title: 'Publicações' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; tone: 'verde' | 'amarelo' | 'neutro' | 'erro' }> = {
  published: { label: 'Publicado', tone: 'verde' },
  processing: { label: 'A processar', tone: 'amarelo' },
  hidden: { label: 'Escondido', tone: 'neutro' },
  removed: { label: 'Removido', tone: 'erro' },
};

export default async function PublicacoesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ data: posts }, { count }, { data: lim }] = await Promise.all([
    sb.from('posts').select('id, dish_name, price_cents, status, type, published_at, view_count, save_count, created_at').eq('restaurant_id', ctx.restaurant.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(50),
    sb.from('posts').select('id', { count: 'exact', head: true }).eq('restaurant_id', ctx.restaurant.id).is('deleted_at', null).gte('created_at', monthStart.toISOString()),
    createServiceSupabase().from('plan_limits').select('max_posts_per_month').eq('plan', ctx.restaurant.plan).single(),
  ]);
  const max = lim?.max_posts_per_month ?? DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxPostsPerMonth;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Publicações</h1>
      <p className="text-tinta-2">{ctx.restaurant.plan === 'free' ? `Este mês: ${count ?? 0} de ${max} publicações do plano gratuito.` : `Este mês: ${count ?? 0} publicações.`}</p>
      <PostComposer restaurantId={ctx.restaurant.id} />
      <ul className="flex flex-col gap-2">
        {(posts ?? []).map((p) => (
          <li key={p.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.dish_name} {p.price_cents != null ? <span className="font-normal text-tinta-2">· {formatPrice(p.price_cents)}</span> : null}</p>
                <p className="text-sm text-tinta-2">{p.type === 'video' ? 'Vídeo' : 'Foto'} · {formatDateTime(p.published_at ?? p.created_at)} · {p.view_count} visualizações · {p.save_count} guardados</p>
              </div>
              <div className="flex items-center gap-2"><Badge tone={STATUS[p.status]?.tone ?? 'neutro'}>{STATUS[p.status]?.label ?? p.status}</Badge><PostRowActions restaurantId={ctx.restaurant.id} postId={p.id} status={p.status} /></div>
            </Card>
          </li>
        ))}
        {(posts ?? []).length === 0 ? <li className="text-tinta-2">Ainda não publicaste nada. O primeiro prato demora segundos.</li> : null}
      </ul>
    </div>
  );
}
