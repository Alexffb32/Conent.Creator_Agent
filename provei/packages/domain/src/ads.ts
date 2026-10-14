export interface AdTargeting {
  cities?: string[];
  hours?: number[]; // 0..23, hora de Lisboa
  interests?: string[];
}

export interface AdCampaignLite {
  id: string;
  status: 'draft' | 'active' | 'paused' | 'ended';
  startsAt: Date;
  endsAt: Date;
  budgetCents: number;
  spentCents: number;
  targeting: AdTargeting;
}

export interface AdViewer {
  city: string | null;
  hour: number;
  interests: string[];
  isAdFree: boolean;
  personalizationConsent: boolean;
  impressionsTodayByCampaign: Record<string, number>;
}

export const AD_DAILY_CAP_PER_CAMPAIGN = 3;
export const AD_COST_PER_IMPRESSION_CENTS = 1;

export function isAdEligible(c: AdCampaignLite, v: AdViewer, now: Date): boolean {
  if (v.isAdFree) return false;
  if (c.status !== 'active') return false;
  if (now < c.startsAt || now > c.endsAt) return false;
  if (c.spentCents + AD_COST_PER_IMPRESSION_CENTS > c.budgetCents) return false;
  if ((v.impressionsTodayByCampaign[c.id] ?? 0) >= AD_DAILY_CAP_PER_CAMPAIGN) return false;
  const t = c.targeting;
  if (t.cities?.length && (!v.city || !t.cities.map((x) => x.toLowerCase()).includes(v.city.toLowerCase()))) return false;
  if (t.hours?.length && !t.hours.includes(v.hour)) return false;
  // Sem consentimento só cidade e hora: nunca segmentar por comportamento/interesses.
  if (t.interests?.length && v.personalizationConsent && !t.interests.some((i) => v.interests.includes(i))) return false;
  return true;
}

export function pickAd(cs: readonly AdCampaignLite[], v: AdViewer, now: Date): AdCampaignLite | null {
  const ok = cs.filter((c) => isAdEligible(c, v, now));
  if (ok.length === 0) return null;
  // Maior orçamento restante primeiro (simples e explicável); empate por id.
  return [...ok].sort((a, b) => b.budgetCents - b.spentCents - (a.budgetCents - a.spentCents) || a.id.localeCompare(b.id))[0]!;
}

/**
 * Posições dos anúncios numa página de `n` cartões: no máximo 1 em cada 8, nunca na posição 0.
 * `offset` é o índice global do primeiro cartão da página, para o rácio se manter entre páginas.
 */
export function adSlots(n: number, offset = 0, every = 8): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const g = offset + i;
    if (g > 0 && (g + 1) % every === 0) out.push(i);
  }
  return out;
}
