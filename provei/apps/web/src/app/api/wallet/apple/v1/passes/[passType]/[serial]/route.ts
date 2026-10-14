import { NextResponse } from 'next/server';
import { supabaseWebServiceStore } from '@/server/wallet/stores';
import { wsGetPass } from '@/server/wallet/webservice';
import { toResponse, wsRateLimited } from '@/server/wallet/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PassKit: devolve a versão mais recente do cartão (.pkpass), com Last-Modified / 304. */
export async function GET(req: Request, { params }: { params: Promise<{ passType: string; serial: string }> }) {
  if (await wsRateLimited(req, 'pass')) return new NextResponse(null, { status: 429 });
  const p = await params;
  return toResponse(await wsGetPass(supabaseWebServiceStore(), { ...p, auth: req.headers.get('authorization'), ifModifiedSince: req.headers.get('if-modified-since') }));
}
