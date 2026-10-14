import { describe, expect, it } from 'vitest';
import { buildStorePassJson, isLocationControl, passProgressText, pointsChangeMessage, type StorePassInput } from '../src/wallet';

const base: StorePassInput = {
  passTypeIdentifier: 'pass.pt.provei.loyalty',
  teamIdentifier: 'ABCDE12345',
  serialNumber: 'serial-0001',
  authenticationToken: 'a'.repeat(43),
  webServiceURL: 'https://provei.example/api/wallet/apple',
  memberToken: 'tok_abcdefghijklmnop',
  restaurant: { name: 'Café Teste', phone: '+351 275 000 000', locations: Array.from({ length: 12 }, (_, i) => ({ latitude: 40 + i / 100, longitude: -7.5 })) },
  points: 120,
  level: 'Habitual',
  progress: '3 de 8 carimbos',
  withLocations: true,
  relevantText: 'Tens pontos para trocar aqui',
  links: { terms: 'https://provei.example/legal/termos', privacy: 'https://provei.example/legal/privacidade' },
};

describe('pass.json do cartão (storeCard)', () => {
  it('tem os campos obrigatórios, cores da marca e partilha proibida', () => {
    const p = buildStorePassJson(base);
    expect(p).toMatchObject({
      formatVersion: 1,
      passTypeIdentifier: 'pass.pt.provei.loyalty',
      teamIdentifier: 'ABCDE12345',
      organizationName: 'Provei',
      serialNumber: 'serial-0001',
      backgroundColor: 'rgb(45, 127, 26)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(244, 249, 238)',
      logoText: 'Café Teste',
      sharingProhibited: true,
    });
    expect(p.voided).toBeUndefined();
  });
  it('pontos no cabeçalho com changeMessage %@; oferta vazia por omissão; nível e progresso', () => {
    const p = buildStorePassJson(base);
    expect(p.storeCard.headerFields).toEqual([{ key: 'points', label: 'Pontos', value: 120, changeMessage: 'Tens %@ pontos no Café Teste' }]);
    expect(p.storeCard.primaryFields[0]).toMatchObject({ key: 'progress', value: '3 de 8 carimbos' });
    expect(p.storeCard.secondaryFields[0]).toMatchObject({ key: 'level', value: 'Habitual' });
    expect(p.storeCard.auxiliaryFields).toEqual([{ key: 'offer', label: 'Oferta', value: '', changeMessage: '%@' }]);
    expect(p.storeCard.backFields.map((f) => f.key)).toEqual(['terms', 'privacy', 'notifications', 'contact']);
  });
  it('o QR leva só o token opaco; o cartão não leva e-mail nem telefone do cliente', () => {
    const p = buildStorePassJson({ ...base, holderFirstName: null });
    expect(p.barcodes).toEqual([{ format: 'PKBarcodeFormatQR', message: 'provei:w:tok_abcdefghijklmnop', messageEncoding: 'iso-8859-1' }]);
    const s = JSON.stringify(p);
    expect(s).not.toMatch(/@[a-z]+\./i);
    expect(p.storeCard.secondaryFields.some((f) => f.key === 'holder')).toBe(false);
    expect(buildStorePassJson({ ...base, holderFirstName: 'Ana' }).storeCard.secondaryFields.at(-1)).toMatchObject({ key: 'holder', value: 'Ana' });
  });
  it('localizações: máximo 10, com relevantText; nenhuma sem a flag ou no grupo de controlo', () => {
    const p = buildStorePassJson(base);
    expect(p.locations).toHaveLength(10);
    expect(p.locations![0]).toMatchObject({ relevantText: 'Tens pontos para trocar aqui' });
    expect(buildStorePassJson({ ...base, withLocations: false }).locations).toBeUndefined();
  });
  it('recusa token curto, URL sem HTTPS e token de membro com caracteres inválidos', () => {
    expect(() => buildStorePassJson({ ...base, authenticationToken: 'curto' })).toThrow();
    expect(() => buildStorePassJson({ ...base, webServiceURL: 'http://x' })).toThrow();
    expect(() => buildStorePassJson({ ...base, memberToken: 'tem espaços e @' })).toThrow();
  });
  it('cartão anulado', () => {
    expect(buildStorePassJson({ ...base, voided: true }).voided).toBe(true);
  });
  it('escapa % no nome do restaurante na changeMessage', () => {
    expect(pointsChangeMessage('100% Bom')).toBe('Tens %@ pontos no 100%% Bom');
  });
});

describe('grupo de controlo das localizações', () => {
  it('é determinístico e fica perto de 10%', () => {
    expect(isLocationControl('abc')).toBe(isLocationControl('abc'));
    let n = 0;
    for (let i = 0; i < 20000; i++) if (isLocationControl(`serial-${i}`)) n++;
    expect(n / 20000).toBeGreaterThan(0.085);
    expect(n / 20000).toBeLessThan(0.115);
  });
});

describe('texto de progresso', () => {
  it('mostra carimbos ou recompensa pronta', () => {
    expect(passProgressText(3, 8)).toBe('3 de 8 carimbos');
    expect(passProgressText(9, 8)).toBe('Recompensa pronta a trocar');
  });
});
