import { describe, expect, it } from 'vitest';
import { buildGoogleLoyaltyClass } from '@provei/domain';
import { GoogleWalletProvider, SimulatedGoogleTransport, isQuotaExceeded } from '@/server/wallet/google';

const ISSUER = '3388000000012345678';
const quota = { status: 429, json: { error: { code: 429, message: 'QuotaExceededException: notification limit' } } };

describe('Google Wallet (transporte simulado)', () => {
  it('classe: cria se não existe, atualiza se existe', async () => {
    const t = new SimulatedGoogleTransport();
    const g = new GoogleWalletProvider(t, ISSUER);
    const cls = buildGoogleLoyaltyClass({ issuerId: ISSUER, restaurantId: 'r1', restaurantName: 'Café', logoUrl: 'https://x/l.png', locations: [], withLocations: false });
    await g.upsertClass(cls);
    await g.upsertClass(cls);
    expect(t.calls.map((c) => c.method)).toEqual(['GET', 'POST', 'GET', 'PATCH']);
  });

  it('pontos com aviso só quando pedido (notifyPreference transitório)', async () => {
    const t = new SimulatedGoogleTransport();
    const g = new GoogleWalletProvider(t, ISSUER);
    expect(await g.updatePoints(`${ISSUER}.abc`, 120, true)).toBe('notified');
    expect(await g.updatePoints(`${ISSUER}.abc`, 130, false)).toBe('silent');
    expect(t.calls[0]!.body).toEqual({ loyaltyPoints: { label: 'Pontos', balance: { int: 120 } }, notifyPreference: 'notifyOnUpdate' });
    expect(t.calls[1]!.body).not.toHaveProperty('notifyPreference');
  });

  it('acima de 3 avisos em 24 h: QuotaExceeded → repete sem aviso', async () => {
    const t = new SimulatedGoogleTransport((m, _p, body) => (m === 'PATCH' && (body as { notifyPreference?: string }).notifyPreference ? quota : undefined));
    const g = new GoogleWalletProvider(t, ISSUER);
    expect(await g.updatePoints(`${ISSUER}.abc`, 140, true)).toBe('quota_fallback');
    expect(t.calls).toHaveLength(2);
    expect(t.calls[1]!.body).not.toHaveProperty('notifyPreference');
  });

  it('mensagens: TEXT_AND_NOTIFY só com consentimento; acima da quota volta a TEXT', async () => {
    const t = new SimulatedGoogleTransport((_m, _p, body) => ((body as { message?: { messageType: string } })?.message?.messageType === 'TEXT_AND_NOTIFY' ? quota : undefined));
    const g = new GoogleWalletProvider(t, ISSUER);
    expect(await g.addMessage(`${ISSUER}.abc`, 'm1', 'Oferta', 'Sobremesa', true)).toBe('quota_fallback');
    expect((t.calls[1]!.body as { message: { messageType: string } }).message.messageType).toBe('TEXT');
    expect(t.calls[0]!.path).toBe(`/loyaltyObject/${encodeURIComponent(`${ISSUER}.abc`)}/addMessage`);
    expect(await g.addMessage(`${ISSUER}.abc`, 'm2', 'Info', 'Texto', false)).toBe('silent');
  });

  it('deteta QuotaExceededException pelo estado ou pela mensagem', () => {
    expect(isQuotaExceeded(quota)).toBe(true);
    expect(isQuotaExceeded({ status: 400, json: { error: { message: 'QuotaExceededException' } } })).toBe(true);
    expect(isQuotaExceeded({ status: 200, json: {} })).toBe(false);
  });

  it('erro da API rebenta com mensagem (fica registado e pendente)', async () => {
    const g = new GoogleWalletProvider(new SimulatedGoogleTransport(() => ({ status: 500, json: null })), ISSUER);
    await expect(g.updatePoints(`${ISSUER}.abc`, 1, false)).rejects.toThrow(/500/);
  });
});
