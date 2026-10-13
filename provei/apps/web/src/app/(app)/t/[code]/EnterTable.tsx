'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, CardTitle } from '@/components/ui';
import { enterTable } from '@/server/actions/table';
import { useT } from '@/i18n/client';

export function EnterTable({ token, restaurant, label }: { token: string; restaurant: string; label: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const { t } = useT();

  async function go() {
    setBusy(true);
    setError(null);
    const r = await enterTable(token);
    // em caso de sucesso o servidor redireciona; só chegamos aqui com erro
    if (r && !r.ok) {
      setError(r.error);
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pv-container max-w-md pt-8">
      <Card className="flex flex-col gap-3 text-center">
        <CardTitle as="h1">{restaurant}</CardTitle>
        <p className="text-lg">{t('table.label', { label })}</p>
        {error ? (
          <>
            <p role="alert" className="text-erro">{error}</p>
            <Button onClick={() => router.refresh()}>{t('feed.retry')}</Button>
          </>
        ) : (
          <p role="status" aria-busy={busy} className="text-tinta-2">{t('table.entering')}</p>
        )}
      </Card>
    </div>
  );
}
