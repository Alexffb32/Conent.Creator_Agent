'use client';
import { useState, useTransition } from 'react';
import { Card, CardTitle, Checkbox, useToast } from '@/components/ui';
import { setWalletPointsAlerts } from '@/server/actions/wallet';

export function WalletAlertsToggle({ initial }: { initial: boolean }) {
  const { toast } = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>Cartões na Wallet</CardTitle>
      <Checkbox
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.checked;
          setOn(v);
          start(async () => {
            const r = await setWalletPointsAlerts(v);
            if (!r.ok) {
              setOn(!v);
              toast(r.error, 'erro');
            }
          });
        }}
        label="Avisos de pontos"
        description="Quando ganhas pontos, o cartão na Wallet atualiza e avisa-te. Desligado, atualiza em silêncio. No iPhone também podes desligar em: cartão › ⋯ › Detalhes do cartão › Notificações."
      />
    </Card>
  );
}
