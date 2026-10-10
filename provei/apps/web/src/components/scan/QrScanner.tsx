'use client';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

/** Leitor de QR por câmara (getUserMedia + jsQR). Se a câmara falhar, o chamador oferece entrada manual. */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const v = videoRef.current;
        if (!v || stopped) return;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (stopped) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA && ctx) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              stopped = true;
              onResult(code.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError('Não conseguimos abrir a câmara. Confirma a permissão ou usa o código manual.');
      }
    }
    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="rounded-m bg-amarelo-tinta p-3 text-sm">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-m bg-tinta">
          <video ref={videoRef} playsInline muted aria-label="Câmara para ler o QR" className="aspect-square w-full object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-8 rounded-m border-4 border-verde-fresco/80" />
        </div>
      )}
      {onClose ? <Button variant="secondary" onClick={onClose}>Fechar câmara</Button> : null}
    </div>
  );
}
