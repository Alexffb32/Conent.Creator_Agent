/**
 * Regras de envio de mensagens (WhatsApp, e-mail, push, Wallet). Puro e testável.
 * NOTA: versão provisória construída a partir do ADENDA 4 §6 enquanto o ADENDA 3 (consentimentos + shouldSend, G1)
 * não chega; alinhar quando chegar (ver docs/DECISIONS.md).
 *
 * Propósitos:
 *  - transactional: consequência direta de algo que o cliente fez agora (pedido pronto). Sem horas silenciosas.
 *  - service: aviso de serviço (pontos ganhos, pedido de avaliação). Respeita o interruptor do canal e horas silenciosas.
 *  - marketing: ofertas e reativação. Consentimento próprio por canal, limites de frequência, horas silenciosas,
 *    motivo concreto, pausa depois de uma visita e pausa automática do restaurante.
 */

export type Channel = 'whatsapp' | 'email' | 'push' | 'wallet_push';
export type Purpose = 'transactional' | 'service' | 'marketing';

export type ConsentKey =
  | 'whatsapp_utility'
  | 'whatsapp_marketing'
  | 'email_marketing'
  | 'push'
  | 'review_requests'
  | 'wallet_marketing';

export interface SentMessage {
  channel: Channel;
  purpose: Purpose;
  restaurantId: string | null;
  at: Date;
}

export interface SendPolicy {
  /** Ofertas por restaurante por cliente por semana (todas as vias). ADENDA 4 §6: 1. */
  marketingPerRestaurantPerWeek: number;
  /** Ofertas por cliente por semana, todos os restaurantes. */
  marketingPerWeekTotal: number;
  /** Avisos de serviço por cliente por dia. */
  servicePerDay: number;
  /** Horas silenciosas em hora de Lisboa: [início, fim). */
  quietHours: [number, number];
  /** Sem marketing nas X horas depois de uma visita ao mesmo restaurante. */
  cooldownHoursAfterVisit: number;
}

export const DEFAULT_SEND_POLICY: SendPolicy = {
  marketingPerRestaurantPerWeek: 1,
  marketingPerWeekTotal: 3,
  servicePerDay: 3,
  quietHours: [21, 9],
  cooldownHoursAfterVisit: 24,
};

export interface SendRequest {
  channel: Channel;
  purpose: Purpose;
  restaurantId: string | null;
  /** Motivo concreto (obrigatório em marketing: "não vens há 45 dias", "tens 120 pontos"). */
  reason: string | null;
  /** Consentimentos atuais do cliente (último registo de cada tipo). `undefined` = nunca deu. */
  consents: Partial<Record<ConsentKey, boolean>>;
  history: readonly SentMessage[];
  lastVisitAt: Date | null;
  /** Restaurante em pausa automática (muitas recusas) ou pausado à mão. */
  restaurantPaused: boolean;
  now: Date;
  policy?: SendPolicy;
}

export type SendRefusal = 'no_consent' | 'quiet_hours' | 'frequency_cap' | 'no_reason' | 'cooldown' | 'paused';
export type SendDecision = { ok: true } | { ok: false; reason: SendRefusal };

/** Hora de Lisboa (0–23) sem depender do fuso do servidor. */
export function lisbonHour(d: Date): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Lisbon' }).format(d)) % 24;
}

export function inQuietHours(d: Date, [start, end]: [number, number]): boolean {
  const h = lisbonHour(d);
  return start > end ? h >= start || h < end : h >= start && h < end;
}

/** Consentimento exigido por canal e propósito. `null` = não precisa de consentimento específico. */
export function requiredConsent(channel: Channel, purpose: Purpose): ConsentKey | null {
  if (purpose === 'marketing') {
    return channel === 'whatsapp' ? 'whatsapp_marketing' : channel === 'email' ? 'email_marketing' : channel === 'wallet_push' ? 'wallet_marketing' : 'push';
  }
  if (channel === 'whatsapp') return 'whatsapp_utility';
  if (channel === 'push') return 'push';
  return null; // e-mail transacional/serviço e Wallet de serviço: não precisam (o interruptor próprio trata do resto)
}

const DAY = 86_400_000;

export function shouldSend(r: SendRequest): SendDecision {
  const p = r.policy ?? DEFAULT_SEND_POLICY;
  const need = requiredConsent(r.channel, r.purpose);
  if (need && r.consents[need] !== true) return { ok: false, reason: 'no_consent' };
  // pedidos de avaliação: o cliente pode desligá-los (por omissão ligados; desligar = registo false)
  if (r.purpose === 'service' && r.reason === 'review_request' && r.consents.review_requests === false) return { ok: false, reason: 'no_consent' };
  if (r.purpose === 'transactional') return { ok: true };

  if (inQuietHours(r.now, p.quietHours)) return { ok: false, reason: 'quiet_hours' };

  if (r.purpose === 'service') {
    const today = r.history.filter((m) => m.purpose === 'service' && r.now.getTime() - m.at.getTime() < DAY).length;
    return today >= p.servicePerDay ? { ok: false, reason: 'frequency_cap' } : { ok: true };
  }

  // marketing
  if (r.restaurantPaused) return { ok: false, reason: 'paused' };
  if (!r.reason || r.reason.trim().length < 5) return { ok: false, reason: 'no_reason' };
  if (r.lastVisitAt && r.now.getTime() - r.lastVisitAt.getTime() < p.cooldownHoursAfterVisit * 3_600_000) return { ok: false, reason: 'cooldown' };
  const week = r.history.filter((m) => m.purpose === 'marketing' && r.now.getTime() - m.at.getTime() < 7 * DAY);
  if (week.filter((m) => m.restaurantId === r.restaurantId).length >= p.marketingPerRestaurantPerWeek) return { ok: false, reason: 'frequency_cap' };
  if (week.length >= p.marketingPerWeekTotal) return { ok: false, reason: 'frequency_cap' };
  return { ok: true };
}

/** Pausa automática: muitas recusas (opt-out) depois de ofertas do restaurante nos últimos 7 dias. */
export function shouldAutoPause(sent7d: number, optOuts7d: number, opts = { minSent: 20, maxOptOutRate: 0.05 }): boolean {
  return sent7d >= opts.minSent && optOuts7d / sent7d > opts.maxOptOutRate;
}

export const SEND_REFUSAL_LABEL: Record<SendRefusal, string> = {
  no_consent: 'sem consentimento para este canal',
  quiet_hours: 'horas silenciosas (21h–9h)',
  frequency_cap: 'limite de frequência atingido',
  no_reason: 'falta um motivo concreto',
  cooldown: 'visitou há menos de 24 horas',
  paused: 'envios do restaurante em pausa',
};
