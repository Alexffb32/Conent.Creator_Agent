import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'md' | 'lg' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-colors duration-fast ease-out select-none disabled:opacity-50 disabled:pointer-events-none min-h-touch';
const variants: Record<Variant, string> = {
  primary: 'bg-verde text-branco hover:bg-verde-escuro',
  secondary: 'bg-branco text-verde-escuro border border-linha hover:bg-verde-tinta',
  ghost: 'bg-transparent text-verde-escuro hover:bg-verde-tinta',
  danger: 'bg-erro text-branco hover:opacity-90',
  accent: 'bg-amarelo text-tinta hover:brightness-95',
};
const sizes: Record<Size, string> = {
  sm: 'px-4 text-sm',
  md: 'px-5 text-base',
  lg: 'px-7 text-lg min-h-[56px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: Props) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? 'A processar…' : children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
