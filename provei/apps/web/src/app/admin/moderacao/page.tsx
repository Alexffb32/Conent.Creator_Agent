import { Card } from '@/components/ui';
import { ActionButton } from '@/components/adminpanel/ActionButton';
import { createServiceSupabase } from '@/lib/supabase/server';
import { moderateTarget } from '@/server/actions/admin';
import { formatDateTime } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function ModeracaoPage() {
  const svc = createServiceSupabase();
  const { data: reports } = await svc.from('reports').select('id, target_type, target_id, reason, created_at').eq('status', 'open').order('created_at', { ascending: true }).limit(50);
  const reviewIds = (reports ?? []).filter((r) => r.target_type === 'review').map((r) => r.target_id);
  const { data: reviews } = reviewIds.length ? await svc.from('reviews').select('id, text, rating, flagged_count').in('id', reviewIds) : { data: [] };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="pv-title text-4xl text-verde-escuro">Moderação</h1>
      {(reports ?? []).length === 0 ? <p className="text-tinta-2">Sem denúncias abertas.</p> : null}
      <ul className="flex flex-col gap-2">
        {(reports ?? []).map((r) => {
          const rev = (reviews ?? []).find((x) => x.id === r.target_id);
          return (
            <li key={r.id}>
              <Card className="flex flex-col gap-2">
                <p className="text-sm text-tinta-2">{r.target_type} · {formatDateTime(r.created_at)}{rev ? ` · ${rev.flagged_count} denúncias` : ''}</p>
                {rev ? <p className="rounded-m bg-nevoa p-3">“{rev.text}” ({rev.rating}★)</p> : null}
                <p><strong>Motivo:</strong> {r.reason}</p>
                <div className="flex gap-2">
                  <ActionButton variant="danger" action={() => moderateTarget({ reportId: r.id, targetType: r.target_type as 'review', targetId: r.target_id, action: 'remove' })} confirmText="Remover este conteúdo?">Remover conteúdo</ActionButton>
                  <ActionButton variant="secondary" action={() => moderateTarget({ reportId: r.id, targetType: r.target_type as 'review', targetId: r.target_id, action: 'dismiss' })}>Manter</ActionButton>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
