import { Card } from '@/components/ui';
import { createServiceSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';
import { NoticeDecision } from './NoticeDecision';

export const dynamic = 'force-dynamic';

const CATEGORY: Record<string, string> = { illegal: 'Conteúdo ilegal', ip: 'Direitos de autor/marca', privacy: 'Privacidade', consumer: 'Consumidor', other: 'Outro' };

export default async function DenunciasPage() {
  const svc = createServiceSupabase();
  const [notices, leads] = await Promise.all([
    svc.from('content_notices').select('id, reporter_name, reporter_email, content_url, category, explanation, created_at').eq('status', 'open').order('created_at', { ascending: true }).limit(50),
    svc.from('leads').select('id, name, restaurant, contact, city, message, status, created_at').order('created_at', { ascending: false }).limit(50),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="dsa">
        <h1 id="dsa" className="pv-title text-4xl text-verde-escuro">Denúncias (DSA)</h1>
        {(notices.data ?? []).length === 0 ? <p className="text-tinta-2">Sem denúncias por decidir.</p> : null}
        {(notices.data ?? []).map((n) => (
          <Card key={n.id} className="flex flex-col gap-2">
            <p className="text-sm text-tinta-2">{CATEGORY[n.category] ?? n.category} · {formatDateTime(n.created_at)} · ref. {n.id.slice(0, 8)}</p>
            <p className="break-all font-semibold">{n.content_url}</p>
            <p className="whitespace-pre-wrap">{n.explanation}</p>
            <p className="text-sm text-tinta-2">De: {n.reporter_name || 'anónimo'} ({n.reporter_email})</p>
            <NoticeDecision id={n.id} />
          </Card>
        ))}
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="leads">
        <h2 id="leads" className="pv-title text-3xl text-verde-escuro">Pedidos de demonstração</h2>
        {(leads.data ?? []).length === 0 ? <p className="text-tinta-2">Sem pedidos.</p> : null}
        {(leads.data ?? []).map((l) => (
          <Card key={l.id} className="flex flex-col gap-1">
            <p className="font-semibold">{l.restaurant} · {l.city}</p>
            <p>{l.name} · {l.contact}</p>
            {l.message ? <p className="text-tinta-2">{l.message}</p> : null}
            <p className="text-sm text-tinta-2">{formatDateTime(l.created_at)} · {l.status}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
