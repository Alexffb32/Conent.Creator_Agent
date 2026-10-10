'use client';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, Nfc } from 'lucide-react';
import { Badge, Button, Card, QrImage, useToast } from '@/components/ui';
import { setTableActive } from '@/server/actions/table';

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

/** PNG com a marca: QR + "Provei" + instrução, desenhado em canvas. */
async function brandedPng(url: string, restaurant: string, label: string): Promise<string> {
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: '#0A3D1C', light: '#FFFFFF' }, errorCorrectionLevel: 'H' });
  const img = new Image();
  img.src = qr;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 800;
  c.height = 1000;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#F4F9EE';
  g.fillRect(0, 0, c.width, 120);
  g.fillStyle = '#0A3D1C';
  g.font = '64px "Instrument Serif", Georgia, serif';
  g.fillText('Provei', 40, 84);
  g.fillStyle = '#7BC62D';
  g.beginPath();
  g.arc(250, 76, 9, 0, Math.PI * 2);
  g.fill();
  g.drawImage(img, 80, 160, 640, 640);
  g.fillStyle = '#0F2A17';
  g.font = '600 40px Inter, sans-serif';
  g.textAlign = 'center';
  g.fillText(`${restaurant} · Mesa ${label}`, 400, 860);
  g.fillStyle = '#4A5D4F';
  g.font = '32px Inter, sans-serif';
  g.fillText('Lê o QR para chamar o empregado', 400, 910);
  g.fillText('e ganhar pontos', 400, 952);
  return c.toDataURL('image/png');
}

export function TableQrCard({ table, restaurantId, restaurantName, siteUrl }: { table: { id: string; label: string; public_code: string; active: boolean }; restaurantId: string; restaurantName: string; siteUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const url = `${siteUrl}/t/${table.public_code}`;
  const [nfc, setNfc] = useState(false);
  useEffect(() => setNfc(false), [table.id]);
  async function png() {
    download(await brandedPng(url, restaurantName, table.label), `provei-mesa-${table.label}.png`);
  }
  async function svg() {
    const s = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0A3D1C', light: '#FFFFFF' }, errorCorrectionLevel: 'H' });
    download(URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })), `provei-mesa-${table.label}.svg`);
  }
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><p className="pv-title text-2xl">Mesa {table.label}</p><Badge tone={table.active ? 'verde' : 'neutro'}>{table.active ? 'Ativa' : 'Desativada'}</Badge></div>
      <div className="flex justify-center"><QrImage text={url} size={160} label={`QR da mesa ${table.label}`} /></div>
      <p className="break-all text-center font-mono text-xs text-tinta-2">{url}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={png}><Download size={16} aria-hidden /> PNG</Button>
        <Button size="sm" variant="secondary" onClick={svg}><Download size={16} aria-hidden /> SVG</Button>
        <Button size="sm" variant="secondary" onClick={() => setNfc((v) => !v)}><Nfc size={16} aria-hidden /> NFC</Button>
        <Button size="sm" variant="ghost" onClick={async () => { const r = await setTableActive(restaurantId, table.id, !table.active); if (!r.ok) return toast(r.error, 'erro'); router.refresh(); }}>{table.active ? 'Desativar' : 'Ativar'}</Button>
      </div>
      {nfc ? (
        <div className="rounded-m bg-nevoa p-3 text-sm">
          <p className="mb-1 font-semibold">Texto para gravar na etiqueta NFC (NDEF, tipo URL):</p>
          <code className="break-all">{url}?nfc=1</code>
          <p className="mt-2 text-tinta-2">Usa uma app como NFC Tools: Escrever &gt; Adicionar registo &gt; URL/URI. O Provei reconhece o toque NFC.</p>
        </div>
      ) : null}
    </Card>
  );
}
