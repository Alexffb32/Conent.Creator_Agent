import Link from 'next/link';
import type { ReactNode } from 'react';
export { Card, CardTitle } from '@/components/ui';

export function LinkLike({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-semibold text-verde underline">{children}</Link>;
}
