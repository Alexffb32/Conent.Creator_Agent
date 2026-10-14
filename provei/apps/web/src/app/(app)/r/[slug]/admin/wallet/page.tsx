import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';
import { Badge, Card, CardTitle, EmptyState } from '@/components/ui';
import { MANAGE, requireMemberPage } from '@/server/auth';
import { getFlags } from '@/lib/flags';
import { restaurantWalletReport } from '@/server/wallet/report';

export const metadata: Metadata = { title: 'Cartões na Wallet', robots: { index: false } };
export const dynamic = 'force-dynamic';

const fmt = (n: number) => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 }).format(n);
const VERDICT = { insufficient_data: 'neutro', no_effect: 'neutro', positive: 'verde', negative: 'erro' } as const;

export default async function RestaurantWalletPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, MANAGE);
  const flags = await getFlags(ctx.restaurant.id);
  if (!flags.wallet_apple && !flags.wallet_google) {
    return <EmptyState icon={<Wallet size={40} />} title="Os cartões na Wallet estão desligados" description="Quando forem ligados para este restaurante, vês aqui quantos clientes têm o cartão no telemóvel e o efeito dos avisos." />;
  }
  const r = await restaurantWalletReport(ctx.restaurant.id);
  const l = r.location;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Cartões na Wallet</h1>
      <Card className="flex flex-col gap-2">
        <CardTitle>Últimos {r.days} dias</CardTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums sm:grid-cols-3">
          <dt>Cartões emitidos (Apple / Google)</dt><dd>{r.issued.apple} / {r.issued.google}</dd>
          <dt>Cartões ativos (Apple / Google)</dt><dd>{r.active.apple} / {r.active.google}</dd>
          <dt>Telemóveis a receber atualizações</dt><dd>{r.devices}</dd>
          <dt>Avisos enviados</dt><dd>{r.noticesSent}</dd>
          <dt>Visitas e pedidos de quem tem cartão</dt><dd>{r.holderVisits}</dd>
          <dt>Recompensas trocadas por quem tem cartão</dt><dd>{r.holderRedemptions}</dd>
        </dl>
      </Card>
      <Card className="flex flex-col gap-3">
        <CardTitle>Aviso de proximidade: tem efeito?</CardTitle>
        {!flags.wallet_location && <p className="rounded-card bg-amarelo-tinta p-3">O aviso de proximidade está desligado neste restaurante: nenhum cartão tem localização, por isso não há nada a medir.</p>}
        <p className="text-tinta-2">
          9 em cada 10 cartões levam a localização do restaurante; 1 em cada 10 fica sem ela (grupo de controlo, escolhido ao acaso e sempre o mesmo).
          Comparamos as visitas por cartão dos dois grupos.
        </p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
          <dt>Com localização</dt><dd>{l.treated.cards} cartões · {fmt(l.treated.mean)} visitas por cartão</dd>
          <dt>Sem localização (controlo)</dt><dd>{l.control.cards} cartões · {fmt(l.control.mean)} visitas por cartão</dd>
          {l.ci95 && (<><dt>Diferença (intervalo de 95%)</dt><dd>{fmt(l.diff)} ({fmt(l.ci95[0])} a {fmt(l.ci95[1])})</dd></>)}
        </dl>
        <p><Badge tone={VERDICT[l.verdict]}>{l.message}</Badge></p>
        <p className="text-[15px] text-tinta-2">
          Limitações: o iPhone decide quando mostra a sugestão no ecrã de bloqueio e não nos diz quantas vezes a mostrou; não controlamos hora nem frequência.
          O Provei nunca recebe a localização dos clientes: a localização está no cartão e é o iPhone que a compara.
        </p>
      </Card>
    </div>
  );
}
