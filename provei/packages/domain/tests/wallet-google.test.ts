import { describe, expect, it } from 'vitest';
import { buildGoogleLoyaltyClass, buildGoogleLoyaltyObject, googleClassId, googleMessage, googlePointsPatch } from '../src/wallet-google';

const locs = Array.from({ length: 12 }, (_, i) => ({ latitude: 40 + i / 100, longitude: -7.5 }));
const obj = {
  issuerId: '3388000000012345678',
  restaurantId: '11111111-2222-3333-4444-555555555555',
  serialNumber: 'a'.repeat(32),
  memberToken: 'tok_abcdefghijklmnop',
  points: 70,
  progress: '2 de 8 carimbos',
  level: 'Convidado',
  locations: locs,
  withLocations: true,
  links: { terms: 'https://x/t', privacy: 'https://x/p' },
};

describe('Google Wallet: classe e objeto', () => {
  it('classe por restaurante com cor da marca e ≤ 10 localizações só com a flag', () => {
    const c = buildGoogleLoyaltyClass({ issuerId: obj.issuerId, restaurantId: obj.restaurantId, restaurantName: 'Café Teste', logoUrl: 'https://x/l.png', locations: locs, withLocations: true });
    expect(c.id).toBe('3388000000012345678.provei_r_11111111222233334444555555555555');
    expect(c).toMatchObject({ issuerName: 'Provei', programName: 'Café Teste', hexBackgroundColor: '#2D7F1A', countryCode: 'PT' });
    expect(c.merchantLocations).toHaveLength(10);
    expect(buildGoogleLoyaltyClass({ issuerId: obj.issuerId, restaurantId: obj.restaurantId, restaurantName: 'X', logoUrl: 'https://x', locations: locs, withLocations: false })).not.toHaveProperty('merchantLocations');
  });
  it('objeto: pontos, QR opaco, sem dados pessoais, anulado = INACTIVE', () => {
    const o = buildGoogleLoyaltyObject(obj);
    expect(o.id).toBe(`3388000000012345678.${'a'.repeat(32)}`);
    expect(o.classId).toBe(googleClassId(obj.issuerId, obj.restaurantId));
    expect(o.loyaltyPoints).toEqual({ label: 'Pontos', balance: { int: 70 } });
    expect(o.barcode).toEqual({ type: 'QR_CODE', value: 'provei:w:tok_abcdefghijklmnop' });
    expect(o.state).toBe('ACTIVE');
    expect(o).not.toHaveProperty('accountName');
    expect(JSON.stringify(o)).not.toMatch(/@[a-z]+\./i);
    expect(buildGoogleLoyaltyObject({ ...obj, voided: true, holderFirstName: 'Ana' })).toMatchObject({ state: 'INACTIVE' });
    expect(buildGoogleLoyaltyObject({ ...obj, voided: true, holderFirstName: 'Ana' })).not.toHaveProperty('accountName');
  });
  it('atualização de pontos com aviso só quando pedido; mensagem TEXT ou TEXT_AND_NOTIFY', () => {
    expect(googlePointsPatch(90, true)).toEqual({ loyaltyPoints: { label: 'Pontos', balance: { int: 90 } }, notifyPreference: 'notifyOnUpdate' });
    expect(googlePointsPatch(90, false)).not.toHaveProperty('notifyPreference');
    expect(googleMessage('m1', 'Oferta', 'Sobremesa', true).message.messageType).toBe('TEXT_AND_NOTIFY');
    expect(googleMessage('m1', 'Oferta', 'Sobremesa', false).message.messageType).toBe('TEXT');
  });
});
