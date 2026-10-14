/**
 * Ordenação do feed, simples e explicável (ver docs/DECISIONS.md):
 *   score = 3·seguido + recência(0..3) + proximidade(0..2) + popularidade(0..1)
 * recência = 3 · 0.5^(idadeHoras/48); proximidade = 2 · 0.5^(km/5); popularidade decai com o tempo.
 */
export interface RankInput {
  publishedAt: Date;
  followed: boolean;
  distanceKm: number | null;
  saves: number;
  views: number;
  now: Date;
}

export function feedScore(i: RankInput): number {
  const ageH = Math.max(0, (i.now.getTime() - i.publishedAt.getTime()) / 3_600_000);
  const recency = 3 * Math.pow(0.5, ageH / 48);
  const proximity = i.distanceKm == null ? 0 : 2 * Math.pow(0.5, i.distanceKm / 5);
  const engagement = Math.log10(1 + i.saves * 5 + i.views * 0.1);
  const popularity = Math.min(1, engagement / 3) * Math.pow(0.5, ageH / 168);
  return (i.followed ? 3 : 0) + recency + proximity + popularity;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function rankFeed<T extends RankInput & { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => feedScore(y) - feedScore(x) || x.id.localeCompare(y.id));
}

/** Cursor opaco para paginação estável: (score arredondado, id). */
export function encodeCursor(offset: number): string {
  return btoa(JSON.stringify({ o: offset })).replace(/=+$/, '');
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const v = JSON.parse(atob(cursor)) as { o?: unknown };
    return typeof v.o === 'number' && v.o >= 0 ? Math.floor(v.o) : 0;
  } catch {
    return 0;
  }
}
