import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { Card, CardTitle, EmptyState } from '@/components/ui';
import { CashClose } from '@/components/admin/CashClose';
import { MANAGE, requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime, formatPrice } from '@/lib/media';
import { getFlags } from '@/lib/flags';

export const metadata: Metadata = { title: 'Fecho de caixa', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CaixaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, MANAGE);
  const flags = await getFlags(ctx.restaurant.id);
  if (!flags.ordering) {
    return <EmptyState icon={<Wallet size={40} />} title="O fecho de caixa está desligado" description="Fica disponível quando os pedidos pelo Provei forem ligados para este restaurante." />;
  }
  const sb = await createServerSupabase();
  const { data: closes } = await sb.from('cash_closes').select('*').eq('restaurant_id', ctx.restaurant.id).order('period_end', { ascending: false }).limit(10);
  const last = closes?.[0];
  const now = new Date();
  const dayStart = new Date(now.getTime() - 18 * 3600_000);
  const from = last && new Date(last.period_end) > dayStart ? new Date(last.period_end) : dayStart;
  const { data: orders } = await sb
    .from('orders')
    .select('status, payment_status, payment_method, total_cents')
    .eq('restaurant_id', ctx.restaurant.id)
    .gte('created_at', from.toISOString())
    .lt('created_at', now.toISOString())
    .eq('is_synthetic', false);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Fecho de caixa</h1>
      <p className="text-tinta-2">Reconcilia o que entrou pela Stripe, o dinheiro registado e os cancelamentos. Isto não é um documento fiscal: a faturação continua no teu programa certificado.</p>
      <CashClose
        restaurantId={ctx.restaurant.id}
        from={from.toISOString()}
        to={now.toISOString()}
        orders={(orders ?? []).map((o) => ({ status: o.status, paymentStatus: o.payment_status, paymentMethod: o.payment_method, totalCents: o.total_cents }))}
      />
      <Card className="flex flex-col gap-3">
        <CardTitle>Fechos anteriores</CardTitle>
        {!closes?.length && <p className="text-tinta-2">Ainda não fechaste nenhum turno.</p>}
        <ul className="flex flex-col gap-2">
          {(closes ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-linha pb-2">
              <span>{formatDateTime(c.period_start)} → {formatDateTime(c.period_end)} · {c.orders_count} pedidos</span>
              <span className="tabular-nums">
                Stripe {formatPrice(c.stripe_cents)} · Dinheiro {formatPrice(c.cash_counted_cents)} ·{' '}
                <strong className={c.cash_diff_cents < 0 ? 'text-erro' : ''}>diferença {formatPrice(c.cash_diff_cents)}</strong>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
