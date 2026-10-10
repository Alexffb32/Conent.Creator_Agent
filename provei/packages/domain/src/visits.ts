export type VisitLevel = 'qr' | 'staff_validated' | 'receipt';

export interface VisitCheckInput {
  now: Date;
  sessionStartedAt: Date;
  sessionEndedAt?: Date | null;
  sessionExpiresAt: Date;
  lastVerifiedVisitAt: Date | null;
  minSessionMinutes?: number;
  minIntervalHours?: number;
}

export type VisitDenied = 'session_inactive' | 'too_early' | 'too_soon';

/** Visita verificada por QR: sessão ativa há pelo menos X minutos (omissão 10). */
export function checkQrVisit(
  i: VisitCheckInput,
): { ok: true; level: VisitLevel } | { ok: false; reason: VisitDenied; retryAt?: Date } {
  const minMin = i.minSessionMinutes ?? 10;
  const minH = i.minIntervalHours ?? 12;
  if (i.sessionEndedAt || i.now >= i.sessionExpiresAt) return { ok: false, reason: 'session_inactive' };
  const readyAt = new Date(i.sessionStartedAt.getTime() + minMin * 60_000);
  if (i.now < readyAt) return { ok: false, reason: 'too_early', retryAt: readyAt };
  if (i.lastVerifiedVisitAt) {
    const retryAt = new Date(i.lastVerifiedVisitAt.getTime() + minH * 3_600_000);
    if (i.now < retryAt) return { ok: false, reason: 'too_soon', retryAt };
  }
  return { ok: true, level: 'qr' };
}

/** A equipa pode validar visitas em atraso até 24 h, sempre com razão. */
export function canBackdateValidation(
  visitAt: Date,
  now: Date,
  reason: string,
  maxHours = 24,
): { ok: true } | { ok: false; reason: 'reason_required' | 'too_old' | 'future' } {
  if (reason.trim().length < 3) return { ok: false, reason: 'reason_required' };
  if (visitAt > now) return { ok: false, reason: 'future' };
  if (now.getTime() - visitAt.getTime() > maxHours * 3_600_000) return { ok: false, reason: 'too_old' };
  return { ok: true };
}
