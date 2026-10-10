'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Store } from 'lucide-react';
import { Sheet } from '@/components/ui';

export function ModeSwitch({ restaurants }: { restaurants: { slug: string; name: string; role: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Modo restaurante" className="inline-flex h-11 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-verde-escuro hover:bg-verde-tinta">
        <Store size={20} aria-hidden />
        <span className="hidden sm:inline">Restaurante</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Modo restaurante">
        <ul className="flex flex-col gap-2">
          {restaurants.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/r/${r.slug}/admin`}
                onClick={() => setOpen(false)}
                className="flex min-h-touch items-center justify-between rounded-m border border-linha px-4 py-3 hover:bg-verde-tinta"
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-tinta-2">{r.role === 'owner' ? 'Dono' : 'Equipa'}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-tinta-2">Volta ao modo normal a qualquer momento pelo logótipo.</p>
      </Sheet>
    </>
  );
}
