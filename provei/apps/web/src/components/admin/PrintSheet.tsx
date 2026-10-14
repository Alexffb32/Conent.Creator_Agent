'use client';
import { Printer } from 'lucide-react';
import { Button, QrImage } from '@/components/ui';

/** Folha A4 (3×4 autocolantes por página). Usa o diálogo de impressão do navegador. */
export function PrintSheet({ restaurant, siteUrl, tables }: { restaurant: string; siteUrl: string; tables: { id: string; label: string; public_code: string }[] }) {
  return (
    <div>
      <style>{`@media print { header, nav, footer, .no-print { display: none !important; } main { padding: 0 !important; } @page { size: A4; margin: 8mm; } }`}</style>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <h1 className="pv-title text-4xl text-verde-escuro">Folha A4 de autocolantes</h1>
        <Button onClick={() => window.print()}><Printer size={18} aria-hidden /> Imprimir</Button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {tables.map((t) => (
          <li key={t.id} className="flex break-inside-avoid flex-col items-center gap-1 rounded-m border border-dashed border-linha bg-branco p-3 text-center">
            <p className="pv-title text-2xl text-verde-escuro">Provei<span className="text-verde-fresco">.</span></p>
            <QrImage text={`${siteUrl}/t/${t.public_code}`} size={130} label={`QR da mesa ${t.label}`} />
            <p className="font-semibold">{restaurant} · Mesa {t.label}</p>
            <p className="text-xs text-tinta-2">Lê para chamar o empregado e ganhar pontos</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
