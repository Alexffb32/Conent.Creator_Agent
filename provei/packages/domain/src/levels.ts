import type { LevelKey } from './types';

export interface LevelDef {
  key: LevelKey;
  label: string;
  minVisits: number;
  minPoints: number;
}

/** Níveis por omissão (documento do projeto, secção 6.8). Cumpre visitas OU pontos. */
export const DEFAULT_LEVELS: readonly LevelDef[] = [
  { key: 'convidado', label: 'Convidado', minVisits: 0, minPoints: 0 },
  { key: 'provador', label: 'Provador', minVisits: 3, minPoints: 100 },
  { key: 'habitual', label: 'Habitual', minVisits: 10, minPoints: 400 },
  { key: 'embaixador', label: 'Embaixador', minVisits: 25, minPoints: 1000 },
];

export function levelFor(
  stats: { visits: number; points: number },
  levels: readonly LevelDef[] = DEFAULT_LEVELS,
): LevelDef {
  let current = levels[0]!;
  for (const level of levels) {
    if (stats.visits >= level.minVisits || stats.points >= level.minPoints) current = level;
  }
  return current;
}

export function nextLevel(
  stats: { visits: number; points: number },
  levels: readonly LevelDef[] = DEFAULT_LEVELS,
): { level: LevelDef; visitsMissing: number; pointsMissing: number } | null {
  const cur = levelFor(stats, levels);
  const next = levels[levels.findIndex((l) => l.key === cur.key) + 1];
  if (!next) return null;
  return {
    level: next,
    visitsMissing: Math.max(0, next.minVisits - stats.visits),
    pointsMissing: Math.max(0, next.minPoints - stats.points),
  };
}
