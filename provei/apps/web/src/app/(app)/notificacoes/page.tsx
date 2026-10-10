import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';
import { MarkReadButton } from './MarkReadButton';
import { PushToggle } from '@/components/shell/PushToggle';

export const metadata: Metadata = { title: 'Notificações' };
export const dynamic = 'force-dynamic';

function describe(type: string, p: Record<string, unknown>): string {
  switch (type) {
    case 'new_post': return `${p.restaurant ?? 'Um restaurante que segues'} publicou um prato novo: ${p.dish ?? ''}`;
    case 'points': return `Visita confirmada. Ganhaste ${p.points ?? 0} pontos`;
    case 'redemption_ready': return `A tua recompensa está pronta: ${p.reward ?? ''}. Código ${p.code ?? ''}`;
    case 'call_ack': return 'O empregado já sabe e vai a caminho.';
    case 'call_resolved': return 'Pedido atendido. Bom apetite!';
    default: return String(p.message ?? 'Notificação');
  }
}

export default async function NotificacoesPage() {
  const me = await requireUser('/notificacoes');
  const sb = await createServerSupabase();
  const { data } = await sb.from('notifications').select('id, type, payload, read_at, created_at').eq('user_id', me.id).order('created_at', { ascending: false }).limit(50);
  const rows = data ?? [];
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="pv-title text-4xl text-verde-escuro">Notificações</h1>
        {rows.some((r) => !r.read_at) ? <MarkReadButton /> : null}
      </div>
      <PushToggle enabled={Boolean(me.consents.push)} />
      {rows.length === 0 ? (
        <EmptyState title="Tudo em dia" description="Quando houver novidades dos restaurantes que segues, aparecem aqui." />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((n) => (
            <li key={n.id} className={`rounded-m border p-4 ${n.read_at ? 'border-linha bg-branco' : 'border-verde-fresco bg-verde-tinta'}`}>
              <p>{describe(n.type, (n.payload ?? {}) as Record<string, unknown>)}</p>
              <time className="text-sm text-tinta-2" dateTime={n.created_at}>{formatDateTime(n.created_at)}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
