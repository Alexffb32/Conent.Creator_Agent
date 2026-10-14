'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, QrImage } from '@/components/ui';
import { getPersonalToken } from '@/server/actions/table';

/** QR pessoal (5 min, uso único): a equipa lê-o para validar a visita. Renova-se sozinho. */
export function PersonalQr() {
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await getPersonalToken();
    if (!r.ok) return setError(r.error);
    setError(null);
    setQr(r.data.qr);
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 4 * 60_000);
    return () => clearInterval(t);
  }, [load]);
  if (error) return <div role="alert"><p className="text-erro">{error}</p><Button variant="secondary" onClick={load}>Tentar de novo</Button></div>;
  return (
    <div className="flex flex-col items-center gap-2">
      {qr ? <QrImage text={qr} size={200} label="O meu QR para a equipa validar a visita" /> : <div className="pv-skeleton h-[200px] w-[200px]" />}
      <p className="text-sm text-tinta-2">Mostra este QR à equipa. Renova-se a cada 4 minutos.</p>
    </div>
  );
}
