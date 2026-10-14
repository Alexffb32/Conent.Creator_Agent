import { describe, expect, it } from 'vitest';
import { contentNoticeSchema, leadSchema, onboardingSchema, uploadRequestSchema, postCreateSchema, handleSchema } from '../src';

describe('schemas', () => {
  it('onboarding exige termos e privacidade', () => {
    const base = { displayName: 'Alex', handle: 'alex_b', city: 'Covilhã', terms: true, privacy: true, age13: true };
    expect(onboardingSchema.safeParse(base).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...base, terms: false }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, privacy: false }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, age13: false }).success).toBe(false);
  });
  it('handle normaliza e valida', () => {
    expect(handleSchema.parse(' Alex_B ')).toBe('alex_b');
    expect(handleSchema.safeParse('a').success).toBe(false);
    expect(handleSchema.safeParse('com espaço').success).toBe(false);
  });
  it('uploads: formato, tamanho e duração', () => {
    const id = '10000000-0000-4000-8000-000000000001';
    expect(uploadRequestSchema.safeParse({ restaurantId: id, kind: 'video', mime: 'video/mp4', sizeBytes: 5_000_000, durationMs: 20_000 }).success).toBe(true);
    expect(uploadRequestSchema.safeParse({ restaurantId: id, kind: 'video', mime: 'video/avi', sizeBytes: 5 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ restaurantId: id, kind: 'video', mime: 'video/mp4', sizeBytes: 200 * 1024 * 1024 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ restaurantId: id, kind: 'video', mime: 'video/mp4', sizeBytes: 5, durationMs: 31_000 }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ restaurantId: id, kind: 'photo', mime: 'image/jpeg', sizeBytes: 11 * 1024 * 1024 }).success).toBe(false);
  });
  it('publicação valida preço e nome', () => {
    const id = '10000000-0000-4000-8000-000000000001';
    expect(postCreateSchema.safeParse({ restaurantId: id, mediaId: id, dishName: 'Bacalhau', priceEuros: '12.5' }).success).toBe(true);
    expect(postCreateSchema.safeParse({ restaurantId: id, mediaId: id, dishName: 'B' }).success).toBe(false);
  });
  it('pedido de demonstração: campos obrigatórios e campo-armadilha vazio', () => {
    const lead = { name: 'Ana', restaurant: 'Tasca', contact: 'ana@x.pt', city: 'Fundão' };
    expect(leadSchema.safeParse(lead).success).toBe(true);
    expect(leadSchema.safeParse({ ...lead, website: 'http://spam' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...lead, contact: 'x' }).success).toBe(false);
  });
  it('denúncia DSA exige e-mail, explicação e boa-fé', () => {
    const n = { email: 'q@x.pt', url: 'https://provei.pt/r/x', category: 'illegal', explanation: 'Isto é ilegal porque sim e mais.', goodFaith: true };
    expect(contentNoticeSchema.safeParse(n).success).toBe(true);
    expect(contentNoticeSchema.safeParse({ ...n, goodFaith: false }).success).toBe(false);
    expect(contentNoticeSchema.safeParse({ ...n, explanation: 'curto' }).success).toBe(false);
  });
});
