'use server';
import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, run } from '../action';
import { requireMemberForAction } from '../auth';

export interface QueueCall {
  id: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'rejected' | 'expired';
  reason: 'call' | 'bill' | 'help';
  createdAt: string;
  tableLabel: string;
  userId: string;
  userName: string;
}
export interface QueueData {
  active: QueueCall[];
  today: QueueCall[];
  occupiedTables: string[];
}

/** Dados da fila de mesas (equipa e dono). Autorização no servidor. */
export async function getQueue(restaurantId: string): Promise<ActionResult<QueueData>> {
  return run(async () => {
    await requireMemberForAction(restaurantId);
    const svc = createServiceSupabase();
    await svc.from('waiter_calls').update({ status: 'expired', resolved_at: new Date().toISOString() }).eq('restaurant_id', restaurantId).in('status', ['open', 'acknowledged']).lt('created_at', new Date(Date.now() - 15 * 60_000).toISOString());
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [{ data: calls }, { data: sessions }] = await Promise.all([
      svc.from('waiter_calls').select('id, status, reason, created_at, user_id, tables(label)').eq('restaurant_id', restaurantId).gte('created_at', dayStart.toISOString()).order('created_at', { ascending: false }).limit(100),
      svc.from('table_sessions').select('tables(label)').eq('restaurant_id', restaurantId).is('ended_at', null).gt('expires_at', new Date().toISOString()),
    ]);
    const ids = [...new Set((calls ?? []).map((c) => c.user_id))];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await svc.from('profiles').select('id, display_name, handle').in('id', ids);
      for (const p of profs ?? []) names.set(p.id, p.display_name || p.handle || 'Cliente');
    }
    const map = (c: NonNullable<typeof calls>[number]): QueueCall => ({
      id: c.id,
      status: c.status as QueueCall['status'],
      reason: c.reason as QueueCall['reason'],
      createdAt: c.created_at,
      tableLabel: (c.tables as unknown as { label: string } | null)?.label ?? '?',
      userId: c.user_id,
      userName: names.get(c.user_id) ?? 'Cliente',
    });
    const all = (calls ?? []).map(map);
    return {
      active: all.filter((c) => c.status === 'open' || c.status === 'acknowledged').reverse(),
      today: all.filter((c) => c.status !== 'open' && c.status !== 'acknowledged'),
      occupiedTables: [...new Set((sessions ?? []).map((s) => (s.tables as unknown as { label: string } | null)?.label ?? '?'))],
    };
  });
}
