'use client';
import { useState } from 'react';
import { Button, Card, useToast } from '@/components/ui';
import { startAdFreeCheckout } from '@/server/actions/billing';

export function AdFreeButton({ price }: { price: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-amarelo bg-amarelo-tinta">
      <p>Sem anúncios no feed por {price}/mês.</p>
      <Button
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const r = await startAdFreeCheckout();
          setBusy(false);
          if (r && !r.ok) toast(r.error, 'erro');
        }}
      >
        Assinar sem anúncios
      </Button>
    </Card>
  );
}
