import { createServiceSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ acao?: string; restaurante?: string; ator?: string }> }) {
  const sp = await searchParams;
  let q = createServiceSupabase().from('audit_logs').select('id, ts, actor_id, action, entity, entity_id, restaurant_id, meta, ip_hash').order('ts', { ascending: false }).limit(200);
  if (sp.acao) q = q.ilike('action', `%${sp.acao.replace(/[%,()]/g, '')}%`);
  if (sp.restaurante && /^[0-9a-f-]{36}$/.test(sp.restaurante)) q = q.eq('restaurant_id', sp.restaurante);
  if (sp.ator && /^[0-9a-f-]{36}$/.test(sp.ator)) q = q.eq('actor_id', sp.ator);
  const { data } = await q;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Auditoria</h1>
      <form className="flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="f-acao">Ação</label><input id="f-acao" name="acao" defaultValue={sp.acao} placeholder="Ação (ex.: plan)" className="min-h-touch rounded-pill border border-linha bg-branco px-4" />
        <label className="sr-only" htmlFor="f-rest">Restaurante</label><input id="f-rest" name="restaurante" defaultValue={sp.restaurante} placeholder="ID do restaurante" className="min-h-touch rounded-pill border border-linha bg-branco px-4" />
        <label className="sr-only" htmlFor="f-ator">Autor</label><input id="f-ator" name="ator" defaultValue={sp.ator} placeholder="ID do autor" className="min-h-touch rounded-pill border border-linha bg-branco px-4" />
        <button className="min-h-touch rounded-pill bg-verde px-5 font-semibold text-branco">Filtrar</button>
      </form>
      <div className="overflow-x-auto rounded-m border border-linha bg-branco">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Registos de auditoria</caption>
          <thead className="bg-nevoa"><tr><th scope="col" className="p-3">Quando</th><th scope="col" className="p-3">Ação</th><th scope="col" className="p-3">Entidade</th><th scope="col" className="p-3">Autor</th><th scope="col" className="p-3">Detalhes</th></tr></thead>
          <tbody>
            {(data ?? []).map((l) => <tr key={l.id} className="border-t border-linha align-top"><td className="p-3 whitespace-nowrap">{formatDateTime(l.ts)}</td><td className="p-3 font-mono">{l.action}</td><td className="p-3">{l.entity} {l.entity_id?.slice(0, 8)}</td><td className="p-3 font-mono">{l.actor_id?.slice(0, 8) ?? 'sistema'}</td><td className="p-3 break-all font-mono text-xs">{JSON.stringify(l.meta)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
