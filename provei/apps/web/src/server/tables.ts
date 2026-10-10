import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_CALL_RULES,
  TABLE_SESSION_DEFAULT_HOURS,
  evaluateCall,
  newTokenPayload,
  sessionExpiry,
  signTableToken,
  verifyTableToken,
  CALL_DENIED_MESSAGES,
  type CallRules,
} from '@provei/domain';
import { createServiceSupabase } from '@/lib/supabase/server';
import { tableSecret } from '@/lib/env';
import { UserError } from './action';

type Svc = ReturnType<typeof createServiceSupabase>;

export interface TableInfo {
  id: string;
  label: string;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  settings: Record<string, unknown>;
}

export async function findTableByCode(svc: Svc, code: string): Promise<TableInfo | null> {
  const { data } = await svc
    .from('tables')
    .select('id, label, active, restaurant_id, restaurants!inner(name, slug, settings, verified_status, deleted_at)')
    .eq('public_code', code.toLowerCase())
    .maybeSingle();
  if (!data || !data.active) return null;
  const r = data.restaurants as unknown as { name: string; slug: string; settings: Record<string, unknown>; verified_status: string; deleted_at: string | null };
  if (r.verified_status !== 'verified' || r.deleted_at) return null;
  return { id: data.id, label: data.label, restaurantId: data.restaurant_id, restaurantName: r.name, restaurantSlug: r.slug, settings: r.settings ?? {} };
}

/** Passo 1: o servidor emite um token assinado de curta duração (5 min) para a mesa. */
export async function issueTableToken(code: string, source: 'qr' | 'nfc' = 'qr') {
  const svc = createServiceSupabase();
  const table = await findTableByCode(svc, code);
  if (!table) return null;
  const token = await signTableToken(newTokenPayload(table.id, source, randomUUID()), tableSecret());
  return { token, table };
}

/** Passo 2: o utilizador troca o token (uso único) por uma sessão de mesa. */
export async function exchangeTableToken(token: string, userId: string): Promise<{ sessionId: string; reused: boolean }> {
  const v = await verifyTableToken(token, tableSecret());
  if (!v.ok) {
    throw new UserError(v.reason === 'expired' ? 'O código da mesa expirou. Lê o QR outra vez.' : 'Código de mesa inválido. Lê o QR outra vez.');
  }
  const svc = createServiceSupabase();
  const { payload } = v;

  const { data: table } = await svc.from('tables').select('id, restaurant_id, active').eq('id', payload.tid).maybeSingle();
  if (!table || !table.active) throw new UserError('Esta mesa não está disponível.');

  // uso único: o jti só pode ser registado uma vez
  const { error: useErr } = await svc.from('table_token_uses').insert({ jti: payload.jti, table_id: table.id, used_by: userId });
  if (useErr) {
    if (useErr.code === '23505') {
      // o mesmo utilizador a repetir (ex.: refresh) reaproveita a sessão que já criou com este token
      const { data: own } = await svc.from('table_sessions').select('id').eq('token_jti', payload.jti).eq('user_id', userId).maybeSingle();
      if (own) return { sessionId: own.id, reused: true };
      throw new UserError('Este código já foi usado. Lê o QR outra vez.');
    }
    throw new Error(useErr.message);
  }

  const now = new Date();
  // já tem sessão ativa nesta mesa? reutilizar
  const { data: active } = await svc
    .from('table_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('table_id', table.id)
    .is('ended_at', null)
    .gt('expires_at', now.toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active) return { sessionId: active.id, reused: true };

  // uma pessoa só está numa mesa de cada vez: terminar outras sessões ativas
  await svc.from('table_sessions').update({ ended_at: now.toISOString() }).eq('user_id', userId).is('ended_at', null);

  const hours = Number((await restaurantSettings(svc, table.restaurant_id)).sessionHours ?? TABLE_SESSION_DEFAULT_HOURS);
  const { data: session, error } = await svc
    .from('table_sessions')
    .insert({
      table_id: table.id,
      restaurant_id: table.restaurant_id,
      user_id: userId,
      source: payload.src,
      token_jti: payload.jti,
      started_at: now.toISOString(),
      expires_at: sessionExpiry(now, hours).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { sessionId: session.id, reused: false };
}

async function restaurantSettings(svc: Svc, restaurantId: string): Promise<Record<string, unknown>> {
  const { data } = await svc.from('restaurants').select('settings').eq('id', restaurantId).single();
  return (data?.settings ?? {}) as Record<string, unknown>;
}

export function callRulesFrom(settings: Record<string, unknown>): CallRules {
  const s = (settings.callRules ?? {}) as Partial<CallRules>;
  return { ...DEFAULT_CALL_RULES, ...Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === 'number')) } as CallRules;
}

export async function getActiveSession(userId: string) {
  const svc = createServiceSupabase();
  const { data } = await svc
    .from('table_sessions')
    .select('id, started_at, expires_at, table_id, restaurant_id, tables(label), restaurants(name, slug, settings)')
    .eq('user_id', userId)
    .is('ended_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createWaiterCall(input: { userId: string; sessionId: string; reason: 'call' | 'bill' | 'help'; ipHash: string }) {
  const svc = createServiceSupabase();
  const now = new Date();
  const { data: s } = await svc
    .from('table_sessions')
    .select('id, user_id, table_id, restaurant_id, ended_at, expires_at')
    .eq('id', input.sessionId)
    .maybeSingle();
  if (!s || s.user_id !== input.userId || s.ended_at || new Date(s.expires_at) <= now) {
    throw new UserError('A sessão da mesa terminou. Lê o QR outra vez.');
  }
  const rules = callRulesFrom(await restaurantSettings(svc, s.restaurant_id));
  // expiração preguiçosa: chamadas abertas há mais de N minutos nesta mesa deixam de bloquear
  await svc
    .from('waiter_calls')
    .update({ status: 'expired', resolved_at: now.toISOString() })
    .eq('table_id', s.table_id)
    .in('status', ['open', 'acknowledged'])
    .lt('created_at', new Date(now.getTime() - rules.autoExpireMinutes * 60_000).toISOString());
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const [open, last, userHour, ipHour, rejected, blocks] = await Promise.all([
    svc.from('waiter_calls').select('id', { count: 'exact', head: true }).eq('table_id', s.table_id).in('status', ['open', 'acknowledged']),
    svc.from('waiter_calls').select('created_at').eq('table_id', s.table_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('waiter_calls').select('id', { count: 'exact', head: true }).eq('user_id', input.userId).gte('created_at', hourAgo),
    svc.from('waiter_calls').select('id', { count: 'exact', head: true }).eq('restaurant_id', s.restaurant_id).eq('ip_hash', input.ipHash).gte('created_at', hourAgo),
    svc.from('waiter_calls').select('id', { count: 'exact', head: true }).eq('user_id', input.userId).eq('restaurant_id', s.restaurant_id).eq('status', 'rejected').gte('created_at', dayStart.toISOString()),
    svc.from('restaurant_user_blocks').select('kind, until').eq('restaurant_id', s.restaurant_id).eq('user_id', input.userId),
  ]);

  const ignored = (blocks.data ?? []).some((b) => b.kind === 'ignored');
  const auto = (blocks.data ?? []).find((b) => b.kind === 'auto_block');
  const decision = evaluateCall(
    {
      now,
      openCallOnTable: (open.count ?? 0) > 0,
      lastCallOnTableAt: last.data ? new Date(last.data.created_at) : null,
      userCallsLastHour: userHour.count ?? 0,
      ipCallsLastHour: ipHour.count ?? 0,
      userRejectionsToday: rejected.count ?? 0,
      blockedUntil: auto?.until ? new Date(auto.until) : null,
      ignoredByRestaurant: ignored,
    },
    rules,
  );
  if (!decision.ok) throw new UserError(CALL_DENIED_MESSAGES[decision.reason]);

  const { data: call, error } = await svc
    .from('waiter_calls')
    .insert({ table_session_id: s.id, restaurant_id: s.restaurant_id, table_id: s.table_id, user_id: input.userId, reason: input.reason, ip_hash: input.ipHash })
    .select('id')
    .single();
  if (error) {
    // índice único: outra chamada aberta na mesma mesa (corrida entre pedidos simultâneos)
    if (error.code === '23505') throw new UserError(CALL_DENIED_MESSAGES.open_call);
    throw new Error(error.message);
  }
  await svc.rpc('bump_event', { p_restaurant: s.restaurant_id, p_type: 'call' });
  return call.id;
}

/** Job: expira chamadas abertas há mais de 15 min e termina sessões fora de prazo. */
export async function expireCallsAndSessions(svc: Svc = createServiceSupabase(), rules: CallRules = DEFAULT_CALL_RULES) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - rules.autoExpireMinutes * 60_000).toISOString();
  const calls = await svc.from('waiter_calls').update({ status: 'expired', resolved_at: now.toISOString() }).in('status', ['open', 'acknowledged']).lt('created_at', cutoff).select('id');
  const sessions = await svc.from('table_sessions').update({ ended_at: now.toISOString() }).is('ended_at', null).lt('expires_at', now.toISOString()).select('id');
  return { calls: calls.data?.length ?? 0, sessions: sessions.data?.length ?? 0 };
}
