import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-m border border-linha bg-branco p-4 shadow-[0_1px_0_rgba(15,42,23,0.04)]', className)} {...rest} />;
}
export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('pv-title text-2xl text-verde-escuro', className)} {...rest} />;
}
