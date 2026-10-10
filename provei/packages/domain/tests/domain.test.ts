import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRAM, levelFor, nextLevel, pointsForVisit, pointsForReview, checkStamp, balanceFromEvents,
  stampProgress, canRedeem, suspiciousVisitPattern, checkQrVisit, canBackdateValidation,
  signTableToken, verifyTableToken, newTokenPayload, sessionExpiry, evaluateCall, isCallExpired,
  DEFAULT_CALL_RULES, feedScore, rankFeed, haversineKm, encodeCursor, decodeCursor,
  DEFAULT_PLAN_LIMITS, canCreateTable, canCreatePost, validateReview, reviewReplacesPrevious,
  averageRating, sanitizeText, containsOffensive, isAdEligible, pickAd, adSlots, retentionCurve,
  secondsWatched, passedFiveSeconds, makeRedemptionCode, normalizeCode, redemptionState,
} from '../src';

const t0 = new Date('2026-10-10T12:00:00Z');
const h = (n: number) => new Date(t0.getTime() + n * 3_600_000);

describe('níveis', () => {
  it('sobe por visitas OU pontos', () => {
    expect(levelFor({ visits: 0, points: 0 }).key).toBe('convidado');
    expect(levelFor({ visits: 3, points: 0 }).key).toBe('provador');
    expect(levelFor({ visits: 0, points: 400 }).key).toBe('habitual');
    expect(levelFor({ visits: 25, points: 0 }).key).toBe('embaixador');
  });
  it('próximo nível', () => {
    expect(nextLevel({ visits: 1, points: 10 })?.visitsMissing).toBe(2);
    expect(nextLevel({ visits: 30, points: 0 })).toBeNull();
  });
});

describe('pontos e carimbos', () => {
  it('pontos por visita e primeira visita', () => {
    expect(pointsForVisit(DEFAULT_PROGRAM, { firstVisitToRestaurant: false })).toBe(10);
    expect(pointsForVisit(DEFAULT_PROGRAM, { firstVisitToRestaurant: true })).toBe(30);
    expect(pointsForVisit({ ...DEFAULT_PROGRAM, active: false }, { firstVisitToRestaurant: true })).toBe(0);
  });
  it('pontos por avaliação com foto', () => {
    expect(pointsForReview(DEFAULT_PROGRAM, true)).toBe(5);
    expect(pointsForReview(DEFAULT_PROGRAM, false)).toBe(0);
  });
  it('anti-fraude de carimbo', () => {
    const base = { now: t0, lastStampAt: null, stampsToday: 0, tableSessionAlreadyStamped: false };
    expect(checkStamp(DEFAULT_PROGRAM, base).ok).toBe(true);
    expect(checkStamp(DEFAULT_PROGRAM, { ...base, tableSessionAlreadyStamped: true })).toMatchObject({ reason: 'same_session' });
    expect(checkStamp(DEFAULT_PROGRAM, { ...base, stampsToday: 2 })).toMatchObject({ reason: 'daily_limit' });
    expect(checkStamp(DEFAULT_PROGRAM, { ...base, lastStampAt: h(-1) })).toMatchObject({ reason: 'too_soon' });
    expect(checkStamp(DEFAULT_PROGRAM, { ...base, lastStampAt: h(-13) }).ok).toBe(true);
    expect(checkStamp({ ...DEFAULT_PROGRAM, active: false }, base)).toMatchObject({ reason: 'program_inactive' });
  });
  it('livro-razão coerente', () => {
    const bal = balanceFromEvents([
      { type: 'stamp', delta: 1 }, { type: 'stamp', delta: 1 }, { type: 'points', delta: 30 },
      { type: 'redeem', delta: -2 }, { type: 'adjust', delta: -10, reason: 'points: fraude' },
      { type: 'adjust', delta: 1, reason: 'stamps: correção' },
    ]);
    expect(bal).toEqual({ stamps: 1, points: 20 });
  });
  it('progresso e resgate', () => {
    expect(stampProgress(10, 8)).toMatchObject({ current: 2, completedCards: 1, missing: 6 });
    expect(canRedeem(8, 8)).toBe(true);
    expect(canRedeem(7, 8)).toBe(false);
  });
  it('padrão suspeito', () => {
    expect(suspiciousVisitPattern([h(0), h(1), h(2), h(3)])).toBe(true);
    expect(suspiciousVisitPattern([h(0), h(30), h(60), h(90)])).toBe(false);
    expect(suspiciousVisitPattern([h(0)])).toBe(false);
  });
});

describe('visitas', () => {
  const base = { now: h(1), sessionStartedAt: t0, sessionExpiresAt: h(3), lastVerifiedVisitAt: null };
  it('QR só após 10 min', () => {
    expect(checkQrVisit({ ...base, now: new Date(t0.getTime() + 5 * 60_000) })).toMatchObject({ reason: 'too_early' });
    expect(checkQrVisit(base)).toEqual({ ok: true, level: 'qr' });
  });
  it('sessão inativa e intervalo', () => {
    expect(checkQrVisit({ ...base, sessionEndedAt: h(0.5) })).toMatchObject({ reason: 'session_inactive' });
    expect(checkQrVisit({ ...base, now: h(4) })).toMatchObject({ reason: 'session_inactive' });
    expect(checkQrVisit({ ...base, lastVerifiedVisitAt: h(-2) })).toMatchObject({ reason: 'too_soon' });
  });
  it('validação em atraso', () => {
    expect(canBackdateValidation(h(-2), t0, 'cliente esqueceu').ok).toBe(true);
    expect(canBackdateValidation(h(-2), t0, ' ')).toMatchObject({ reason: 'reason_required' });
    expect(canBackdateValidation(h(-30), t0, 'atrasado')).toMatchObject({ reason: 'too_old' });
    expect(canBackdateValidation(h(1), t0, 'futuro')).toMatchObject({ reason: 'future' });
  });
});

describe('token de mesa', () => {
  const secret = 'segredo-de-teste-1234567890';
  it('assina e verifica', async () => {
    const p = newTokenPayload('mesa-1', 'qr', 'jti-1', 1000);
    const tok = await signTableToken(p, secret);
    const r = await verifyTableToken(tok, secret, 1100);
    expect(r).toEqual({ ok: true, payload: p });
  });
  it('rejeita expirado, adulterado, segredo errado e malformado', async () => {
    const tok = await signTableToken(newTokenPayload('m', 'nfc', 'j', 1000), secret);
    expect(await verifyTableToken(tok, secret, 1000 + 301)).toEqual({ ok: false, reason: 'expired' });
    expect(await verifyTableToken(tok, 'outro-segredo', 1001)).toEqual({ ok: false, reason: 'bad_signature' });
    const [b, s] = tok.split('.');
    const forged = btoa(JSON.stringify({ jti: 'x', tid: 'outra', exp: 99999999999 })).replace(/=/g, '');
    expect(await verifyTableToken(`${forged}.${s}`, secret, 1001)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(b).toBeTruthy();
    expect(await verifyTableToken('lixo', secret)).toEqual({ ok: false, reason: 'malformed' });
    expect(await verifyTableToken('a.b', secret)).toMatchObject({ ok: false });
    const noFields = await signTableToken({ jti: 1 } as never, secret);
    expect(await verifyTableToken(noFields, secret, 1)).toEqual({ ok: false, reason: 'malformed' });
  });
  it('expiração da sessão a 3 h', () => {
    expect(sessionExpiry(t0).getTime() - t0.getTime()).toBe(3 * 3_600_000);
  });
});

describe('chamar empregado', () => {
  const ok = {
    now: t0, openCallOnTable: false, lastCallOnTableAt: null, userCallsLastHour: 0,
    ipCallsLastHour: 0, userRejectionsToday: 0, blockedUntil: null, ignoredByRestaurant: false,
  };
  it('permite pedido normal', () => expect(evaluateCall(ok).ok).toBe(true));
  it('bloqueia cada regra', () => {
    expect(evaluateCall({ ...ok, openCallOnTable: true })).toMatchObject({ reason: 'open_call' });
    expect(evaluateCall({ ...ok, lastCallOnTableAt: new Date(t0.getTime() - 60_000) })).toMatchObject({ reason: 'too_soon' });
    expect(evaluateCall({ ...ok, lastCallOnTableAt: new Date(t0.getTime() - 130_000) }).ok).toBe(true);
    expect(evaluateCall({ ...ok, userCallsLastHour: 5 })).toMatchObject({ reason: 'user_limit' });
    expect(evaluateCall({ ...ok, ipCallsLastHour: 30 })).toMatchObject({ reason: 'ip_limit' });
    expect(evaluateCall({ ...ok, userRejectionsToday: 3 })).toMatchObject({ reason: 'blocked' });
    expect(evaluateCall({ ...ok, blockedUntil: h(1) })).toMatchObject({ reason: 'blocked' });
    expect(evaluateCall({ ...ok, blockedUntil: h(-1) }).ok).toBe(true);
    expect(evaluateCall({ ...ok, ignoredByRestaurant: true })).toMatchObject({ reason: 'ignored' });
  });
  it('auto-expira aos 15 min', () => {
    expect(isCallExpired(new Date(t0.getTime() - 14 * 60_000), t0)).toBe(false);
    expect(isCallExpired(new Date(t0.getTime() - 15 * 60_000), t0, DEFAULT_CALL_RULES)).toBe(true);
  });
});

describe('feed', () => {
  const mk = (id: string, ageH: number, o: Partial<Parameters<typeof feedScore>[0]> = {}) => ({
    id, publishedAt: h(-ageH), followed: false, distanceKm: null, saves: 0, views: 0, now: t0, ...o,
  });
  it('seguidos e recentes ganham', () => {
    expect(feedScore(mk('a', 1, { followed: true }))).toBeGreaterThan(feedScore(mk('b', 1)));
    expect(feedScore(mk('a', 1))).toBeGreaterThan(feedScore(mk('b', 100)));
    expect(feedScore(mk('a', 1, { distanceKm: 0.5 }))).toBeGreaterThan(feedScore(mk('b', 1, { distanceKm: 40 })));
    expect(feedScore(mk('a', 10, { saves: 50, views: 1000 }))).toBeGreaterThan(feedScore(mk('b', 10)));
  });
  it('ordenação estável', () => {
    const r = rankFeed([mk('b', 5), mk('a', 5), mk('c', 1)]);
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('distância e cursor', () => {
    expect(haversineKm({ lat: 40.28, lng: -7.5 }, { lat: 40.14, lng: -7.5 })).toBeGreaterThan(14);
    expect(decodeCursor(encodeCursor(24))).toBe(24);
    expect(decodeCursor('###')).toBe(0);
    expect(decodeCursor(null)).toBe(0);
    expect(decodeCursor(btoa(JSON.stringify({ o: -3 })))).toBe(0);
  });
});

describe('planos', () => {
  it('limites do gratuito', () => {
    const f = DEFAULT_PLAN_LIMITS.free;
    expect(canCreateTable(f, 2)).toBe(true);
    expect(canCreateTable(f, 3)).toBe(false);
    expect(canCreatePost(f, 8)).toBe(false);
    expect(canCreatePost(DEFAULT_PLAN_LIMITS.paid, 9999)).toBe(true);
  });
});

describe('avaliações', () => {
  it('valida', () => {
    expect(validateReview({ rating: 5, text: 'Ótimo' }).ok).toBe(true);
    expect(validateReview({ rating: 0, text: '' })).toMatchObject({ reason: 'rating' });
    expect(validateReview({ rating: 3, text: 'x'.repeat(1001) })).toMatchObject({ reason: 'too_long' });
    expect(validateReview({ rating: 1, text: 'que Merda' })).toMatchObject({ reason: 'offensive' });
    expect(containsOffensive('Estúpido')).toBe(true);
  });
  it('substituição aos 30 dias e média', () => {
    expect(reviewReplacesPrevious(null, t0)).toBe(false);
    expect(reviewReplacesPrevious(new Date('2026-10-01T00:00:00Z'), t0)).toBe(true);
    expect(reviewReplacesPrevious(new Date('2026-08-01T00:00:00Z'), t0)).toBe(false);
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBe(0);
  });
  it('sanitiza', () => {
    expect(sanitizeText(' <script>alert(1)</script>olá\u0000 ')).toBe('alert(1)olá');
  });
});

describe('anúncios', () => {
  const c = {
    id: 'c1', status: 'active' as const, startsAt: h(-24), endsAt: h(24), budgetCents: 100, spentCents: 0,
    targeting: { cities: ['Covilhã'], hours: [13], interests: ['pizza'] },
  };
  const v = { city: 'covilhã', hour: 13, interests: ['pizza'], isAdFree: false, personalizationConsent: true, impressionsTodayByCampaign: {} };
  it('elegibilidade', () => {
    expect(isAdEligible(c, v, t0)).toBe(true);
    expect(isAdEligible(c, { ...v, isAdFree: true }, t0)).toBe(false);
    expect(isAdEligible({ ...c, status: 'paused' }, v, t0)).toBe(false);
    expect(isAdEligible(c, v, h(48))).toBe(false);
    expect(isAdEligible({ ...c, spentCents: 100 }, v, t0)).toBe(false);
    expect(isAdEligible(c, { ...v, impressionsTodayByCampaign: { c1: 3 } }, t0)).toBe(false);
    expect(isAdEligible(c, { ...v, city: 'Fundão' }, t0)).toBe(false);
    expect(isAdEligible(c, { ...v, city: null }, t0)).toBe(false);
    expect(isAdEligible(c, { ...v, hour: 3 }, t0)).toBe(false);
    expect(isAdEligible(c, { ...v, interests: ['sushi'] }, t0)).toBe(false);
  });
  it('sem consentimento ignora interesses', () => {
    expect(isAdEligible(c, { ...v, interests: [], personalizationConsent: false }, t0)).toBe(true);
  });
  it('escolha e posições', () => {
    expect(pickAd([c], v, t0)?.id).toBe('c1');
    expect(pickAd([], v, t0)).toBeNull();
    const c2 = { ...c, id: 'c2', budgetCents: 500 };
    expect(pickAd([c, c2], v, t0)?.id).toBe('c2');
    expect(adSlots(16)).toEqual([7, 15]);
    expect(adSlots(8, 8)).toEqual([7]);
    expect(adSlots(3)).toEqual([]);
  });
});

describe('retenção e resgates', () => {
  it('curva', () => {
    const curve = retentionCurve([{ second: 0, views: 10 }, { second: 5, views: 6 }, { second: 1, views: 9 }], 8);
    expect(curve).toHaveLength(8);
    expect(curve[5]?.pct).toBe(60);
    expect(passedFiveSeconds(curve)).toBe(true);
    expect(retentionCurve([], 0)[0]?.pct).toBe(0);
    expect(passedFiveSeconds([])).toBe(false);
  });
  it('segundos vistos', () => {
    expect(secondsWatched(0, 2500)).toEqual([0, 1, 2]);
    expect(secondsWatched(2500, 2500)).toEqual([]);
    expect(secondsWatched(29000, 40000)).toEqual([29]);
  });
  it('códigos', () => {
    const code = makeRedemptionCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(makeRedemptionCode(() => 0)).toBe('AAAA-AAAA');
    expect(normalizeCode('ab2c d3ef')).toBe('AB2C-D3EF');
    expect(normalizeCode('xx')).toBe('XX');
    const r = { redeemedAt: null, expiresAt: h(1) };
    expect(redemptionState(r, t0)).toBe('issued');
    expect(redemptionState(r, h(2))).toBe('expired');
    expect(redemptionState({ ...r, redeemedAt: t0 }, h(2))).toBe('redeemed');
  });
});
