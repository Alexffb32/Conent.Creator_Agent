import { Badge, Card } from '@/components/ui';
import { ActionButton } from '@/components/adminpanel/ActionButton';
import { createServiceSupabase } from '@/lib/supabase/server';
import { verifyRestaurant } from '@/server/actions/admin';
import { formatDateTime } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function RestaurantesAdmin({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const estado = ['pending', 'verified', 'rejected'].includes(sp.estado ?? '') ? sp.estado! : 'pending';
  const { data } = await createServiceSupabase().from('restaurants').select('id, name, slug, city, address, created_at, verified_status, is_demo').eq('verified_status', estado).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Verificação de restaurantes</h1>
      <nav aria-label="Estado" className="flex gap-2">
        {[['pending', 'Por verificar'], ['verified', 'Verificados'], ['rejected', 'Rejeitados']].map(([k, l]) => <a key={k} href={`?estado=${k}`} aria-current={estado === k ? 'page' : undefined} className={`inline-flex min-h-touch items-center rounded-pill px-4 text-sm font-semibold ${estado === k ? 'bg-verde text-branco' : 'border border-linha bg-branco'}`}>{l}</a>)}
      </nav>
      {(data ?? []).length === 0 ? <p className="text-tinta-2">Nada nesta lista.</p> : null}
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((r) => (
          <li key={r.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold">{r.name} {r.is_demo ? <Badge tone="amarelo">fictício</Badge> : null}</p><p className="text-sm text-tinta-2">/r/{r.slug} · {r.city} · {r.address} · criado {formatDateTime(r.created_at)}</p></div>
              <div className="flex gap-2">
                {estado !== 'verified' ? <ActionButton action={() => verifyRestaurant(r.id, 'verified')}>Aprovar</ActionButton> : null}
                {estado !== 'rejected' ? <ActionButton variant="secondary" action={() => verifyRestaurant(r.id, 'rejected')} confirmText="Rejeitar este restaurante?">Rejeitar</ActionButton> : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
