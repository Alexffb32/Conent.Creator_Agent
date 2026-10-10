'use client';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/** Folha inferior (mobile) / diálogo central (ecrãs largos), baseada em <dialog> nativo. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="sheet-title"
      className="m-0 mt-auto w-full max-w-lg rounded-t-l bg-branco p-0 text-tinta backdrop:bg-tinta/50 sm:m-auto sm:rounded-l"
    >
      <div className="flex items-center justify-between border-b border-linha px-5 py-3">
        <h2 id="sheet-title" className="pv-title text-2xl text-verde-escuro">
          {title}
        </h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta">
          <X size={22} aria-hidden />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto p-5 pv-safe-bottom">{children}</div>
    </dialog>
  );
}
