import { NextResponse } from 'next/server';
import { feedEventsBatchSchema } from '@provei/api-client';
import { createServerSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { getSessionProfile } from '@/server/auth';
import { rateLimit } from '@/server/ratelimit';

export const runtime = 'nodejs';

/**
 * Eventos do feed para personalização. Só grava com conta, flag `recommender` ligada e consentimento
 * `personalization` dado. Sem isso responde 204 e não guarda nada (o feed fica não personalizado).
 */
export async function POST(req: Request) {
  const parsed = feedEventsBatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const [me, flags] = await Promise.all([getSessionProfile(), getFlags()]);
  if (!me || me.suspended || !flags.recommender || !me.consents.personalization) return new NextResponse(null, { status: 204 });
  if (!(await rateLimit(`feed:${me.id}`, 60, 120))) return NextResponse.json({ ok: false }, { status: 429 });
  const sb = await createServerSupabase();
  const rows = parsed.data.events.map((e) => ({
    user_id: me.id,
    impression_id: e.impressionId,
    post_id: e.postId ?? null,
    restaurant_id: e.restaurantId ?? null,
    event: e.event,
    value: e.value ?? null,
  }));
  const { error } = await sb.from('feed_events').insert(rows);
  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, stored: rows.length });
}
