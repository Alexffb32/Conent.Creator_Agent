import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'md' | 'lg' | 'sm';

/*
 * Botão de referência (seis decisões):
 * D1 48 px de altura, 24 px de margem lateral · D2 17 px semibold, verbo + objeto
 * D3 rebordo ≥ 3:1, texto ≥ 4.5:1, foco visível · D4 gradiente acetinado, aresta de luz em cima, sombra para baixo
 * D5 pílula · D6 hover com luz no rebordo, pressão afunda 1 px, estado a processar.
 */
const base =
  'pv-btn relative inline-flex select-none items-center justify-center gap-2.5 rounded-pill font-semibold transition-[transform,box-shadow,background-color,color] duration-fast ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50';
const variants: Record<Variant, string> = {
  primary:
    'pv-btn-primary text-branco border border-verde-escuro shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_24px_-12px_rgba(15,42,23,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_3px_rgba(123,198,45,0.45),0_8px_24px_-12px_rgba(15,42,23,0.5)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_-2px_rgba(15,42,23,0.4)]',
  secondary:
    'bg-branco text-verde-escuro border border-linha-forte shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(15,42,23,0.08)] hover:border-verde hover:bg-verde-tinta',
  ghost: 'bg-transparent text-verde-escuro hover:bg-verde-tinta',
  danger: 'bg-erro text-branco border border-[#8e2a20] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-95',
  accent: 'bg-amarelo text-tinta border border-[#8a7300] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_18px_-10px_rgba(15,42,23,0.45)] hover:brightness-95',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-touch px-4 text-[15px]',
  md: 'min-h-[48px] px-6 text-[17px]',
  lg: 'min-h-[56px] px-7 text-lg',
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
      {loading ? (
        <>
          <span aria-hidden className="h-4 w-4 animate-spin rounded-pill border-2 border-current border-t-transparent" />
          <span>A processar…</span>
        </>
      ) : (
        children
      )}
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
