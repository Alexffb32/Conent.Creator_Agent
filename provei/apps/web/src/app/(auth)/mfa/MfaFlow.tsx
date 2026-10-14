'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

type Stage = { kind: 'loading' } | { kind: 'enroll'; factorId: string; qr: string; secret: string } | { kind: 'verify'; factorId: string } | { kind: 'error'; message: string };

export function MfaFlow({ next }: { next: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) return setStage({ kind: 'error', message: 'Não foi possível ler os fatores de autenticação.' });
      const verified = data.totp.find((f) => f.status === 'verified');
      if (verified) return setStage({ kind: 'verify', factorId: verified.id });
      const en = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Provei admin' });
      if (en.error || !en.data) return setStage({ kind: 'error', message: 'Não foi possível iniciar o registo do segundo fator.' });
      setStage({ kind: 'enroll', factorId: en.data.id, qr: en.data.totp.qr_code, secret: en.data.totp.secret });
    })();
  }, []);

  async function confirm(factorId: string) {
    setBusy(true);
    setError(null);
    const sb = createClient();
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) return setError('Código inválido ou expirado. Tenta o código seguinte.');
    router.replace(next);
    router.refresh();
  }

  if (stage.kind === 'loading') return <p role="status" className="text-tinta-2">A preparar…</p>;
  if (stage.kind === 'error') return <p role="alert" className="text-erro">{stage.message}</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void confirm(stage.factorId);
      }}
    >
      {stage.kind === 'enroll' ? (
        <div className="flex flex-col items-start gap-2">
          <p>1. Lê este código QR com a app de autenticação.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stage.qr} alt="Código QR para configurar o segundo fator" width={180} height={180} className="rounded-m border border-linha bg-branco p-2" />
          <p className="text-sm text-tinta-2">Ou introduz a chave manualmente: <span className="break-all font-mono">{stage.secret}</span></p>
          <p>2. Escreve o código de 6 dígitos que a app mostra.</p>
        </div>
      ) : (
        <p>Escreve o código de 6 dígitos da tua app de autenticação.</p>
      )}
      <Field label="Código" htmlFor="mfa-code" error={error}>
        <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} aria-invalid={Boolean(error)} />
      </Field>
      <Button type="submit" loading={busy} className="sm:self-start">Confirmar</Button>
    </form>
  );
}
