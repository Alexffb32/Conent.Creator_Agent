'use client';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button, Field, Sheet, Textarea, useToast } from '@/components/ui';
import { reportContent } from '@/server/actions/reviews';

export function ReportButton({ targetType, targetId }: { targetType: 'review' | 'post' | 'restaurant' | 'user'; targetId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-touch items-center gap-1 px-2 text-sm underline">
        <Flag size={14} aria-hidden /> Denunciar
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Denunciar">
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await reportContent({ targetType, targetId, reason });
            setBusy(false);
            if (!r.ok) return toast(r.error, 'erro');
            toast('Denúncia enviada. Obrigado por ajudares.');
            setOpen(false);
            setReason('');
          }}
        >
          <Field label="O que se passa?" htmlFor={`reason-${targetId}`}>
            <Textarea id={`reason-${targetId}`} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} maxLength={500} />
          </Field>
          <Button type="submit" loading={busy}>Enviar denúncia</Button>
        </form>
      </Sheet>
    </>
  );
}
