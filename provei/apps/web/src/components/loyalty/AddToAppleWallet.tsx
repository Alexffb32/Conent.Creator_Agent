'use client';
import { useState, useTransition } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Checkbox } from '@/components/ui';
import { getAppleWalletLink } from '@/server/actions/wallet';

/** Botão "Adicionar à Apple Wallet": pede um URL assinado de 5 minutos e descarrega o cartão. */
export function AddToAppleWallet({ restaurantId, simulated }: { restaurantId: string; simulated: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showName, setShowName] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Checkbox label="Mostrar o meu nome próprio no cartão" description="Opcional. O cartão nunca leva o teu e-mail nem o teu telefone." checked={showName} onChange={(e) => setShowName(e.target.checked)} />
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await getAppleWalletLink({ restaurantId, showFirstName: showName });
            if (!r.ok) return setError(r.error);
            window.location.href = r.data.url;
          })
        }
      >
        <Wallet size={20} aria-hidden /> Adicionar à Apple Wallet
      </Button>
      {simulated && <p className="text-[15px] text-tinta-2">Modo de teste: sem certificado Apple, descarrega o conteúdo do cartão (não instala).</p>}
      <p className="text-[15px] text-tinta-2">Os avisos de pontos chegam pela Wallet. Desligas no iPhone em: cartão › ⋯ › Detalhes do cartão › Notificações.</p>
      {error && <p role="alert" className="text-erro">{error}</p>}
    </div>
  );
}
