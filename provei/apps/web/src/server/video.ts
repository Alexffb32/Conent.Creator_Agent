import 'server-only';
import { serverEnv } from '@/lib/env';

/**
 * Interface de processamento de vídeo. `local` aceita o mp4 tal como veio (sem transcodificação,
 * porque o Vercel não corre FFmpeg); `mux` e `cloudflare` enviam o ficheiro para transcodificação
 * (720p H.264/AAC + poster) e devolvem o resultado por webhook (/api/video/webhook).
 */
export interface VideoProcessor {
  name: 'local' | 'mux' | 'cloudflare';
  /** Pede o processamento. Devolve o estado inicial e, se existir, o ID externo. */
  submit(input: { mediaId: string; sourceUrl: string }): Promise<{ status: 'ready' | 'processing' | 'failed'; externalId?: string }>;
}

class LocalProcessor implements VideoProcessor {
  name = 'local' as const;
  async submit() {
    return { status: 'ready' as const };
  }
}

class MuxProcessor implements VideoProcessor {
  name = 'mux' as const;
  async submit({ mediaId, sourceUrl }: { mediaId: string; sourceUrl: string }) {
    const id = process.env.MUX_TOKEN_ID;
    const secret = process.env.MUX_TOKEN_SECRET;
    if (!id || !secret) return { status: 'failed' as const };
    const res = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
      body: JSON.stringify({ input: [{ url: sourceUrl }], playback_policy: ['public'], passthrough: mediaId, max_resolution_tier: '1080p', encoding_tier: 'baseline' }),
    });
    if (!res.ok) return { status: 'failed' as const };
    const json = (await res.json()) as { data?: { id?: string } };
    return { status: 'processing' as const, externalId: json.data?.id };
  }
}

class CloudflareProcessor implements VideoProcessor {
  name = 'cloudflare' as const;
  async submit({ mediaId, sourceUrl }: { mediaId: string; sourceUrl: string }) {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_STREAM_TOKEN;
    if (!account || !token) return { status: 'failed' as const };
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: sourceUrl, meta: { mediaId }, maxDurationSeconds: 30 }),
    });
    if (!res.ok) return { status: 'failed' as const };
    const json = (await res.json()) as { result?: { uid?: string } };
    return { status: 'processing' as const, externalId: json.result?.uid };
  }
}

export function getVideoProcessor(enabledFlag: boolean): VideoProcessor {
  if (!enabledFlag) return new LocalProcessor();
  switch (serverEnv.videoProcessor) {
    case 'mux':
      return new MuxProcessor();
    case 'cloudflare':
      return new CloudflareProcessor();
    default:
      return new LocalProcessor();
  }
}
