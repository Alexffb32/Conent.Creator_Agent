'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui';
import { connectStripeAccount } from '@/server/actions/orders';

export function ConnectStripe({ restaurantId, label }: { restaurantId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await connectStripeAccount(restaurantId);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        {label}
      </Button>
      {error && <p role="alert" className="text-erro">{error}</p>}
    </div>
  );
}
