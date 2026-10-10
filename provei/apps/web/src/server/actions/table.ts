'use server';
import 'server-only';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { callCreateSchema, callStatusSchema, staffVisitSchema, redeemSchema, tableCreateSchema, uuidSchema } from '@provei/api-client';
import {
  DEFAULT_CALL_RULES,
  DEFAULT_PLAN_LIMITS,
  LIMIT_MESSAGES,
  canBackdateValidation,
  canCreateTable,
  newTokenPayload,
  normalizeCode,
  signTableToken,
  verifyTableToken,
} from '@provei/domain';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { tableSecret } from '@/lib/env';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireMemberForAction, requireUserForAction } from '../auth';
import { audit, ipHash } from '../audit';
import { enforceRateLimit } from '../ratelimit';
import { createWaiterCall, exchangeTableToken, getActiveSession } from '../tables';
import { VisitRefused, notify, recordVerifiedVisit } from '../loyalty';

/** Troca o token de mesa por uma sessão e vai para o ecrã da mesa. */
export async function enterTable(token: string): Promise<ActionResult> {
  const me = await requireUserForAction().catch(() => null);
  if (!me) return { ok: false, error: 'Entra na tua conta para entrares na mesa.' };
  const res = await run(async () => {
    await enforceRateLimit(`tableenter:${me.id}`, 600, 10);
    await enforceRateLimit(`tableenter-ip:${await ipHash()}`, 600, 40);
    return exchangeTableToken(token, me.id);
  });
  if (res.ok) redirect('/mesa');
  return res;
}

export async function leaveTable(): Promise<ActionResult> {
  const res = await run(async () => {
    const me = await requireUserForAction();
    await createServiceSupabase().from('table_sessions').update({ ended_at: new Date().toISOString() }).eq('user_id', me.id).is('ended_at', null);
    return undefined;
  });
  if (res.ok) redirect('/mesa');
  return res;
}

export async function callWaiter(input: unknown): Promise<ActionResult<{ callId: string }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(callCreateSchema, input ?? {});
    const session = await getActiveSession(me.id);
    if (!session) throw new UserError('A sessão da mesa terminou. Lê o QR outra vez.');
    const flags = await getFlags(session.restaurant_id);
    if (!flags.call_waiter) throw new UserError('O botão de chamar não está ativo neste restaurante.');
    await enforceRateLimit(`call:${me.id}`, 3600, 20, 'Já chamaste várias vezes. Tenta daqui a pouco.');
    const callId = await createWaiterCall({ userId: me.id, sessionId: session.id, reason: v.reason, ipHash: await ipHash() });
    return { callId };
  });
}

/** A equipa atende / resolve / rejeita. Autorização no servidor + RLS. */
export async function setCallStatus(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(callStatusSchema, input);
    const svc = createServiceSupabase();
    const { data: call } = await svc.from('waiter_calls').select('id, restaurant_id, user_id, status').eq('id', v.callId).maybeSingle();
    if (!call) throw new UserError('Chamada não encontrada.');
    const ctx = await requireMemberForAction(call.restaurant_id);
    if (['resolved', 'rejected', 'expired'].includes(call.status)) throw new UserError('Esta chamada já foi tratada.');

    const sb = await createServerSupabase();
    const now = new Date().toISOString();
    const patch =
      v.status === 'acknowledged'
        ? { status: 'acknowledged', acknowledged_by: ctx.me.id, acknowledged_at: now }
        : { status: v.status, resolved_at: now, acknowledged_by: ctx.me.id };
    const { data: updated, error } = await sb.from('waiter_calls').update(patch).eq('id', v.callId).select('id');
    if (error || !updated?.length) throw new UserError('Não foi possível atualizar a chamada.');

    if (v.status === 'acknowledged') await notify(svc, call.user_id, 'call_ack', { callId: call.id });
    if (v.status === 'resolved') await notify(svc, call.user_id, 'call_resolved', { callId: call.id });
    if (v.status === 'rejected') {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const { count } = await svc.from('waiter_calls').select('id', { count: 'exact', head: true }).eq('user_id', call.user_id).eq('restaurant_id', call.restaurant_id).eq('status', 'rejected').gte('created_at', dayStart.toISOString());
      if ((count ?? 0) >= DEFAULT_CALL_RULES.rejectionsToBlock) {
        const until = new Date(Date.now() + DEFAULT_CALL_RULES.blockHours * 3_600_000).toISOString();
        await svc.from('restaurant_user_blocks').upsert({ restaurant_id: call.restaurant_id, user_id: call.user_id, kind: 'auto_block', until, created_by: ctx.me.id });
        await audit({ actorId: ctx.me.id, action: 'call.auto_block', entity: 'user', entityId: call.user_id, restaurantId: call.restaurant_id, meta: { until } });
      }
    }
    await audit({ actorId: ctx.me.id, action: `call.${v.status}`, entity: 'waiter_call', entityId: call.id, restaurantId: call.restaurant_id });
    return undefined;
  });
}

export async function ignoreUser(restaurantId: string, userId: string, ignore: boolean): Promise<ActionResult> {
  return run(async () => {
    parse(uuidSchema, userId);
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const svc = createServiceSupabase();
    if (ignore) await svc.from('restaurant_user_blocks').upsert({ restaurant_id: restaurantId, user_id: userId, kind: 'ignored', created_by: ctx.me.id });
    else await svc.from('restaurant_user_blocks').delete().eq('restaurant_id', restaurantId).eq('user_id', userId).eq('kind', 'ignored');
    await audit({ actorId: ctx.me.id, action: ignore ? 'user.ignore' : 'user.unignore', entity: 'user', entityId: userId, restaurantId });
    return undefined;
  });
}

/** O cliente confirma a visita a partir da mesa (nível `qr`). */
export async function claimMyVisit(): Promise<ActionResult<{ points: number; rewardCode: string | null; stamps: number; stampsRequired: number }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const session = await getActiveSession(me.id);
    if (!session) throw new UserError('A sessão da mesa terminou. Lê o QR outra vez.');
    await enforceRateLimit(`claimvisit:${me.id}`, 600, 10);
    try {
      const r = await recordVerifiedVisit({ userId: me.id, restaurantId: session.restaurant_id, level: 'qr', tableSessionId: session.id });
      revalidatePath('/mesa');
      revalidatePath('/cartao');
      return { points: r.points, rewardCode: r.rewardCode, stamps: r.stamps, stampsRequired: r.stampsRequired };
    } catch (e) {
      if (e instanceof VisitRefused) throw new UserError(e.message);
      throw e;
    }
  });
}

export async function createTable(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = parse(tableCreateSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const svc = createServiceSupabase();
    const [{ count }, { data: limits }] = await Promise.all([
      svc.from('tables').select('id', { count: 'exact', head: true }).eq('restaurant_id', v.restaurantId),
      svc.from('plan_limits').select('max_tables').eq('plan', ctx.restaurant.plan).single(),
    ]);
    const max = limits?.max_tables ?? DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxTables;
    if (!canCreateTable({ ...DEFAULT_PLAN_LIMITS[ctx.restaurant.plan], maxTables: max }, count ?? 0)) throw new UserError(LIMIT_MESSAGES.tables);
    const code = randomUUID().replace(/-/g, '').slice(0, 10);
    const { data, error } = await sb.from('tables').insert({ restaurant_id: v.restaurantId, label: v.label, public_code: code }).select('id').single();
    if (error) throw new UserError(error.code === '23505' ? 'Já existe uma mesa com esse nome.' : 'Não foi possível criar a mesa.');
    await audit({ actorId: ctx.me.id, action: 'table.create', entity: 'table', entityId: data.id, restaurantId: v.restaurantId });
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/mesas`);
    return { id: data.id };
  });
}

export async function setTableActive(restaurantId: string, tableId: string, active: boolean): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const { error } = await sb.from('tables').update({ active }).eq('id', tableId).eq('restaurant_id', restaurantId);
    if (error) throw new Error(error.message);
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/mesas`);
    return undefined;
  });
}

/** QR pessoal do cliente (5 min, uso único) para a equipa validar uma visita. */
export async function getPersonalToken(): Promise<ActionResult<{ qr: string; expiresAt: number }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const payload = newTokenPayload(`u:${me.id}`, 'qr', randomUUID());
    return { qr: `provei:u:${await signTableToken(payload, tableSecret())}`, expiresAt: payload.exp * 1000 };
  });
}

/** Equipa: valida visita lendo o QR pessoal do cliente (ou handle, em alternativa manual). */
export async function validateVisit(input: unknown): Promise<ActionResult<{ name: string; points: number; rewardCode: string | null }>> {
  return run(async () => {
    const v = parse(staffVisitSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId);
    await enforceRateLimit(`staffvisit:${ctx.me.id}`, 60, 30);
    const svc = createServiceSupabase();
    let resolvedUser: string | null = null;

    if (v.userCode.startsWith('provei:u:')) {
      const check = await verifyTableToken(v.userCode.slice('provei:u:'.length), tableSecret());
      if (!check.ok || !check.payload.tid.startsWith('u:')) throw new UserError('QR inválido ou expirado. Pede ao cliente para o atualizar.');
      const { error } = await svc.from('table_token_uses').insert({ jti: check.payload.jti, table_id: v.restaurantId, used_by: ctx.me.id });
      if (error) throw new UserError('Este QR já foi usado. Pede ao cliente para o atualizar.');
      resolvedUser = check.payload.tid.slice(2);
    } else {
      const handle = v.userCode.replace(/^@/, '').toLowerCase();
      const { data } = await svc.from('profiles').select('id').eq('handle', handle).is('deleted_at', null).maybeSingle();
      if (!data) throw new UserError('Não encontrámos esse cliente.');
      resolvedUser = data.id;
    }
    if (!resolvedUser) throw new UserError('Não encontrámos esse cliente.');
    const userId: string = resolvedUser;

    const at = new Date(Date.now() - v.backdateMinutes * 60_000);
    if (v.backdateMinutes > 0) {
      const chk = canBackdateValidation(at, new Date(), v.reason);
      if (!chk.ok) throw new UserError(chk.reason === 'reason_required' ? 'Indica a razão da validação em atraso.' : 'Só é possível validar visitas das últimas 24 horas.');
    }
    const { data: prof } = await svc.from('profiles').select('display_name, handle').eq('id', userId).single();
    try {
      const r = await recordVerifiedVisit({ userId, restaurantId: v.restaurantId, level: 'staff_validated', validatedBy: ctx.me.id, validationReason: v.reason || null, at });
      await audit({ actorId: ctx.me.id, action: 'visit.staff_validated', entity: 'visit', entityId: r.visitId, restaurantId: v.restaurantId, meta: { userId, backdateMinutes: v.backdateMinutes, reason: v.reason } });
      return { name: prof?.display_name || prof?.handle || 'Cliente', points: r.points, rewardCode: r.rewardCode };
    } catch (e) {
      if (e instanceof VisitRefused) throw new UserError(e.message);
      throw e;
    }
  });
}

/** Equipa: valida um resgate pelo código. Atómico: só um sucesso por código. */
export async function validateRedemption(restaurantId: string, rawCode: string): Promise<ActionResult<{ reward: string }>> {
  return run(async () => {
    const v = parse(redeemSchema, { code: rawCode.replace(/^provei:r:/, '') });
    const ctx = await requireMemberForAction(restaurantId);
    await enforceRateLimit(`redeem:${ctx.me.id}`, 60, 30);
    const code = normalizeCode(v.code);
    const svc = createServiceSupabase();
    const now = new Date().toISOString();
    const { data: done } = await svc
      .from('redemptions')
      .update({ status: 'redeemed', redeemed_at: now, validated_by: ctx.me.id })
      .eq('code', code)
      .eq('restaurant_id', restaurantId)
      .eq('status', 'issued')
      .gt('expires_at', now)
      .select('id, user_id, reward_text')
      .maybeSingle();
    if (!done) {
      const { data: r } = await svc.from('redemptions').select('status, restaurant_id, expires_at').eq('code', code).maybeSingle();
      if (!r || r.restaurant_id !== restaurantId) throw new UserError('Código não encontrado neste restaurante.');
      if (r.status === 'redeemed') throw new UserError('Este código já foi usado.');
      throw new UserError('Este código expirou.');
    }
    await audit({ actorId: ctx.me.id, action: 'redemption.validate', entity: 'redemption', entityId: done.id, restaurantId });
    return { reward: done.reward_text };
  });
}

/** Reversão de carimbos/pontos por `adjust`, sempre com razão e auditoria. */
export async function adjustLoyalty(input: { restaurantId: string; userId: string; kind: 'stamps' | 'points'; delta: number; reason: string }): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(input.restaurantId, ['owner']);
    if (!input.reason || input.reason.trim().length < 3) throw new UserError('Indica a razão do ajuste.');
    if (!Number.isInteger(input.delta) || input.delta === 0 || Math.abs(input.delta) > 1000) throw new UserError('Valor de ajuste inválido.');
    const svc = createServiceSupabase();
    const { data: card } = await svc.from('loyalty_cards').select('id, stamps, points').eq('user_id', input.userId).eq('restaurant_id', input.restaurantId).maybeSingle();
    if (!card) throw new UserError('Este cliente ainda não tem cartão.');
    if (input.kind === 'stamps' && card.stamps + input.delta < 0) throw new UserError('O cartão não pode ficar com carimbos negativos.');
    const { error } = await svc.from('loyalty_events').insert({ card_id: card.id, type: 'adjust', delta: input.delta, reason: `${input.kind === 'stamps' ? 'stamps' : 'points'}: ${input.reason.trim()}`, actor_id: ctx.me.id });
    if (error) throw new Error(error.message);
    await audit({ actorId: ctx.me.id, action: 'loyalty.adjust', entity: 'loyalty_card', entityId: card.id, restaurantId: input.restaurantId, meta: input });
    return undefined;
  });
}
