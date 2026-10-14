import { Badge, Card } from '@/components/ui';
import { ActionButton } from '@/components/adminpanel/ActionButton';
import { createServiceSupabase } from '@/lib/supabase/server';
import { setGlobalFlag, setRestaurantFlag } from '@/server/actions/admin';

export const dynamic = 'force-dynamic';

export default async function FlagsPage() {
  const svc = createServiceSupabase();
  const [{ data: flags }, { data: overrides }] = await Promise.all([
    svc.from('feature_flags').select('key, enabled, description').order('key'),
    svc.from('restaurant_flags').select('restaurant_id, key, enabled, restaurants(name)'),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Feature flags</h1>
      <p className="text-tinta-2">Ligam-se por configuração, sem novo deploy. Um restaurante pode ter um valor próprio que prevalece sobre o global.</p>
      <ul className="flex flex-col gap-2">
        {(flags ?? []).map((f) => (
          <li key={f.key}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-mono font-semibold">{f.key}</p><p className="text-sm text-tinta-2">{f.description}</p></div>
              <div className="flex items-center gap-2"><Badge tone={f.enabled ? 'verde' : 'neutro'}>{f.enabled ? 'Ligada' : 'Desligada'}</Badge><ActionButton variant="secondary" action={() => setGlobalFlag(f.key, !f.enabled)}>{f.enabled ? 'Desligar' : 'Ligar'}</ActionButton></div>
            </Card>
          </li>
        ))}
      </ul>
      {(overrides ?? []).length > 0 ? (
        <section aria-labelledby="ov"><h2 id="ov" className="pv-title mb-2 text-2xl text-verde-escuro">Exceções por restaurante</h2>
          <ul className="flex flex-col gap-2">{(overrides ?? []).map((o) => <li key={`${o.restaurant_id}${o.key}`}><Card className="flex items-center justify-between"><span>{(o.restaurants as unknown as { name: string })?.name} · <span className="font-mono">{o.key}</span> = {String(o.enabled)}</span><ActionButton variant="ghost" size="sm" action={() => setRestaurantFlag(o.restaurant_id, o.key, null)}>Remover</ActionButton></Card></li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
