'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Button, Field, Input, Sheet } from '@/components/ui';
import dynamic from 'next/dynamic';

const QrScanner = dynamic(() => import('./QrScanner').then((m) => m.QrScanner), { ssr: false });
import { useT } from '@/i18n/client';

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
  const { t } = useT();

  function go(text: string) {
    const code = parseTableCode(text);
    if (!code) return setError(t('scan.notProvei'));
    setOpen(false);
    router.push(`/t/${code}`);
  }
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <QrCode size={18} aria-hidden /> {t('r.imHere')}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('scan.title')}>
        {open ? <QrScanner onResult={go} /> : null}
        {error ? <p role="alert" className="mt-3 text-erro">{error}</p> : null}
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            go(manual);
          }}
        >
          <Field label={t('scan.manual')} htmlFor="codigo-mesa" hint={t('scan.manualHint')}>
            <Input id="codigo-mesa" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="none" />
          </Field>
          <Button type="submit" variant="secondary">{t('scan.enter')}</Button>
        </form>
      </Sheet>
    </>
  );
}
