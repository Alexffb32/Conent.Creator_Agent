import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-m border border-linha bg-branco p-5 shadow-sm sm:p-6', className)} {...rest} />;
}
export function CardTitle({ className, as: Tag = 'h2', ...rest }: HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' }) {
  return <Tag className={cn('pv-title text-2xl text-verde-escuro', className)} {...rest} />;
}
