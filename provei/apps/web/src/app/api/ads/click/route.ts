import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { getSessionProfile } from '@/server/auth';
import { ipHash } from '@/server/audit';
import { rateLimit } from '@/server/ratelimit';

export const runtime = 'nodejs';
const body = z.object({ campaignId: z.string().uuid() });

export async function POST(req: Request) {
  if (!(await getFlags()).ads) return NextResponse.json({ ok: false }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (!(await rateLimit(`adclk:${await ipHash()}`, 60, 20))) return NextResponse.json({ ok: false }, { status: 429 });
  const me = await getSessionProfile();
  await createServiceSupabase().from('ad_clicks').insert({ campaign_id: parsed.data.campaignId, user_id: me?.id ?? null });
  return NextResponse.json({ ok: true });
}
