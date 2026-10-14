'use client';
import { useRouter } from 'next/navigation';
import { useState, type ComponentProps } from 'react';
import { Button, useToast } from '@/components/ui';
import type { ActionResult } from '@/server/action';

/** Botão que chama uma Server Action, mostra erros e atualiza a página. */
export function ActionButton({ action, children, confirmText, ...rest }: { action: () => Promise<ActionResult<unknown>>; confirmText?: string } & Omit<ComponentProps<typeof Button>, 'onClick'>) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      {...rest}
      loading={busy}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(true);
        const r = await action();
        setBusy(false);
        if (!r.ok) return toast(r.error, 'erro');
        router.refresh();
      }}
    >
      {children}
    </Button>
  );
}
