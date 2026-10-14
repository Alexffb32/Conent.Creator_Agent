import { Badge, Card } from '@/components/ui';
import { ActionButton } from '@/components/adminpanel/ActionButton';
import { createServiceSupabase } from '@/lib/supabase/server';
import { setUserSuspended } from '@/server/actions/admin';

export const dynamic = 'force-dynamic';

export default async function UtilizadoresPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().replace(/[%,()]/g, ' ').slice(0, 40);
  let query = createServiceSupabase().from('profiles').select('id, display_name, handle, city, level, suspended_at, deleted_at, is_admin, is_demo').order('created_at', { ascending: false }).limit(50);
  if (q) query = query.or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`);
  const { data } = await query;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Utilizadores</h1>
      <form role="search"><label className="sr-only" htmlFor="uq">Pesquisar</label><input id="uq" name="q" defaultValue={q} placeholder="Nome ou @utilizador" className="min-h-touch w-full max-w-sm rounded-pill border border-linha bg-branco px-4" /></form>
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((u) => (
          <li key={u.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold">{u.display_name || '(sem nome)'} <span className="font-normal text-tinta-2">@{u.handle}</span></p><p className="flex gap-1 text-sm text-tinta-2">{u.city} · {u.level} {u.is_admin ? <Badge tone="amarelo">admin</Badge> : null} {u.suspended_at ? <Badge tone="erro">suspensa</Badge> : null} {u.deleted_at ? <Badge tone="neutro">apagada</Badge> : null}</p></div>
              {u.deleted_at ? null : <ActionButton variant={u.suspended_at ? 'secondary' : 'danger'} action={() => setUserSuspended(u.id, !u.suspended_at)} confirmText={u.suspended_at ? undefined : 'Suspender esta conta?'}>{u.suspended_at ? 'Reativar' : 'Suspender'}</ActionButton>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
