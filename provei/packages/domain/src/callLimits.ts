/** Regras anti-abuso do botão "Chamar empregado" (secção 6.6). */
export interface CallRules {
  minGapSeconds: number; // entre chamadas da mesma mesa
  maxPerUserPerHour: number;
  maxPerRestaurantIpPerHour: number;
  autoExpireMinutes: number;
  rejectionsToBlock: number;
  blockHours: number;
}

export const DEFAULT_CALL_RULES: CallRules = {
  minGapSeconds: 120,
  maxPerUserPerHour: 5,
  maxPerRestaurantIpPerHour: 30,
  autoExpireMinutes: 15,
  rejectionsToBlock: 3,
  blockHours: 24,
};

export interface CallContext {
  now: Date;
  openCallOnTable: boolean;
  lastCallOnTableAt: Date | null;
  userCallsLastHour: number;
  ipCallsLastHour: number;
  userRejectionsToday: number;
  blockedUntil: Date | null;
  ignoredByRestaurant: boolean;
}

export type CallDenied =
  | 'open_call'
  | 'too_soon'
  | 'user_limit'
  | 'ip_limit'
  | 'blocked'
  | 'ignored';

export function evaluateCall(
  ctx: CallContext,
  rules: CallRules = DEFAULT_CALL_RULES,
): { ok: true } | { ok: false; reason: CallDenied; retryAt?: Date } {
  if (ctx.ignoredByRestaurant) return { ok: false, reason: 'ignored' };
  if (ctx.blockedUntil && ctx.now < ctx.blockedUntil) {
    return { ok: false, reason: 'blocked', retryAt: ctx.blockedUntil };
  }
  if (ctx.userRejectionsToday >= rules.rejectionsToBlock) {
    return {
      ok: false,
      reason: 'blocked',
      retryAt: new Date(ctx.now.getTime() + rules.blockHours * 3_600_000),
    };
  }
  if (ctx.openCallOnTable) return { ok: false, reason: 'open_call' };
  if (ctx.lastCallOnTableAt) {
    const retryAt = new Date(ctx.lastCallOnTableAt.getTime() + rules.minGapSeconds * 1000);
    if (ctx.now < retryAt) return { ok: false, reason: 'too_soon', retryAt };
  }
  if (ctx.userCallsLastHour >= rules.maxPerUserPerHour) return { ok: false, reason: 'user_limit' };
  if (ctx.ipCallsLastHour >= rules.maxPerRestaurantIpPerHour) return { ok: false, reason: 'ip_limit' };
  return { ok: true };
}

export function isCallExpired(createdAt: Date, now: Date, rules: CallRules = DEFAULT_CALL_RULES): boolean {
  return now.getTime() - createdAt.getTime() >= rules.autoExpireMinutes * 60_000;
}

export const CALL_DENIED_MESSAGES: Record<CallDenied, string> = {
  open_call: 'Já sabem que precisas de ajuda. Um momento.',
  too_soon: 'Acabaste de chamar. Dá um minutinho à equipa.',
  user_limit: 'Já chamaste várias vezes. Tenta daqui a pouco.',
  ip_limit: 'Há muitos pedidos agora. Tenta daqui a pouco.',
  blocked: 'O botão está indisponível por agora. Chama a equipa com um aceno.',
  ignored: 'O botão está indisponível por agora. Chama a equipa com um aceno.',
};
