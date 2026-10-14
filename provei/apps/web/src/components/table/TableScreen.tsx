'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { BellRing, Receipt, Gift, LogOut, BadgeCheck } from 'lucide-react';
import { stampProgress } from '@provei/domain';
import { Badge, Button, Card, CardTitle, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { callWaiter, claimMyVisit, leaveTable } from '@/server/actions/table';
import { useT } from '@/i18n/client';

interface Call { id: string; status: string; reason: string; created_at: string }

export function TableScreen(props: {
  userId: string;
  restaurant: { name: string; slug: string };
  tableLabel: string;
  sessionExpiresAt: string;
  readyAt: string;
  flags: { callWaiter: boolean; loyalty: boolean; ordering: boolean };
  orderHref: string;
  initialCall: Call | null;
  card: { stamps: number; points: number; level: string; required: number };
  offers: { id: string; title: string; description: string | null; ends_at: string }[];
  supabase: { url: string; key: string };
}) {
  const { toast } = useToast();
  const { t } = useT();
  const [call, setCall] = useState<Call | null>(props.initialCall);
  const [card, setCard] = useState(props.card);
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [visitDone, setVisitDone] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // estado da chamada em tempo real (RLS aplica-se) + sondagem de reserva
  const refresh = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from('waiter_calls').select('id, status, reason, created_at').eq('user_id', props.userId).in('status', ['open', 'acknowledged']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setCall(data ?? null);
  }, [props.userId]);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`my-calls-${props.userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `user_id=eq.${props.userId}` }, () => void refresh())
      .subscribe();
    const poll = setInterval(refresh, 10000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(ch);
    };
  }, [props.userId, refresh]);

  const expired = new Date(props.sessionExpiresAt).getTime() <= now;
  const minutesToReady = Math.max(0, Math.ceil((new Date(props.readyAt).getTime() - now) / 60000));
  const prog = stampProgress(card.stamps, card.required);

  function request(reason: 'call' | 'bill') {
    start(async () => {
      const r = await callWaiter({ reason });
      if (!r.ok) return toast(r.error, 'erro');
      toast(reason === 'bill' ? t('table.billAsked') : t('table.helpAsked'), 'info');
      void refresh();
    });
  }
  function claim() {
    start(async () => {
      const r = await claimMyVisit();
      if (!r.ok) return toast(r.error, 'erro');
      setVisitDone(true);
      setCard((c) => ({ ...c, stamps: r.data.stamps, points: c.points + r.data.points }));
      toast(t('table.visitDone', { n: r.data.points }));
      if (r.data.rewardCode) toast(t('table.reward', { code: r.data.rewardCode }), 'info');
    });
  }

  if (expired) {
    return (
      <div className="pv-container max-w-md pt-6">
        <Card className="flex flex-col gap-3 text-center">
          <CardTitle as="h1">{t('table.expired')}</CardTitle>
          <Link href="/mesa" className="pv-link inline-flex min-h-touch items-center justify-center font-semibold">{t('table.readQr')}</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="pv-container flex max-w-md flex-col gap-4 pt-5">
      <header>
        <p className="text-sm text-tinta-2">{t('table.at', { label: props.tableLabel })}</p>
        <h1 className="pv-title text-4xl text-verde-escuro">{props.restaurant.name}</h1>
      </header>

      {props.flags.callWaiter ? (
        <Card className="flex flex-col gap-3 border-verde bg-verde-tinta">
          {call ? (
            <div role="status" aria-live="polite" className="flex flex-col gap-1 text-center">
              <p className="pv-title text-3xl text-verde-escuro">{call.status === 'acknowledged' ? t('table.onTheWay') : t('table.ack')}</p>
              <p className="text-sm text-tinta-2">{call.reason === 'bill' ? t('table.billAsked') : t('table.helpAsked')}</p>
            </div>
          ) : (
            <Button size="lg" loading={pending} onClick={() => request('call')} className="w-full"><BellRing aria-hidden /> {t('table.call')}</Button>
          )}
          <Button variant="secondary" disabled={Boolean(call) || pending} onClick={() => request('bill')} className="w-full"><Receipt size={18} aria-hidden /> {t('table.bill')}</Button>
        </Card>
      ) : null}

      {props.flags.loyalty ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><CardTitle className="text-2xl">{t('table.myCard')}</CardTitle><Badge tone="amarelo">{t('common.points', { n: card.points })}</Badge></div>
          <div className="flex flex-wrap gap-1.5" role="img" aria-label={t('cards.stamps', { n: prog.current, total: prog.required })}>
            {Array.from({ length: prog.required }).map((_, i) => (
              <span key={i} className={`h-7 w-7 rounded-pill border ${i < prog.current ? 'border-verde bg-verde' : 'border-linha bg-nevoa'}`} />
            ))}
          </div>
          <p className="text-sm text-tinta-2">{t('table.missing', { n: prog.missing })}</p>
          {visitDone ? (
            <p role="status" className="flex items-center gap-2 font-semibold text-verde-escuro"><BadgeCheck aria-hidden /> {t('table.confirmed')}</p>
          ) : (
            <Button variant="accent" disabled={minutesToReady > 0 || pending} onClick={claim}>
              {minutesToReady > 0 ? t('table.confirmIn', { n: minutesToReady }) : t('table.confirm')}
            </Button>
          )}
          <Link href="/cartao" className="pv-link inline-flex min-h-touch items-center text-sm font-semibold">{t('table.allCards')}</Link>
        </Card>
      ) : null}

      {props.offers.length > 0 ? (
        <section aria-labelledby="ofertas-mesa" className="flex flex-col gap-2">
          <h2 id="ofertas-mesa" className="pv-title text-2xl text-verde-escuro">{t('r.offers')}</h2>
          {props.offers.map((o) => (
            <Card key={o.id} className="flex gap-3 border-amarelo bg-amarelo-tinta"><Gift aria-hidden className="mt-1 shrink-0" /><div><p className="font-semibold">{o.title}</p>{o.description ? <p className="text-sm">{o.description}</p> : null}</div></Card>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {props.flags.ordering ? (
          <Link href={props.orderHref} className="pv-btn pv-btn-primary inline-flex min-h-[48px] items-center rounded-pill border border-verde-escuro px-6 font-semibold text-branco">Pedir à mesa</Link>
        ) : null}
        <Link href={`/r/${props.restaurant.slug}#menu`} className="inline-flex min-h-[48px] items-center rounded-pill border border-linha-forte bg-branco px-5 font-semibold text-verde-escuro hover:border-verde hover:bg-verde-tinta">{t('table.menu')}</Link>
        <Button variant="ghost" onClick={() => start(async () => { await leaveTable(); })}><LogOut size={18} aria-hidden /> {t('table.leave')}</Button>
      </div>
    </div>
  );
}
