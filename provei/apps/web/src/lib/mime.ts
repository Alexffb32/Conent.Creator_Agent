/** Deteção do tipo real pelos primeiros bytes (não confiar no Content-Type enviado pelo cliente). */
export type SniffedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/quicktime' | null;

export function sniffMime(b: Uint8Array): SniffedMime {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && ascii(4, 8) === 'ftyp') return ascii(8, 12).startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  return null;
}

export function mimesCompatible(declared: string, real: SniffedMime): boolean {
  if (!real) return false;
  if (declared === real) return true;
  return declared.startsWith('video/') && real.startsWith('video/');
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
export const extFor = (mime: string) => EXT[mime] ?? 'bin';
