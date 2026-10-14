import { NextResponse } from 'next/server';
import { getFlags } from '@/lib/flags';
import { rateLimit } from '@/server/ratelimit';
import { getAppleProvider } from '@/server/wallet/provider';
import { buildApplePassJson } from '@/server/wallet/passes';
import { verifyDownload } from '@/server/wallet/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Descarga do .pkpass por URL assinado e temporário (gerado por getAppleWalletLink). */
export async function GET(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'unknown';
  if (!(await rateLimit(`wallet:dl:${ip}`, 60, 20))) return NextResponse.json({ error: 'Demasiados pedidos' }, { status: 429 });
  const passId = verifyDownload(new URL(req.url).searchParams.get('t') ?? '');
  if (!passId) return NextResponse.json({ error: 'Ligação inválida ou expirada. Volta a tocar em "Adicionar à Apple Wallet".' }, { status: 410 });
  const built = await buildApplePassJson(passId);
  if (!built || built.row.voided) return NextResponse.json({ error: 'Cartão indisponível' }, { status: 404 });
  const flags = await getFlags(built.row.restaurant_id);
  const provider = getAppleProvider();
  if (!flags.wallet_apple || !provider.isConfigured()) return NextResponse.json({ error: 'Apple Wallet indisponível' }, { status: 404 });
  const out = await provider.render(built.pass);
  return new NextResponse(new Uint8Array(out.body), {
    headers: {
      'Content-Type': out.contentType,
      'Content-Disposition': `attachment; filename="${out.filename}"`,
      'Cache-Control': 'no-store',
      'Last-Modified': new Date(built.row.updated_at).toUTCString(),
    },
  });
}
