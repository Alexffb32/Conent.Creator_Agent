import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { UserError } from './action';

const memory = new Map<string, { count: number; reset: number }>();

function memoryHit(key: string, windowSeconds: number, max: number): boolean {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return true;
  }
  cur.count += 1;
  return cur.count <= max;
}

/**
 * Rate limiting: Postgres (função rate_limit_hit) com fallback em memória.
 * Upstash/Redis opcional: ver docs/DECISIONS.md (não ativado por omissão).
 */
export async function rateLimit(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    const sb = createServiceSupabase();
    const { data, error } = await sb.rpc('rate_limit_hit', { p_key: key, p_window_seconds: windowSeconds, p_max: max });
    if (error) throw error;
    return Boolean(data);
  } catch {
    return memoryHit(key, windowSeconds, max);
  }
}

export async function enforceRateLimit(key: string, windowSeconds: number, max: number, message = 'Demasiados pedidos. Tenta daqui a pouco.') {
  if (!(await rateLimit(key, windowSeconds, max))) throw new UserError(message);
}
