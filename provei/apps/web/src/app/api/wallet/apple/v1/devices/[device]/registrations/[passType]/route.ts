import { NextResponse } from 'next/server';
import { supabaseWebServiceStore } from '@/server/wallet/stores';
import { wsListUpdated } from '@/server/wallet/webservice';
import { toResponse, wsRateLimited } from '@/server/wallet/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** PassKit: números de série atualizados desde a etiqueta `passesUpdatedSince`. */
export async function GET(req: Request, { params }: { params: Promise<{ device: string; passType: string }> }) {
  if (await wsRateLimited(req, 'list')) return new NextResponse(null, { status: 429 });
  const p = await params;
  return toResponse(await wsListUpdated(supabaseWebServiceStore(), { ...p, since: new URL(req.url).searchParams.get('passesUpdatedSince') }));
}
