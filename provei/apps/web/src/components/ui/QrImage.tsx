'use client';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Desenha um QR a partir de texto (gerado no cliente; nada de HTML injetado). */
export function QrImage({ text, size = 220, label }: { text: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: '#0A3D1C', light: '#FFFFFF' }, errorCorrectionLevel: 'M' }).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [text, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={label} width={size} height={size} className="rounded-m border border-linha bg-branco" /> : <div className="pv-skeleton" style={{ width: size, height: size }} aria-hidden />;
}
