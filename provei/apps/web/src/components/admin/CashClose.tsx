'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reconcileShift, type ShiftOrder } from '@provei/domain';
import { Button, Card, CardTitle, Field, Input, Textarea, useToast } from '@/components/ui';
import { formatDateTime, formatPrice } from '@/lib/media';
import { closeShift } from '@/server/actions/orders';

/** Pré-visualização do fecho (mesma função do domínio que a base de dados reproduz) e registo. */
export function CashClose({ restaurantId, from, to, orders }: { restaurantId: string; from: string; to: string; orders: ShiftOrder[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, start] = useTransition();
  const cents = Math.round(Number((counted || '0').replace(',', '.')) * 100);
  const valid = Number.isFinite(cents) && cents >= 0;
  const rep = useMemo(() => reconcileShift(orders, valid ? cents : 0), [orders, cents, valid]);

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Turno de {formatDateTime(from)} a {formatDateTime(to)}</CardTitle>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 tabular-nums">
        <dt>Pedidos</dt><dd className="text-right">{rep.ordersCount}</dd>
        <dt>Pago online (Stripe)</dt><dd className="text-right">{formatPrice(rep.stripeCents)}</dd>
        <dt>Dinheiro registado</dt><dd className="text-right">{formatPrice(rep.cashExpectedCents)}</dd>
        <dt>Por pagar</dt><dd className="text-right">{rep.unpaidCount} · {formatPrice(rep.unpaidCents)}</dd>
        <dt>Cancelados</dt><dd className="text-right">{rep.cancelledCount} · {formatPrice(rep.cancelledCents)}</dd>
      </dl>
      <Field label="Dinheiro contado na gaveta (€)" htmlFor="pv-counted" error={valid ? null : 'Valor inválido'}>
        <Input id="pv-counted" inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0,00" />
      </Field>
      {counted && valid && (
        <p role="status" className={rep.cashDiffCents < 0 ? 'font-semibold text-erro' : 'font-semibold'}>
          Diferença: {formatPrice(rep.cashDiffCents)} {rep.cashDiffCents < 0 ? '(falta dinheiro)' : rep.cashDiffCents > 0 ? '(sobra dinheiro)' : '(certo)'}
        </p>
      )}
      {rep.flags.includes('unpaid_orders') && <p className="text-erro">Há pedidos por pagar neste turno. Confirma-os antes de fechar.</p>}
      <Field label="Notas (opcional)" htmlFor="pv-notes">
        <Textarea id="pv-notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button
        disabled={!counted || !valid}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await closeShift({ restaurantId, from, to, countedCents: cents, notes: notes.trim() || undefined });
            if (!r.ok) toast(r.error, 'erro');
            else {
              toast('Turno fechado.', 'info');
              setCounted('');
              setNotes('');
              router.refresh();
            }
          })
        }
      >
        Fechar turno
      </Button>
    </Card>
  );
}
