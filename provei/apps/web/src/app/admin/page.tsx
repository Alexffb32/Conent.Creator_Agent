import { Card } from '@/components/ui';
import { createServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  const svc = createServiceSupabase();
  const count = async (t: string, f?: (q: ReturnType<typeof svc.from>) => unknown) => {
    const q = svc.from(t).select('id', { count: 'exact', head: true });
    const r = await (f ? (f(q as never) as typeof q) : q);
    return r.count ?? 0;
  };
  const [pending, reports, users, restaurants, posts] = await Promise.all([
    svc.from('restaurants').select('id', { count: 'exact', head: true }).eq('verified_status', 'pending'),
    svc.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    svc.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    svc.from('restaurants').select('id', { count: 'exact', head: true }).eq('verified_status', 'verified'),
    svc.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
  ]);
  void count;
  const items = [['Restaurantes por verificar', pending.count], ['Denúncias abertas', reports.count], ['Utilizadores', users.count], ['Restaurantes verificados', restaurants.count], ['Pratos publicados', posts.count]] as const;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Resumo</h1>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">{items.map(([l, n]) => <li key={l}><Card><p className="text-sm text-tinta-2">{l}</p><p className="pv-title text-4xl text-verde-escuro">{n ?? 0}</p></Card></li>)}</ul>
    </div>
  );
}
