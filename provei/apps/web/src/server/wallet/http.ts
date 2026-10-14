import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimit } from '../ratelimit';
import type { WsResponse } from './webservice';

/** Limite por IP para o serviço web PassKit (pedidos de dispositivos). */
export async function wsRateLimited(req: Request, bucket: string, max = 120): Promise<boolean> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'unknown';
  return !(await rateLimit(`wallet:ws:${bucket}:${ip}`, 60, max));
}

export function toResponse(r: WsResponse): NextResponse {
  if (r.body) return new NextResponse(new Uint8Array(r.body), { status: r.status, headers: r.headers });
  if (r.json !== undefined) return NextResponse.json(r.json, { status: r.status, headers: r.headers });
  return new NextResponse(null, { status: r.status, headers: r.headers });
}
