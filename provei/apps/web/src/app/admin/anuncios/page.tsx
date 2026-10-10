import { Badge, Card } from '@/components/ui';
import { ActionButton } from '@/components/adminpanel/ActionButton';
import { CampaignForm } from '@/components/adminpanel/AdminForms';
import { createServiceSupabase } from '@/lib/supabase/server';
import { setCampaignStatus } from '@/server/actions/admin';
import { eur } from '@/lib/pricing';
import { formatDateTime } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AnunciosPage() {
  const svc = createServiceSupabase();
  const { data: camps } = await svc.from('ad_campaigns').select('*').order('created_at', { ascending: false });
  const stats = await Promise.all((camps ?? []).map(async (c) => {
    const [i, k] = await Promise.all([
      svc.from('ad_impressions').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id),
      svc.from('ad_clicks').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id),
    ]);
    return { id: c.id, imps: i.count ?? 0, clicks: k.count ?? 0 };
  }));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Anúncios</h1>
      <p className="text-tinta-2">Os cartões só aparecem com a flag <span className="font-mono">ads</span> ligada, com o rótulo “Patrocinado”, no máximo 1 em cada 8 e nunca em primeiro lugar.</p>
      <CampaignForm />
      <ul className="flex flex-col gap-2">
        {(camps ?? []).map((c) => {
          const s = stats.find((x) => x.id === c.id)!;
          const ctr = s.imps ? ((s.clicks / s.imps) * 100).toFixed(1) : '0,0';
          return (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{c.advertiser_name} <Badge tone={c.status === 'active' ? 'verde' : 'neutro'}>{c.status}</Badge> {c.is_demo ? <Badge tone="amarelo">fictícia</Badge> : null}</p>
                  <p className="text-sm text-tinta-2">{(c.creative as { headline?: string }).headline} · {formatDateTime(c.starts_at)} a {formatDateTime(c.ends_at)}</p>
                  <p className="text-sm">Orçamento {eur(c.budget_cents / 100)} · gasto {eur(c.spent_cents / 100)} · {s.imps} impressões · {s.clicks} cliques ({ctr}%)</p>
                </div>
                <div className="flex gap-2">
                  {c.status !== 'active' ? <ActionButton action={() => setCampaignStatus(c.id, 'active')}>Ativar</ActionButton> : <ActionButton variant="secondary" action={() => setCampaignStatus(c.id, 'paused')}>Pausar</ActionButton>}
                  {c.status !== 'ended' ? <ActionButton variant="ghost" action={() => setCampaignStatus(c.id, 'ended')}>Terminar</ActionButton> : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
