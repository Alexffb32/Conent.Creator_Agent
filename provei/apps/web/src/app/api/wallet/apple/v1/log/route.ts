import { NextResponse } from 'next/server';
import { wsLog } from '@/server/wallet/webservice';
import { readCapped, wsRateLimited } from '@/server/wallet/http';

export const runtime = 'nodejs';

/** PassKit: registos de erro enviados pelo dispositivo (limitados e sem dados pessoais). */
export async function POST(req: Request) {
  if (await wsRateLimited(req, 'log', 30)) return new NextResponse(null, { status: 429 });
  const raw = await readCapped(req, 8192);
  if (raw === null) return new NextResponse(null, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const r = wsLog(body);
  for (const l of r.lines) console.warn('[passkit-device]', l);
  return new NextResponse(null, { status: r.status });
}
