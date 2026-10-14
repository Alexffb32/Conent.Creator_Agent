import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Webhook do processador externo (Mux). Atualiza o média e publica posts que esperavam. */
export async function POST(req: Request) {
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Não configurado' }, { status: 503 });
  const raw = await req.text();
  const header = req.headers.get('mux-signature') ?? '';
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const expected = createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const ok = parts.v1 && parts.v1.length === expected.length && timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 });

  const evt = JSON.parse(raw) as { type: string; data: { id: string; passthrough?: string; playback_ids?: { id: string }[]; duration?: number } };
  if (evt.type !== 'video.asset.ready' && evt.type !== 'video.asset.errored') return NextResponse.json({ ok: true });
  const mediaId = evt.data.passthrough;
  if (!mediaId) return NextResponse.json({ ok: true });
  const svc = createServiceSupabase();
  if (evt.type === 'video.asset.errored') {
    await svc.from('media_assets').update({ status: 'failed' }).eq('id', mediaId);
    return NextResponse.json({ ok: true });
  }
  const pb = evt.data.playback_ids?.[0]?.id;
  await svc
    .from('media_assets')
    .update({
      status: 'ready',
      poster_path: pb ? `https://image.mux.com/${pb}/thumbnail.jpg` : null,
      variants: pb ? { mp4_720: `https://stream.mux.com/${pb}/medium.mp4` } : {},
      duration_ms: evt.data.duration ? Math.round(evt.data.duration * 1000) : null,
    })
    .eq('id', mediaId);
  const { data: posts } = await svc.from('posts').update({ status: 'published', published_at: new Date().toISOString() }).eq('media_id', mediaId).eq('status', 'processing').select('id');
  return NextResponse.json({ ok: true, published: posts?.length ?? 0 });
}
