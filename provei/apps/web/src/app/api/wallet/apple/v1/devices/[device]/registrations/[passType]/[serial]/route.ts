import { NextResponse } from 'next/server';
import { supabaseWebServiceStore } from '@/server/wallet/stores';
import { wsRegister, wsUnregister } from '@/server/wallet/webservice';
import { readCapped, toResponse, wsRateLimited } from '@/server/wallet/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ device: string; passType: string; serial: string }> };

/** PassKit: registar o cartão no dispositivo para receber atualizações. */
export async function POST(req: Request, { params }: Params) {
  if (await wsRateLimited(req, 'reg')) return new NextResponse(null, { status: 429 });
  const p = await params;
  const raw = await readCapped(req, 2048);
  if (raw === null) return new NextResponse(null, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  return toResponse(await wsRegister(supabaseWebServiceStore(), { ...p, auth: req.headers.get('authorization'), body }));
}

/** PassKit: desregistar. */
export async function DELETE(req: Request, { params }: Params) {
  if (await wsRateLimited(req, 'reg')) return new NextResponse(null, { status: 429 });
  const p = await params;
  return toResponse(await wsUnregister(supabaseWebServiceStore(), { ...p, auth: req.headers.get('authorization') }));
}
