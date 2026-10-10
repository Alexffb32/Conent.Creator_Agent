import type { Metadata } from 'next';
import { QrCode } from 'lucide-react';
import { DEFAULT_PLAN_LIMITS } from '@provei/domain';
import { EmptyState } from '@/components/ui';
import { ImHereButton } from '@/components/scan/ImHereButton';
import { TableScreen } from '@/components/table/TableScreen';
import { requireUser } from '@/server/auth';
import { getActiveSession } from '@/server/tables';
import { createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';

export const metadata: Metadata = { title: 'A minha mesa' };
export const dynamic = 'force-dynamic';

export default async function MesaPage() {
  const me = await requireUser('/mesa');
  const session = await getActiveSession(me.id);
  if (!session) {
    return (
      <div className="pv-container flex max-w-md flex-col gap-4 pt-6">
        <EmptyState
          icon={<QrCode size={44} />}
          title="Ainda não estás numa mesa"
          description="Lê o QR da mesa ou aproxima o telemóvel do autocolante NFC. Se a sessão expirou, lê outra vez."
          action={<ImHereButton />}
        />
      </div>
    );
  }
  const svc = createServiceSupabase();
  const flags = await getFlags(session.restaurant_id);
  const rest = session.restaurants as unknown as { name: string; slug: string; settings: Record<string, unknown> };
  const tbl = session.tables as unknown as { label: string };
  const [call, card, offers, program, restRow] = await Promise.all([
    svc.from('waiter_calls').select('id, status, reason, created_at').eq('user_id', me.id).eq('table_id', session.table_id).in('status', ['open', 'acknowledged']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('loyalty_cards').select('stamps, points, level').eq('user_id', me.id).eq('restaurant_id', session.restaurant_id).maybeSingle(),
    svc.from('offers').select('id, title, description, ends_at').eq('restaurant_id', session.restaurant_id).eq('active', true).gte('ends_at', new Date().toISOString()).lte('starts_at', new Date().toISOString()),
    svc.from('loyalty_programs').select('stamps_required, min_interval_hours').eq('restaurant_id', session.restaurant_id).maybeSingle(),
    svc.from('restaurants').select('plan').eq('id', session.restaurant_id).single(),
  ]);
  const offersOn = DEFAULT_PLAN_LIMITS[(restRow.data?.plan as 'free' | 'paid' | undefined) ?? 'free'].offers;
  const readyAt = new Date(new Date(session.started_at).getTime() + 10 * 60_000).toISOString();
  return (
    <TableScreen
      userId={me.id}
      restaurant={{ name: rest.name, slug: rest.slug }}
      tableLabel={tbl.label}
      sessionExpiresAt={session.expires_at}
      readyAt={readyAt}
      flags={{ callWaiter: flags.call_waiter, loyalty: flags.loyalty, ordering: flags.table_ordering }}
      initialCall={call.data ?? null}
      card={card.data ? { stamps: card.data.stamps, points: card.data.points, level: card.data.level, required: program.data?.stamps_required ?? 8 } : { stamps: 0, points: 0, level: 'convidado', required: program.data?.stamps_required ?? 8 }}
      offers={offersOn ? offers.data ?? [] : []}
      supabase={{ url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' }}
    />
  );
}

