/**
 * Testes anti-abuso contra uma base de dados real (Supabase). Correm quando há
 * NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY; caso contrário são ignorados.
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTokenPayload, signTableToken } from '@provei/domain';

process.env.TABLE_TOKEN_SECRET ??= 'integration-test-secret-0000000000';
const hasBackend = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!hasBackend)('anti-abuso (base de dados real)', () => {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://x', process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'x', { auth: { persistSession: false } });
  const suffix = randomUUID().slice(0, 8);
  const ids: { restaurant?: string; table?: string; users: string[] } = { users: [] };

  async function mkUser(tag: string) {
    const { data, error } = await sb.auth.admin.createUser({ email: `it-${tag}-${suffix}@provei.test`, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message);
    ids.users.push(data.user.id);
    return data.user.id;
  }

  beforeAll(async () => {
    const { data: r } = await sb.from('restaurants').insert({ slug: `it-${suffix}`, name: `IT ${suffix}`, city: 'Covilhã', verified_status: 'verified', is_demo: true }).select('id').single();
    ids.restaurant = r!.id;
    const { data: t } = await sb.from('tables').insert({ restaurant_id: r!.id, label: '1', public_code: `it${suffix}x`.slice(0, 10) }).select('id').single();
    ids.table = t!.id;
    await sb.from('loyalty_programs').insert({ restaurant_id: r!.id, stamps_required: 2, min_interval_hours: 12 });
  });

  afterAll(async () => {
    if (ids.restaurant) await sb.from('restaurants').delete().eq('id', ids.restaurant);
    for (const u of ids.users) await sb.auth.admin.deleteUser(u).catch(() => {});
  });

  it('o token de mesa é de uso único (outro utilizador não o reutiliza)', async () => {
    const { exchangeTableToken } = await import('../../src/server/tables');
    const a = await mkUser('a');
    const b = await mkUser('b');
    const token = await signTableToken(newTokenPayload(ids.table!, 'qr', randomUUID()), process.env.TABLE_TOKEN_SECRET!);
    const first = await exchangeTableToken(token, a);
    expect(first.sessionId).toBeTruthy();
    await expect(exchangeTableToken(token, b)).rejects.toThrow(/já foi usado/);
    // o mesmo utilizador a repetir (refresh) reaproveita a sessão
    expect((await exchangeTableToken(token, a)).sessionId).toBe(first.sessionId);
  });

  it('token expirado, adulterado ou de outro segredo é recusado', async () => {
    const { exchangeTableToken } = await import('../../src/server/tables');
    const u = await mkUser('c');
    const expired = await signTableToken({ ...newTokenPayload(ids.table!, 'qr', randomUUID()), exp: Math.floor(Date.now() / 1000) - 10 }, process.env.TABLE_TOKEN_SECRET!);
    await expect(exchangeTableToken(expired, u)).rejects.toThrow(/expirou/);
    const wrong = await signTableToken(newTokenPayload(ids.table!, 'qr', randomUUID()), 'outro-segredo-qualquer-123456');
    await expect(exchangeTableToken(wrong, u)).rejects.toThrow(/inválido/);
  });

  it('chamadas: uma aberta por mesa, intervalo mínimo e bloqueio após 3 rejeições', async () => {
    const { exchangeTableToken, createWaiterCall } = await import('../../src/server/tables');
    const u = await mkUser('d');
    const token = await signTableToken(newTokenPayload(ids.table!, 'qr', randomUUID()), process.env.TABLE_TOKEN_SECRET!);
    const { sessionId } = await exchangeTableToken(token, u);
    const id1 = await createWaiterCall({ userId: u, sessionId, reason: 'call', ipHash: 'h1' });
    expect(id1).toBeTruthy();
    await expect(createWaiterCall({ userId: u, sessionId, reason: 'call', ipHash: 'h1' })).rejects.toThrow(/sabem que precisas/);
    for (let i = 0; i < 3; i++) {
      await sb.from('waiter_calls').update({ status: 'rejected', resolved_at: new Date().toISOString(), created_at: new Date(Date.now() - 10 * 60_000).toISOString() }).eq('table_id', ids.table!).in('status', ['open', 'rejected']);
      if (i < 2) await sb.from('waiter_calls').insert({ table_session_id: sessionId, restaurant_id: ids.restaurant!, table_id: ids.table!, user_id: u, status: 'rejected', created_at: new Date(Date.now() - (9 - i) * 60_000).toISOString() });
    }
    await expect(createWaiterCall({ userId: u, sessionId, reason: 'call', ipHash: 'h1' })).rejects.toThrow(/indisponível/);
  });

  it('visita: sessão recente é recusada; carimbo não duplica na mesma sessão; ledger coerente', async () => {
    const { exchangeTableToken } = await import('../../src/server/tables');
    const { recordVerifiedVisit } = await import('../../src/server/loyalty');
    const u = await mkUser('e');
    const token = await signTableToken(newTokenPayload(ids.table!, 'qr', randomUUID()), process.env.TABLE_TOKEN_SECRET!);
    const { sessionId } = await exchangeTableToken(token, u);
    await expect(recordVerifiedVisit({ userId: u, restaurantId: ids.restaurant!, level: 'qr', tableSessionId: sessionId })).rejects.toThrow(/cedo/);
    await sb.from('table_sessions').update({ started_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq('id', sessionId);
    const r1 = await recordVerifiedVisit({ userId: u, restaurantId: ids.restaurant!, level: 'qr', tableSessionId: sessionId });
    expect(r1.stamped).toBe(true);
    await expect(recordVerifiedVisit({ userId: u, restaurantId: ids.restaurant!, level: 'qr', tableSessionId: sessionId })).rejects.toThrow();
    const { data: events } = await sb.from('loyalty_events').select('type').eq('visit_id', r1.visitId);
    expect(events?.filter((e) => e.type === 'stamp')).toHaveLength(1);
    const { data: card } = await sb.from('loyalty_cards').select('id').eq('user_id', u).single();
    expect((await sb.rpc('loyalty_card_consistent', { p_card: card!.id })).data).toBe(true);
  });
});
