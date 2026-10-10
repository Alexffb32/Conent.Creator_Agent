import type { LedgerEvent, LoyaltyProgram } from './types';

export interface VisitPointsInput {
  firstVisitToRestaurant: boolean;
}

/** Pontos por visita verificada: base + bónus de primeira visita. */
export function pointsForVisit(program: LoyaltyProgram, input: VisitPointsInput): number {
  if (!program.active) return 0;
  return program.pointsPerVisit + (input.firstVisitToRestaurant ? program.pointsFirstVisit : 0);
}

export function pointsForReview(program: LoyaltyProgram, hasPhoto: boolean): number {
  return program.active && hasPhoto ? program.pointsPerReviewPhoto : 0;
}

export type StampDenied = 'program_inactive' | 'too_soon' | 'same_session' | 'daily_limit';

export interface StampCheckInput {
  now: Date;
  lastStampAt: Date | null;
  stampsToday: number;
  tableSessionAlreadyStamped: boolean;
  maxStampsPerDay?: number;
}

/** Anti-fraude: intervalo mínimo, um carimbo por sessão de mesa, limite diário. */
export function checkStamp(
  program: LoyaltyProgram,
  input: StampCheckInput,
): { ok: true } | { ok: false; reason: StampDenied; retryAt?: Date } {
  if (!program.active) return { ok: false, reason: 'program_inactive' };
  if (input.tableSessionAlreadyStamped) return { ok: false, reason: 'same_session' };
  if (input.stampsToday >= (input.maxStampsPerDay ?? 2)) return { ok: false, reason: 'daily_limit' };
  if (input.lastStampAt) {
    const retryAt = new Date(input.lastStampAt.getTime() + program.minIntervalHours * 3_600_000);
    if (input.now < retryAt) return { ok: false, reason: 'too_soon', retryAt };
  }
  return { ok: true };
}

export interface CardBalance {
  stamps: number;
  points: number;
}

/**
 * Saldo derivado do livro-razão imutável. O saldo guardado no cartão tem de ser sempre
 * igual a esta função aplicada a todos os eventos.
 */
export function balanceFromEvents(events: readonly LedgerEvent[]): CardBalance {
  const bal: CardBalance = { stamps: 0, points: 0 };
  for (const e of events) {
    if (e.type === 'stamp') bal.stamps += e.delta;
    else if (e.type === 'points') bal.points += e.delta;
    else if (e.type === 'redeem') bal.stamps += e.delta; // resgate consome carimbos (delta < 0)
    else if (e.type === 'adjust') {
      if (e.reason?.startsWith('stamps:')) bal.stamps += e.delta;
      else bal.points += e.delta;
    }
  }
  return bal;
}

export function stampProgress(stamps: number, required: number) {
  const safe = Math.max(1, required);
  return {
    current: stamps % safe,
    required: safe,
    completedCards: Math.floor(stamps / safe),
    missing: safe - (stamps % safe),
  };
}

/** Conversão de resgate: gera recompensa se há carimbos suficientes. */
export function canRedeem(stamps: number, required: number): boolean {
  return required > 0 && stamps >= required;
}

/** Deteção simples de padrões: muitas visitas rápidas. */
export function suspiciousVisitPattern(visitTimes: readonly Date[], windowHours = 24, max = 3): boolean {
  if (visitTimes.length <= max) return false;
  const sorted = [...visitTimes].sort((a, b) => a.getTime() - b.getTime());
  const win = windowHours * 3_600_000;
  for (let i = 0; i + max < sorted.length; i++) {
    if (sorted[i + max]!.getTime() - sorted[i]!.getTime() <= win) return true;
  }
  return false;
}
