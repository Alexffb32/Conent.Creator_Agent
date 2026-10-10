import Link from 'next/link';
import { cn } from './cn';

/** Separadores baseados em ligações (ex.: ?tab=perto), bons para SSR e acessibilidade. */
export function LinkTabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav aria-label="Separadores" className="inline-flex rounded-pill border border-linha bg-branco p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-touch items-center rounded-pill px-5 text-sm font-semibold transition-colors duration-fast',
            t.key === active ? 'bg-verde text-branco' : 'text-verde-escuro hover:bg-verde-tinta',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
