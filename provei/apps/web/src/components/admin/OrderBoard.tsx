'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@provei/domain';
import { Badge, Button, Card, Input, Select, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/media';
import { listStaffOrders, markOrderPaidCash, setOrderStatus, type StaffOrder } from '@/server/actions/orders';

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch {
    /* sem áudio */
  }
}

function Age({ since }: { since: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);
  const m = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000));
  return <span className={`font-mono tabular-nums ${m >= 20 ? 'font-semibold text-erro' : 'text-tinta-2'}`}>{m} min</span>;
}

const who = (o: StaffOrder) => (o.kind === 'table' ? `Mesa ${o.table_label ?? '?'}` : `Levantar · ${o.customer_name ?? 'Cliente'}`);

/**
 * Quadro de pedidos em tempo real (Supabase Realtime filtrado por restaurante, com consulta a cada 10 s
 * como reserva). mode="kitchen": colunas Novo / Em preparação / Pronto. mode="floor": entregar, receber em dinheiro, cancelar.
 */
export function OrderBoard({ restaurantId, mode, initial }: { restaurantId: string; mode: 'kitchen' | 'floor'; initial: StaffOrder[] }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState(initial);
  const [live, setLive] = useState(false);
  const [sound, setSound] = useState(false);
  const [station, setStation] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const known = useRef(new Set(initial.map((o) => o.id)));
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const scope = mode === 'kitchen' ? 'active' : 'today';

  useEffect(() => {
    try {
      setSound(localStorage.getItem(`pv_${mode}_sound`) === '1');
    } catch {
      /* sem storage */
    }
  }, [mode]);

  const refresh = useCallback(async () => {
    const r = await listStaffOrders(restaurantId, scope);
    if (!r.ok) return;
    if (r.data.some((o) => !known.current.has(o.id)) && soundRef.current) beep();
    known.current = new Set(r.data.map((o) => o.id));
    setOrders(r.data);
  }, [restaurantId, scope]);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`orders-${mode}-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => void refresh())
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    const poll = setInterval(() => void refresh().catch(() => undefined), 10000);
    return () => {
      clearInterval(poll);
      void sb.removeChannel(ch);
    };
  }, [restaurantId, mode, refresh]);

  function toggleSound() {
    const v = !sound;
    setSound(v);
    if (v) beep();
    try {
      localStorage.setItem(`pv_${mode}_sound`, v ? '1' : '0');
    } catch {
      /* sem storage */
    }
  }

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error ?? 'Não foi possível.', 'erro');
      await refresh();
    });
  }

  const stations = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.station).filter(Boolean) as string[]))].sort(), [orders]);
  const visible = (o: StaffOrder) => ({ ...o, items: station ? o.items.filter((i) => i.station === station) : o.items });

  const header = (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Badge tone={live ? 'verde' : 'amarelo'}>{live ? 'Em tempo real' : 'A atualizar a cada 10 s'}</Badge>
      <Button variant="secondary" size="sm" onClick={toggleSound} aria-pressed={sound}>
        {sound ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />} {sound ? 'Som ligado' : 'Som desligado'}
      </Button>
      {mode === 'kitchen' && stations.length > 0 && (
        <label className="flex items-center gap-2">
          <span>Posto</span>
          <Select value={station} onChange={(e) => setStation(e.target.value)} className="w-auto">
            <option value="">Todos</option>
            {stations.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );

  function Items({ o }: { o: StaffOrder }) {
    return (
      <ul className="flex flex-col gap-1">
        {o.items.map((i, n) => (
          <li key={n}>
            <span className="font-semibold tabular-nums">{i.qty}×</span> {i.name}
            {i.note && <span className="block text-[15px] text-erro">{i.note}</span>}
          </li>
        ))}
      </ul>
    );
  }

  if (mode === 'kitchen') {
    const cols: OrderStatus[] = ['new', 'preparing', 'ready'];
    return (
      <div>
        {header}
        <div className="grid gap-4 md:grid-cols-3">
          {cols.map((c) => {
            const list = orders.filter((o) => o.status === c).map(visible).filter((o) => o.items.length);
            return (
              <section key={c} aria-labelledby={`col-${c}`} className="flex flex-col gap-3">
                <h2 id={`col-${c}`} className="text-lg font-semibold">
                  {ORDER_STATUS_LABEL[c]} <span className="text-tinta-2">({list.length})</span>
                </h2>
                {list.length === 0 && <p className="text-tinta-2">Sem pedidos.</p>}
                {list.map((o) => (
                  <Card key={o.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{who(o)}</strong>
                      <Age since={o.created_at} />
                    </div>
                    <Items o={o} />
                    {o.note && <p className="text-[15px] text-erro">Nota: {o.note}</p>}
                    {c === 'new' && <Button disabled={pending} onClick={() => act(() => setOrderStatus({ orderId: o.id, status: 'preparing' }))}>Começar a preparar</Button>}
                    {c === 'preparing' && <Button disabled={pending} onClick={() => act(() => setOrderStatus({ orderId: o.id, status: 'ready' }))}>Marcar pronto</Button>}
                    {c === 'ready' && <Button variant="secondary" disabled={pending} onClick={() => act(() => setOrderStatus({ orderId: o.id, status: 'preparing' }))}>Voltar a preparar</Button>}
                  </Card>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  const sorted = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div>
      {header}
      {sorted.length === 0 && <p className="text-tinta-2">Ainda não há pedidos hoje.</p>}
      <div className="flex flex-col gap-3">
        {sorted.map((o) => (
          <Card key={o.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{who(o)}</strong>
              <div className="flex items-center gap-2">
                <Badge tone={o.status === 'ready' ? 'amarelo' : o.status === 'cancelled' ? 'erro' : 'neutro'}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</Badge>
                <Badge tone={o.payment_status === 'paid' ? 'verde' : 'neutro'}>{o.payment_status === 'paid' ? (o.payment_method === 'cash' ? 'Pago em dinheiro' : 'Pago online') : 'Por pagar'}</Badge>
                <Age since={o.created_at} />
              </div>
            </div>
            <Items o={o} />
            <p className="font-semibold tabular-nums">{formatPrice(o.total_cents)}</p>
            <div className="flex flex-wrap gap-2">
              {o.status === 'ready' && <Button size="sm" disabled={pending} onClick={() => act(() => setOrderStatus({ orderId: o.id, status: 'delivered' }))}>Marcar entregue</Button>}
              {o.payment_status !== 'paid' && o.status !== 'cancelled' && (
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => markOrderPaidCash(o.id))}>Receber em dinheiro</Button>
              )}
              {(o.status === 'new' || o.status === 'preparing') && cancelling !== o.id && (
                <Button size="sm" variant="ghost" onClick={() => { setCancelling(o.id); setReason(''); }}>Cancelar pedido</Button>
              )}
            </div>
            {cancelling === o.id && (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  act(() => setOrderStatus({ orderId: o.id, status: 'cancelled', reason: reason.trim() || undefined }));
                  setCancelling(null);
                }}
              >
                <label className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <span>Motivo (fica no registo)</span>
                  <Input value={reason} maxLength={200} required onChange={(e) => setReason(e.target.value)} />
                </label>
                <Button size="sm" variant="danger" type="submit">Confirmar cancelamento</Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setCancelling(null)}>Manter pedido</Button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
