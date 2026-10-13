'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui';
import { withdrawAdFree } from '@/server/actions/billing';

export function WithdrawForm({ active }: { active: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!active) return <p className="rounded-m bg-nevoa p-4">Não tens nenhuma assinatura ativa.</p>;
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="danger"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await withdrawAdFree();
            if (!r.ok) return setMsg({ ok: false, text: r.error });
            setMsg({
              ok: true,
              text: r.data.withinWithdrawal
                ? 'Feito. A assinatura terminou e enviámos a confirmação por e-mail.'
                : 'Feito. A assinatura não será renovada; enviámos a confirmação por e-mail.',
            });
          })
        }
        className="sm:self-start"
      >
        Confirmar fim da assinatura
      </Button>
      {msg ? <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'font-semibold text-verde-escuro' : 'font-medium text-erro'}>{msg.text}</p> : null}
    </div>
  );
}
