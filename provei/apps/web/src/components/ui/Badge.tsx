import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type Tone = 'verde' | 'amarelo' | 'neutro' | 'erro';
const tones: Record<Tone, string> = {
  verde: 'bg-verde-tinta text-verde-escuro',
  amarelo: 'bg-amarelo-tinta text-tinta',
  neutro: 'bg-nevoa text-tinta-2 border border-linha',
  erro: 'bg-[#fbe9e7] text-erro',
};
export function Badge({ tone = 'verde', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('inline-flex min-h-[28px] items-center gap-1 rounded-pill px-3 py-1 text-[13px] font-semibold', tones[tone], className)} {...rest} />;
}
