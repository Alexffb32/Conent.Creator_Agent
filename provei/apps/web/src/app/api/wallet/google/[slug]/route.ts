import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { getSessionProfile } from '@/server/auth';
import { googleSaveUrl, newWalletSerial, walletAvailability } from '@/server/wallet';
import { loadProgram } from '@/server/loyalty';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await getSessionProfile();
  if (!me) return NextResponse.redirect(new URL(`/entrar?next=/cartao/${slug}`, _req.url));
  const svc = createServiceSupabase();
  const { data: r } = await svc.from('restaurants').select('id, name, slug, plan').eq('slug', slug).maybeSingle();
  if (!r) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
  const flags = await getFlags(r.id);
  if (!flags.wallet || r.plan !== 'paid' || !walletAvailability().google) return NextResponse.json({ error: 'Wallet indisponível' }, { status: 404 });
  const { data: card } = await svc.from('loyalty_cards').select('id, stamps, points, wallet_google_id').eq('user_id', me.id).eq('restaurant_id', r.id).maybeSingle();
  if (!card) return NextResponse.json({ error: 'Ainda não tens cartão neste restaurante' }, { status: 404 });
  const serial = card.wallet_google_id ?? newWalletSerial();
  if (!card.wallet_google_id) await svc.from('loyalty_cards').update({ wallet_google_id: serial }).eq('id', card.id);
  const program = await loadProgram(svc, r.id);
  const url = googleSaveUrl({ restaurantName: r.name, restaurantSlug: r.slug, serial, points: card.points, stamps: card.stamps, stampsRequired: program.stampsRequired, holder: me.displayName });
  if (!url) return NextResponse.json({ error: 'Wallet indisponível' }, { status: 404 });
  return NextResponse.redirect(url);
}
