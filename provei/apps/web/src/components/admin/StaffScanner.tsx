'use client';
import { useCallback, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Button, Card, CardTitle, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { QrScanner } from '@/components/scan/QrScanner';
import { validateRedemption, validateVisit } from '@/server/actions/table';

type Result = { kind: 'ok' | 'erro'; text: string };

/** Leitor da equipa: QR pessoal do cliente (validar visita) ou QR/código de resgate. Entrada manual como alternativa. */
export function StaffScanner({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState('');
  const [backdate, setBackdate] = useState('0');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = useCallback(
    async (text: string) => {
      setScanning(false);
      setBusy(true);
      try {
        const t = text.trim();
        if (t.startsWith('provei:u:') || t.startsWith('@')) {
          const r = await validateVisit({ restaurantId, userCode: t, reason, backdateMinutes: Number(backdate) });
          setResult(r.ok ? { kind: 'ok', text: `Visita confirmada para ${r.data.name}. +${r.data.points} pontos${r.data.rewardCode ? `. Cartão completo! Recompensa ${r.data.rewardCode}` : ''}.` } : { kind: 'erro', text: r.error });
        } else if (t.startsWith('provei:r:') || /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/.test(t)) {
          const r = await validateRedemption(restaurantId, t);
          setResult(r.ok ? { kind: 'ok', text: `Resgate validado: ${r.data.reward}.` } : { kind: 'erro', text: r.error });
        } else {
          // handle sem @
          const r = await validateVisit({ restaurantId, userCode: t, reason, backdateMinutes: Number(backdate) });
          setResult(r.ok ? { kind: 'ok', text: `Visita confirmada para ${r.data.name}. +${r.data.points} pontos.` } : { kind: 'erro', text: r.error });
        }
      } finally {
        setBusy(false);
      }
    },
    [restaurantId, reason, backdate],
  );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Leitor de QR</h1>
      <p className="text-tinta-2">Lê o QR pessoal do cliente para validar a visita, ou o QR do resgate para entregar a recompensa.</p>
      {result ? (
        <div role={result.kind === 'ok' ? 'status' : 'alert'} className={`rounded-m p-4 font-semibold ${result.kind === 'ok' ? 'bg-verde-tinta text-verde-escuro' : 'bg-[#fbe9e7] text-erro'}`}>{result.text}</div>
      ) : null}
      {scanning ? (
        <QrScanner onResult={handle} onClose={() => setScanning(false)} />
      ) : (
        <Button size="lg" onClick={() => { setResult(null); setScanning(true); }} loading={busy}><ScanLine aria-hidden /> Ler QR com a câmara</Button>
      )}
      <Card className="flex flex-col gap-3">
        <CardTitle className="text-xl">Entrada manual</CardTitle>
        <Field label="Código de resgate ou @utilizador" htmlFor="sc-manual" hint="Ex.: ABCD-2345 ou @ana_silva"><Input id="sc-manual" value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="none" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Visita em atraso" htmlFor="sc-back" hint="Só para validar visitas até 24 h atrás.">
            <Select id="sc-back" value={backdate} onChange={(e) => setBackdate(e.target.value)}>
              <option value="0">Agora</option><option value="30">Há 30 minutos</option><option value="120">Há 2 horas</option><option value="360">Há 6 horas</option><option value="1380">Há 23 horas</option>
            </Select>
          </Field>
          <Field label="Razão (obrigatória se em atraso)" htmlFor="sc-reason"><Textarea id="sc-reason" className="min-h-[44px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} /></Field>
        </div>
        <Button variant="secondary" disabled={!manual.trim() || busy} onClick={() => { void handle(manual); toast('A validar…', 'info'); }}>Validar</Button>
      </Card>
    </div>
  );
}
