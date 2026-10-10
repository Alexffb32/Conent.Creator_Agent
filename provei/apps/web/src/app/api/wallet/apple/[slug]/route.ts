import { NextResponse } from 'next/server';
import { walletAvailability } from '@/server/wallet';

export const runtime = 'nodejs';

/**
 * Passe Apple (.pkpass): requer certificado Pass Type ID da conta Apple Developer.
 * Sem credenciais devolve 404 ("indisponível") e a UI esconde o botão. A geração do ficheiro
 * assinado fica por ligar quando houver certificados (ver docs/STATUS.md).
 */
export async function GET() {
  if (!walletAvailability().apple) return NextResponse.json({ error: 'Apple Wallet indisponível' }, { status: 404 });
  return NextResponse.json({ error: 'Geração de passes Apple por ligar (precisa de certificado)' }, { status: 501 });
}
