'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button, Field, Input, Sheet } from '@/components/ui';
import { QrScanner } from './QrScanner';

/** Extrai o código da mesa de um URL `/t/<code>` (ou aceita o código solto). */
export function parseTableCode(text: string): string | null {
  const m = text.match(/\/t\/([a-z0-9]{6,16})/i);
  if (m?.[1]) return m[1].toLowerCase();
  return /^[a-z0-9]{6,16}$/i.test(text.trim()) ? text.trim().toLowerCase() : null;
}

export function ImHereButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);

  function go(text: string) {
    const code = parseTableCode(text);
    if (!code) return setError('Este QR não é de uma mesa Provei.');
    setOpen(false);
    router.push(`/t/${code}`);
  }
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <QrCode size={18} aria-hidden /> Estou aqui
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Lê o QR da mesa">
        {open ? <QrScanner onResult={go} /> : null}
        {error ? <p role="alert" className="mt-3 text-erro">{error}</p> : null}
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            go(manual);
          }}
        >
          <Field label="Ou escreve o código da mesa" htmlFor="codigo-mesa" hint="Vem impresso junto ao QR.">
            <Input id="codigo-mesa" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="none" />
          </Field>
          <Button type="submit" variant="secondary">Entrar na mesa</Button>
        </form>
      </Sheet>
    </>
  );
}
