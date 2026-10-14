'use client';
import { useState, useTransition } from 'react';
import { Button, Field, Textarea, useToast } from '@/components/ui';
import { decideNotice } from '@/server/actions/admin';

export function NoticeDecision({ id }: { id: string }) {
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const { toast } = useToast();
  const decide = (decision: 'actioned' | 'rejected') =>
    start(async () => {
      const r = await decideNotice({ id, decision, reason });
      toast(r.ok ? 'Decisão registada e enviada ao autor da denúncia.' : r.error, r.ok ? 'info' : 'erro');
    });
  return (
    <div className="flex flex-col gap-2">
      <Field label="Motivo da decisão (enviado ao autor da denúncia)" htmlFor={`reason-${id}`}>
        <Textarea id={`reason-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" loading={pending} onClick={() => decide('actioned')}>Procedente (já agi sobre o conteúdo)</Button>
        <Button variant="secondary" loading={pending} onClick={() => decide('rejected')}>Improcedente (manter)</Button>
      </div>
    </div>
  );
}
