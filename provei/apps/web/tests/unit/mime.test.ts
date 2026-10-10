import { describe, expect, it } from 'vitest';
import { extFor, mimesCompatible, sniffMime } from '../../src/lib/mime';

const bytes = (...n: number[]) => new Uint8Array(n);
const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));

describe('deteção de tipo real', () => {
  it('reconhece jpeg, png, webp, mp4 e mov', () => {
    expect(sniffMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffMime(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('image/webp');
    expect(sniffMime(bytes(0, 0, 0, 0x18, ...ascii('ftypisom')))).toBe('video/mp4');
    expect(sniffMime(bytes(0, 0, 0, 0x14, ...ascii('ftypqt  ')))).toBe('video/quicktime');
  });
  it('rejeita executáveis e lixo disfarçados', () => {
    expect(sniffMime(bytes(0x4d, 0x5a, 0x90, 0x00))).toBeNull();
    expect(sniffMime(new Uint8Array())).toBeNull();
    expect(mimesCompatible('image/png', sniffMime(bytes(0x4d, 0x5a)))).toBe(false);
  });
  it('compatibilidade e extensões', () => {
    expect(mimesCompatible('video/quicktime', 'video/mp4')).toBe(true);
    expect(mimesCompatible('image/png', 'image/jpeg')).toBe(false);
    expect(extFor('video/mp4')).toBe('mp4');
    expect(extFor('x/y')).toBe('bin');
  });
});
