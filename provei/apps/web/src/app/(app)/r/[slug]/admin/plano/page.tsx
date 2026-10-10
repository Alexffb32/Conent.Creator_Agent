import type { Metadata } from 'next';
import { Check, X } from 'lucide-react';
import { Badge, Card, CardTitle } from '@/components/ui';
import { PlanActions } from '@/components/admin/PlanActions';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { paymentsEnabled } from '@/server/payments';
import { eur, pricing } from '@/lib/pricing';
import { DEFAULT_PLAN_LIMITS } from '@provei/domain';

export const metadata: Metadata = { title: 'Plano' };
export const dynamic = 'force-dynamic';

export default async function PlanoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ pago?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const svc = createServiceSupabase();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [{ count: tables }, { count: posts }, { data: lim }, { data: sub }, payments] = await Promise.all([
    sb.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', ctx.restaurant.id),
    sb.from('posts').select('id', { count: 'exact', head: true }).eq('restaurant_id', ctx.restaurant.id).is('deleted_at', null).gte('created_at', monthStart.toISOString()),
    svc.from('plan_limits').select('*').eq('plan', ctx.restaurant.plan).single(),
    sb.from('subscriptions').select('status, current_period_end, stripe_customer_id').eq('restaurant_id', ctx.restaurant.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    paymentsEnabled(ctx.restaurant.id),
  ]);
  const free = ctx.restaurant.plan === 'free';
  const l = lim ?? { max_tables: DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxTables, max_posts_per_month: DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxPostsPerMonth };
  const Row = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <li className="flex items-center gap-2">{ok ? <Check size={18} className="text-verde" aria-label="incluído" /> : <X size={18} className="text-tinta-2" aria-label="não incluído" />}{children}</li>;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Plano</h1>
      {sp.pago ? <p role="status" className="rounded-m bg-verde-tinta p-3 text-verde-escuro">Pagamento recebido. O plano pago fica ativo em instantes.</p> : null}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><CardTitle>{free ? 'Plano gratuito' : 'Plano pago'}</CardTitle><Badge tone={free ? 'neutro' : 'amarelo'}>{free ? 'Atual' : 'Ativo'}</Badge></div>
        <ul className="flex flex-col gap-1.5">
          <Row ok>Mesas: {tables ?? 0}{free ? ` de ${l.max_tables}` : ''}</Row>
          <Row ok>Publicações este mês: {posts ?? 0}{free ? ` de ${l.max_posts_per_month}` : ''}</Row>
          <Row ok={!free}>Ofertas na mesa e no perfil</Row>
          <Row ok={!free}>Retenção de vídeo por segundo</Row>
          <Row ok={!free}>Pontos, níveis e cartão na Wallet</Row>
          <Row ok={!free}>Métricas completas</Row>
        </ul>
        {sub ? <p className="text-sm text-tinta-2">Subscrição: {sub.status}{sub.current_period_end ? ` · renova a ${new Date(sub.current_period_end).toLocaleDateString('pt-PT')}` : ''}</p> : null}
      </Card>
      {free ? (
        <Card className="flex flex-col gap-3 border-amarelo bg-amarelo-tinta">
          <CardTitle>Passar ao plano pago</CardTitle>
          <p>Instalação presencial ({eur(pricing.installEur)}, pagamento único) + {eur(pricing.monthlyEur)} por mês. Inclui configurar o perfil, as primeiras fotos e vídeos, os QR das mesas e formar a equipa.</p>
          <p className="text-sm text-tinta-2">Valores iniciais, ainda por validar com os primeiros restaurantes.</p>
        </Card>
      ) : null}
      <PlanActions restaurantId={ctx.restaurant.id} free={free} paymentsOn={payments} hasCustomer={Boolean(sub?.stripe_customer_id)} />
    </div>
  );
}
