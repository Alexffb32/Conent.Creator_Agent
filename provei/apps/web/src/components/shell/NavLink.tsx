'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

export function NavLink({ href, children, mobile, className }: { href: string; children: ReactNode; mobile?: boolean; className?: string }) {
  const path = usePathname();
  const active = href === '/' ? path === '/' : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        mobile
          ? 'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold'
          : 'inline-flex min-h-touch items-center rounded-pill text-sm font-semibold',
        active ? 'text-verde' : 'text-tinta-2 hover:text-verde-escuro',
        className,
      )}
    >
      {children}
    </Link>
  );
}
