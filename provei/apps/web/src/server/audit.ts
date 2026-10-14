import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createServiceSupabase } from '@/lib/supabase/server';

/** Hash do IP com sal diário: serve para limitar abusos sem guardar o IP em claro. */
export async function ipHash(): Promise<string> {
  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${day}|${process.env.TABLE_TOKEN_SECRET ?? 'provei'}`).digest('hex').slice(0, 32);
}

export async function audit(entry: {
  actorId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  restaurantId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const sb = createServiceSupabase();
    await sb.from('audit_logs').insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      restaurant_id: entry.restaurantId ?? null,
      meta: entry.meta ?? {},
      ip_hash: await ipHash().catch(() => null),
    });
  } catch (e) {
    console.error('[audit] falhou', e);
  }
}
