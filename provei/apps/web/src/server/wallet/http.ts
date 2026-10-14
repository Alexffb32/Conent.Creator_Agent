import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimit } from '../ratelimit';
import type { WsResponse } from './webservice';

/** Limite por IP para o serviço web PassKit (pedidos de dispositivos). */
/** IP do cliente pelos cabeçalhos que a plataforma (Vercel) define, não pelo primeiro valor de X-Forwarded-For. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get('x-vercel-forwarded-for') ?? h.get('x-real-ip') ?? (h.get('x-forwarded-for') ?? '').split(',').at(-1) ?? '').trim() || 'unknown';
}

/** Lê o corpo com limite de bytes (recusa pelo Content-Length antes de ler). */
export async function readCapped(req: Request, maxBytes: number): Promise<string | null> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > maxBytes) return null;
  const text = await req.text();
  return Buffer.byteLength(text) > maxBytes ? null : text;
}

export async function wsRateLimited(req: Request, bucket: string, max = 120): Promise<boolean> {
  const ip = clientIp(req);
  return !(await rateLimit(`wallet:ws:${bucket}:${ip}`, 60, max));
}

export function toResponse(r: WsResponse): NextResponse {
  if (r.body) return new NextResponse(new Uint8Array(r.body), { status: r.status, headers: r.headers });
  if (r.json !== undefined) return NextResponse.json(r.json, { status: r.status, headers: r.headers });
  return new NextResponse(null, { status: r.status, headers: r.headers });
}
