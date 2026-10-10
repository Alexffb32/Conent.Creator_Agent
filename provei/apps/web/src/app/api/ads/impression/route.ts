import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AD_COST_PER_IMPRESSION_CENTS } from '@provei/domain';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { getSessionProfile } from '@/server/auth';
import { ipHash } from '@/server/audit';
import { rateLimit } from '@/server/ratelimit';

export const runtime = 'nodejs';
const body = z.object({ campaignId: z.string().uuid() });

export async function POST(req: Request) {
  const flags = await getFlags();
  if (!flags.ads) return NextResponse.json({ ok: false }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await rateLimit(`adimp:${await ipHash()}`, 60, 30))) return NextResponse.json({ ok: false }, { status: 429 });
  const me = await getSessionProfile();
  if (me?.isAdFree) return NextResponse.json({ ok: false }, { status: 204 });
  const sb = createServiceSupabase();
  const { data: c } = await sb.from('ad_campaigns').select('id, spent_cents, budget_cents, status').eq('id', parsed.data.campaignId).maybeSingle();
  if (!c || c.status !== 'active' || c.spent_cents + AD_COST_PER_IMPRESSION_CENTS > c.budget_cents) return NextResponse.json({ ok: false }, { status: 404 });
  await sb.from('ad_impressions').insert({ campaign_id: c.id, user_id: me?.id ?? null });
  await sb.from('ad_campaigns').update({ spent_cents: c.spent_cents + AD_COST_PER_IMPRESSION_CENTS }).eq('id', c.id);
  return NextResponse.json({ ok: true });
}
