import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getSessionProfile } from '@/server/auth';
import { audit } from '@/server/audit';
import { rateLimit } from '@/server/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Exportação dos dados pessoais do utilizador (RGPD), em JSON. */
export async function GET() {
  const me = await getSessionProfile();
  if (!me) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!(await rateLimit(`export:${me.id}`, 3600, 5))) return NextResponse.json({ error: 'Demasiados pedidos' }, { status: 429 });
  const sb = createServiceSupabase();
  const byUser = async (table: string, col = 'user_id') => (await sb.from(table).select('*').eq(col, me.id)).data ?? [];
  const cards = await byUser('loyalty_cards');
  const cardIds = cards.map((c: { id: string }) => c.id);
  const events = cardIds.length ? (await sb.from('loyalty_events').select('*').in('card_id', cardIds)).data ?? [] : [];
  const profile = (await sb.from('profiles').select('*').eq('id', me.id).single()).data;
  const out = {
    exportedAt: new Date().toISOString(),
    account: { email: me.email },
    profile,
    consents: await byUser('consents'),
    follows: await byUser('follows'),
    saves: await byUser('saves'),
    visits: await byUser('visits'),
    loyaltyCards: cards,
    loyaltyEvents: events,
    redemptions: await byUser('redemptions'),
    reviews: await byUser('reviews'),
    privateFeedback: await byUser('private_feedback'),
    reports: await byUser('reports', 'reporter_id'),
    notifications: await byUser('notifications'),
    tableSessions: await byUser('table_sessions'),
    waiterCalls: await byUser('waiter_calls'),
  };
  await audit({ actorId: me.id, action: 'account.export', entity: 'profile', entityId: me.id });
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="provei-os-meus-dados.json"', 'Cache-Control': 'no-store' },
  });
}
