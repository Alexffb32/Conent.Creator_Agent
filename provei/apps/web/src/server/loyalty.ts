import 'server-only';
import {
  DEFAULT_PROGRAM,
  checkQrVisit,
  checkStamp,
  levelFor,
  makeRedemptionCode,
  pointsForReview,
  pointsForVisit,
  stampProgress,
  type LoyaltyProgram,
  type VisitLevel,
} from '@provei/domain';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { UserError } from './action';

type Svc = ReturnType<typeof createServiceSupabase>;

export async function loadProgram(svc: Svc, restaurantId: string): Promise<LoyaltyProgram & { rewardText: string }> {
  const { data } = await svc.from('loyalty_programs').select('*').eq('restaurant_id', restaurantId).maybeSingle();
  if (!data) return { ...DEFAULT_PROGRAM, rewardText: 'Uma sobremesa por conta da casa' };
  return {
    stampsRequired: data.stamps_required,
    pointsPerVisit: data.points_per_visit,
    pointsPerReviewPhoto: data.points_per_review_photo,
    pointsFirstVisit: data.points_first_visit,
    minIntervalHours: data.min_interval_hours,
    active: data.active,
    rewardText: data.reward_text,
  };
}

export async function getOrCreateCard(svc: Svc, userId: string, restaurantId: string) {
  const { data: existing } = await svc.from('loyalty_cards').select('*').eq('user_id', userId).eq('restaurant_id', restaurantId).maybeSingle();
  if (existing) return existing;
  const { data, error } = await svc.from('loyalty_cards').insert({ user_id: userId, restaurant_id: restaurantId }).select('*').single();
  if (error) {
    const { data: again } = await svc.from('loyalty_cards').select('*').eq('user_id', userId).eq('restaurant_id', restaurantId).single();
    return again!;
  }
  return data;
}

export interface VisitResult {
  visitId: string;
  points: number;
  stamped: boolean;
  stamps: number;
  stampsRequired: number;
  rewardCode: string | null;
}

export type VisitRefusal = 'session_inactive' | 'too_early' | 'too_soon' | 'daily_limit' | 'same_session' | 'duplicate';

export const VISIT_MESSAGES: Record<VisitRefusal, string> = {
  session_inactive: 'A sessão da mesa terminou. Lê o QR outra vez.',
  too_early: 'Ainda é cedo para confirmar a visita. Volta daqui a uns minutos.',
  too_soon: 'Já tens uma visita confirmada neste restaurante há pouco tempo.',
  daily_limit: 'Já atingiste o limite de carimbos por hoje.',
  same_session: 'Esta mesa já deu carimbo.',
  duplicate: 'Esta visita já foi confirmada.',
};

export class VisitRefused extends UserError {
  constructor(public reason: VisitRefusal, public retryAt?: Date) {
    super(VISIT_MESSAGES[reason]);
  }
}

/**
 * Regista uma visita verificada e aplica carimbo e pontos. Idempotente: índices únicos
 * (uma visita por sessão de mesa; um carimbo e uns pontos por visita) impedem duplicados.
 */
export async function recordVerifiedVisit(input: {
  userId: string;
  restaurantId: string;
  level: VisitLevel;
  tableSessionId?: string | null;
  validatedBy?: string | null;
  validationReason?: string | null;
  at?: Date;
}): Promise<VisitResult> {
  const svc = createServiceSupabase();
  const now = input.at ?? new Date();
  const [program, flags] = await Promise.all([loadProgram(svc, input.restaurantId), getFlags(input.restaurantId)]);

  const { data: last } = await svc
    .from('visits')
    .select('verified_at')
    .eq('user_id', input.userId)
    .eq('restaurant_id', input.restaurantId)
    .order('verified_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastAt = last ? new Date(last.verified_at) : null;

  if (input.level === 'qr') {
    if (!input.tableSessionId) throw new VisitRefused('session_inactive');
    const { data: s } = await svc.from('table_sessions').select('started_at, expires_at, ended_at').eq('id', input.tableSessionId).single();
    if (!s) throw new VisitRefused('session_inactive');
    const chk = checkQrVisit({
      now,
      sessionStartedAt: new Date(s.started_at),
      sessionExpiresAt: new Date(s.expires_at),
      sessionEndedAt: s.ended_at ? new Date(s.ended_at) : null,
      lastVerifiedVisitAt: lastAt,
      minIntervalHours: program.minIntervalHours,
    });
    if (!chk.ok) throw new VisitRefused(chk.reason, chk.retryAt);
  } else if (lastAt && now.getTime() - lastAt.getTime() < program.minIntervalHours * 3_600_000) {
    throw new VisitRefused('too_soon', new Date(lastAt.getTime() + program.minIntervalHours * 3_600_000));
  }

  const loyaltyOn = flags.loyalty && program.active;
  const card = await getOrCreateCard(svc, input.userId, input.restaurantId);

  let stampOk = loyaltyOn;
  if (loyaltyOn) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const { data: stampsToday } = await svc
      .from('loyalty_events')
      .select('created_at')
      .eq('card_id', card.id)
      .eq('type', 'stamp')
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false });
    const sameSession = input.tableSessionId
      ? Boolean((await svc.from('visits').select('id').eq('table_session_id', input.tableSessionId).maybeSingle()).data)
      : false;
    const st = checkStamp(program, {
      now,
      lastStampAt: stampsToday?.[0] ? new Date(stampsToday[0].created_at) : null,
      stampsToday: stampsToday?.length ?? 0,
      tableSessionAlreadyStamped: sameSession,
    });
    // O intervalo mínimo já foi validado acima para a visita; aqui só nos interessam limite diário e sessão.
    if (!st.ok && (st.reason === 'daily_limit' || st.reason === 'same_session')) {
      throw new VisitRefused(st.reason === 'daily_limit' ? 'daily_limit' : 'same_session');
    }
    stampOk = true;
  }

  const firstVisit = !lastAt;
  const points = loyaltyOn ? pointsForVisit(program, { firstVisitToRestaurant: firstVisit }) : 0;

  const { data: visit, error: vErr } = await svc
    .from('visits')
    .insert({
      user_id: input.userId,
      restaurant_id: input.restaurantId,
      table_session_id: input.tableSessionId ?? null,
      level: input.level,
      verified_at: now.toISOString(),
      validated_by: input.validatedBy ?? null,
      validation_reason: input.validationReason ?? null,
      points_awarded: points,
    })
    .select('id')
    .single();
  if (vErr) {
    if (vErr.code === '23505') throw new VisitRefused('duplicate');
    throw new Error(vErr.message);
  }

  let rewardCode: string | null = null;
  let stamps = card.stamps;
  if (loyaltyOn && stampOk) {
    await svc.from('loyalty_events').insert({ card_id: card.id, type: 'stamp', delta: 1, visit_id: visit.id, reason: 'visita verificada' });
    stamps += 1;
    if (points > 0) await svc.from('loyalty_events').insert({ card_id: card.id, type: 'points', delta: points, visit_id: visit.id, reason: firstVisit ? 'primeira visita' : 'visita verificada' });

    if (stamps >= program.stampsRequired) {
      const code = makeRedemptionCode();
      const { error: rErr } = await svc.from('redemptions').insert({
        card_id: card.id,
        restaurant_id: input.restaurantId,
        user_id: input.userId,
        reward_text: program.rewardText,
        code,
        cycle: card.completed_cycles,
      });
      if (!rErr) {
        await svc.from('loyalty_events').insert({ card_id: card.id, type: 'redeem', delta: -program.stampsRequired, reason: 'recompensa emitida', visit_id: null });
        stamps -= program.stampsRequired;
        rewardCode = code;
        await notify(svc, input.userId, 'redemption_ready', { restaurantId: input.restaurantId, code, reward: program.rewardText });
      }
    }
    await refreshLevels(svc, input.userId, input.restaurantId, card.id);
    if (points > 0) await notify(svc, input.userId, 'points', { restaurantId: input.restaurantId, points });
  }
  await svc.rpc('bump_event', { p_restaurant: input.restaurantId, p_type: 'visit' });

  return { visitId: visit.id, points, stamped: loyaltyOn && stampOk, stamps, stampsRequired: program.stampsRequired, rewardCode };
}

export async function refreshLevels(svc: Svc, userId: string, restaurantId: string, cardId: string) {
  const [{ count: restVisits }, { count: allVisits }, { data: card }, { data: prof }] = await Promise.all([
    svc.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('restaurant_id', restaurantId),
    svc.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    svc.from('loyalty_cards').select('points').eq('id', cardId).single(),
    svc.from('profiles').select('points_total').eq('id', userId).single(),
  ]);
  if (card) await svc.from('loyalty_cards').update({ level: levelFor({ visits: restVisits ?? 0, points: card.points }).key }).eq('id', cardId);
  if (prof) await svc.from('profiles').update({ level: levelFor({ visits: allVisits ?? 0, points: prof.points_total }).key }).eq('id', userId);
}

export async function notify(svc: Svc, userId: string, type: 'points' | 'redemption_ready' | 'call_ack' | 'call_resolved' | 'new_post' | 'system', payload: Record<string, unknown>) {
  const { data: pref } = await svc.from('notification_prefs').select('in_app').eq('user_id', userId).eq('type', type).maybeSingle();
  if (pref && !pref.in_app) return;
  await svc.from('notifications').insert({ user_id: userId, type, payload });
}

/** Pontos por avaliação com foto (só na primeira avaliação do período). */
export async function awardReviewPhotoPoints(userId: string, restaurantId: string) {
  const svc = createServiceSupabase();
  const flags = await getFlags(restaurantId);
  if (!flags.loyalty) return 0;
  const program = await loadProgram(svc, restaurantId);
  const pts = pointsForReview(program, true);
  if (pts <= 0) return 0;
  const card = await getOrCreateCard(svc, userId, restaurantId);
  await svc.from('loyalty_events').insert({ card_id: card.id, type: 'points', delta: pts, reason: 'avaliação com foto' });
  await refreshLevels(svc, userId, restaurantId, card.id);
  await notify(svc, userId, 'points', { restaurantId, points: pts });
  return pts;
}

export function cardProgress(stamps: number, required: number) {
  return stampProgress(stamps, required);
}
