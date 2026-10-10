'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Field, Input, useToast } from '@/components/ui';
import { createTable } from '@/server/actions/table';

export function CreateTableForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget;
        const fd = new FormData(f);
        setBusy(true);
        const r = await createTable({ restaurantId, label: fd.get('label') });
        setBusy(false);
        if (!r.ok) return toast(r.error, 'erro');
        f.reset();
        router.refresh();
      }}
    >
      <div className="flex-1"><Field label="Nova mesa" htmlFor="tb-label"><Input id="tb-label" name="label" required maxLength={30} placeholder="Ex.: 1, Esplanada 3" /></Field></div>
      <Button type="submit" loading={busy}>Criar</Button>
    </form>
  );
}
