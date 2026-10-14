/** Retenção por segundo a partir de buckets (segundo -> visualizações). */
export function retentionCurve(buckets: readonly { second: number; views: number }[], durationSec: number) {
  const bySec = new Map(buckets.map((b) => [b.second, b.views]));
  const first = bySec.get(0) ?? 0;
  const out: { second: number; views: number; pct: number }[] = [];
  for (let s = 0; s < Math.max(1, Math.ceil(durationSec)); s++) {
    const views = bySec.get(s) ?? 0;
    out.push({ second: s, views, pct: first > 0 ? Math.round((views / first) * 100) : 0 });
  }
  return out;
}

/** Converte tempo de reprodução em segundos únicos vistos desde o último lote. */
export function secondsWatched(fromMs: number, toMs: number, maxSeconds = 30): number[] {
  if (toMs <= fromMs) return [];
  const a = Math.floor(fromMs / 1000);
  const b = Math.min(maxSeconds - 1, Math.floor((toMs - 1) / 1000));
  const out: number[] = [];
  for (let s = a; s <= b; s++) out.push(s);
  return out;
}

export function passedFiveSeconds(curve: readonly { second: number; pct: number }[]): boolean {
  const at5 = curve.find((c) => c.second === 5);
  return !!at5 && at5.pct >= 50;
}
