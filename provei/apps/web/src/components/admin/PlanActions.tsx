'use client';
import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { openBillingPortal, startRestaurantCheckout } from '@/server/actions/billing';

export function PlanActions({ restaurantId, free, paymentsOn, hasCustomer }: { restaurantId: string; free: boolean; paymentsOn: boolean; hasCustomer: boolean }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function go(fn: (id: string) => Promise<{ ok: boolean; error?: string } | void>) {
    setBusy(true);
    const r = await fn(restaurantId);
    setBusy(false);
    if (r && !r.ok) toast(r.error ?? 'Algo correu mal.', 'erro');
  }
  if (free) {
    return paymentsOn ? (
      <Button size="lg" loading={busy} onClick={() => go(startRestaurantCheckout)}>Passar ao plano pago</Button>
    ) : (
      <a href="mailto:ola@provei.pt?subject=Plano%20pago%20Provei" className="inline-flex min-h-[56px] items-center justify-center rounded-pill bg-verde px-7 text-lg font-semibold text-branco">Contacta-nos para ativar</a>
    );
  }
  return hasCustomer ? <Button variant="secondary" loading={busy} onClick={() => go(openBillingPortal)}>Gerir subscrição e faturas</Button> : <p className="text-sm text-tinta-2">Plano ativado manualmente pela equipa Provei.</p>;
}
