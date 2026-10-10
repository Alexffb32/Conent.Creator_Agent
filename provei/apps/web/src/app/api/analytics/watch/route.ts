import { NextResponse } from 'next/server';
import { watchProgressSchema } from '@provei/api-client';
import { createServiceSupabase } from '@/lib/supabase/server';
import { rateLimit } from '@/server/ratelimit';
import { ipHash } from '@/server/audit';

export const runtime = 'nodejs';

/** Retenção por segundo (lotes de até 10 segundos a cada 5 s). Anónimo permitido; limitado por IP. */
export async function POST(req: Request) {
  const parsed = watchProgressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const ip = await ipHash();
  if (!(await rateLimit(`watch:${ip}`, 60, 60))) return NextResponse.json({ ok: false }, { status: 429 });
  const unique = [...new Set(parsed.data.seconds)];
  const sb = createServiceSupabase();
  const { error } = await sb.rpc('bump_watch_buckets', { p_post: parsed.data.postId, p_seconds: unique });
  if (error) return NextResponse.json({ ok: false }, { status: 400 });
  if (unique.includes(0)) {
    const { data: post } = await sb.from('posts').select('restaurant_id, view_count').eq('id', parsed.data.postId).maybeSingle();
    if (post) {
      await sb.from('posts').update({ view_count: post.view_count + 1 }).eq('id', parsed.data.postId);
      await sb.rpc('bump_event', { p_restaurant: post.restaurant_id, p_type: 'view' });
    }
  }
  return NextResponse.json({ ok: true });
}
