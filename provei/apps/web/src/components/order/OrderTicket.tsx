'use client';
import { useEffect, useState, useTransition } from 'react';
import { CreditCard } from 'lucide-react';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@provei/domain';
import { Badge, Button, Card, CardTitle } from '@/components/ui';
import { formatDateTime, formatPrice } from '@/lib/media';
import { loadOrder, payOrderOnline, type GuestOrder } from '@/server/actions/orders';

const STEPS: OrderStatus[] = ['new', 'preparing', 'ready', 'delivered'];
const PAYMENT_LABEL: Record<string, string> = {
  unpaid: 'Por pagar',
  pending: 'Pagamento a confirmar',
  paid: 'Pago',
  refunded: 'Reembolsado',
  failed: 'Pagamento falhou',
};

/** Estado do pedido e ticket digital. Não é fatura: a fatura é emitida pelo restaurante no seu programa certificado. */
export function OrderTicket({
  initial,
  guestKey,
  restaurantName,
  canPayOnline,
  justPaid,
}: {
  initial: GuestOrder;
  guestKey: string | null;
  restaurantName: string;
  canPayOnline: boolean;
  justPaid: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = order.status === 'delivered' || order.status === 'cancelled';
  const waitingPayment = justPaid && order.payment_status !== 'paid';

  useEffect(() => {
    if (done && !waitingPayment) return;
    const t = setInterval(async () => {
      try {
        const fresh = await loadOrder(order.id, guestKey);
        if (fresh) setOrder(fresh);
      } catch {
        /* sem rede: tenta no próximo ciclo */
      }
    }, waitingPayment ? 3000 : 10000);
    return () => clearInterval(t);
  }, [done, waitingPayment, order.id, guestKey]);

  const step = STEPS.indexOf(order.status as OrderStatus);
  const payable = canPayOnline && order.payment_status !== 'paid' && order.status !== 'cancelled';

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <CardTitle as="h1">{order.status === 'cancelled' ? 'Pedido cancelado' : order.status === 'ready' ? 'O teu pedido está pronto' : 'Pedido recebido'}</CardTitle>
        <p className="text-tinta-2" aria-live="polite">
          Estado: <strong className="text-tinta">{ORDER_STATUS_LABEL[order.status as OrderStatus] ?? order.status}</strong>
          {order.kind === 'pickup' && order.status === 'ready' ? ' · podes levantar ao balcão' : ''}
        </p>
        {order.status !== 'cancelled' && (
          <ol className="flex gap-2" aria-label="Progresso do pedido">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 flex-col gap-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`h-1.5 rounded-pill ${i <= step ? 'bg-verde' : 'bg-linha'}`} />
                <span className={`text-xs ${i === step ? 'font-semibold text-verde-escuro' : 'text-tinta-2'}`}>{ORDER_STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="flex flex-col gap-3" aria-labelledby="pv-ticket">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="pv-ticket" className="text-lg font-semibold">{restaurantName}</h2>
            <p className="text-[15px] text-tinta-2">{formatDateTime(order.created_at)} · n.º {order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <Badge tone={order.payment_status === 'paid' ? 'verde' : 'neutro'}>{PAYMENT_LABEL[order.payment_status] ?? order.payment_status}</Badge>
        </div>
        <ul className="flex flex-col gap-2">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3">
              <span>
                {i.qty} × {i.name}
                {i.note ? <span className="block text-[15px] text-tinta-2">{i.note}</span> : null}
              </span>
              <span className="tabular-nums">{formatPrice(i.qty * i.price_cents)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="text-[15px] text-tinta-2">Nota: {order.note}</p>}
        <p className="flex justify-between border-t border-linha pt-2 text-lg font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.total_cents)}</span>
        </p>
        <p className="rounded-card bg-nevoa p-3 text-[15px] text-tinta-2">
          Documento de consumo — não é fatura. Pede a fatura (com NIF, se quiseres) à equipa do restaurante.
        </p>
      </Card>

      {waitingPayment && <p role="status" className="text-tinta-2">A confirmar o pagamento com o banco…</p>}
      {payable && !waitingPayment && (
        <form
          action={() =>
            start(async () => {
              setError(null);
              const r = await payOrderOnline(order.id, guestKey);
              if (r && !r.ok) setError(r.error);
            })
          }
        >
          <Button type="submit" size="lg" className="w-full" loading={pending}>
            <CreditCard size={20} aria-hidden /> Pagar {formatPrice(order.total_cents)} online
          </Button>
          <p className="mt-2 text-center text-[15px] text-tinta-2">Pagamento seguro pela Stripe. Também podes pagar à equipa.</p>
        </form>
      )}
      {error && <p role="alert" className="text-erro">{error}</p>}
      {guestKey && <p className="text-[15px] text-tinta-2">Guarda esta página: o endereço é a tua chave para acompanhar o pedido sem conta.</p>}
    </div>
  );
}
