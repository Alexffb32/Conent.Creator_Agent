import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-m border border-linha bg-branco p-5 shadow-sm sm:p-6', className)} {...rest} />;
}
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('pv-title text-2xl text-verde-escuro', className)} {...rest} />;
}
