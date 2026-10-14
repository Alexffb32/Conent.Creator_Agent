import { Badge, Card } from '@/components/ui';
import { PlanForm } from '@/components/adminpanel/AdminForms';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';

export const dynamic = 'force-dynamic';

export default async function PlanosAdmin() {
  const [{ data }, flags] = await Promise.all([
    createServiceSupabase().from('restaurants').select('id, name, slug, plan, plan_since, verified_status').is('deleted_at', null).order('name').limit(100),
    getFlags(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Planos (ativação manual)</h1>
      <p className="text-tinta-2">{flags.payments ? 'Os pagamentos Stripe estão ligados; usa isto só para exceções.' : 'Com os pagamentos desligados, ativa aqui o plano pago depois de receber a instalação presencialmente. Fica auditado.'}</p>
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((r) => <li key={r.id}><Card className="flex flex-col gap-2"><p className="font-semibold">{r.name} <Badge tone={r.plan === 'paid' ? 'amarelo' : 'neutro'}>{r.plan === 'paid' ? 'pago' : 'gratuito'}</Badge></p><PlanForm restaurantId={r.id} plan={r.plan} /></Card></li>)}
      </ul>
    </div>
  );
}
