'use client';
import { useState, useTransition } from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui';
import { getGoogleWalletLink } from '@/server/actions/wallet';

/** Botão "Adicionar à Google Wallet": cria o cartão na Google e abre a ligação de gravação (JWT assinado). */
export function AddToGoogleWallet({ restaurantId, showFirstName = false }: { restaurantId: string; showFirstName?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await getGoogleWalletLink({ restaurantId, showFirstName });
            if (!r.ok) return setError(r.error);
            if (r.data.url) window.location.href = r.data.url;
            else setPreview(JSON.stringify(r.data.preview, null, 2));
          })
        }
      >
        <Wallet size={20} aria-hidden /> Adicionar à Google Wallet
      </Button>
      <p className="text-[15px] text-tinta-2">Os avisos de pontos chegam pela Google Wallet (no máximo 3 por dia, regra da Google). Desligas no cartão › Detalhes do cartão.</p>
      {preview && (
        <details className="rounded-card bg-nevoa p-3">
          <summary>Modo de teste: sem conta de emissor Google, este é o conteúdo do cartão (não instala)</summary>
          <pre className="mt-2 overflow-x-auto text-xs">{preview}</pre>
        </details>
      )}
      {error && <p role="alert" className="text-erro">{error}</p>}
    </div>
  );
}
