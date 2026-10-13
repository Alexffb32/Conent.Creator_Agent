import Link from 'next/link';
import { cn } from './cn';

/** Separadores baseados em ligações (ex.: ?tab=perto), bons para SSR e acessibilidade. */
export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav aria-label="Separadores" className="inline-flex rounded-pill border border-linha-forte bg-branco p-1 shadow-[inset_0_1px_2px_rgba(15,42,23,0.08)]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-[44px] items-center rounded-pill px-5 text-[15px] font-semibold transition-colors duration-fast',
            t.key === active ? 'pv-btn-primary text-branco shadow-sm' : 'text-verde-escuro hover:bg-verde-tinta',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
