import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const field =
  'w-full rounded-sm border border-linha-forte bg-branco px-4 py-3 text-base text-tinta placeholder:text-tinta-2 min-h-[48px] transition-colors duration-fast hover:border-tinta-2 focus:border-verde aria-[invalid=true]:border-erro';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...rest} />;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, 'min-h-[96px]', className)} {...rest} />;
}
export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, className)} {...rest} />;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-semibold text-tinta">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-sm text-tinta-2">{hint}</p> : null}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-erro">
          <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-pill bg-erro text-[11px] font-bold text-branco">!</span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, description, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: string }) {
  return (
    <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-m border border-linha-forte bg-branco p-3 transition-colors duration-fast hover:bg-verde-tinta">
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-verde" {...rest} />
      <span className="flex flex-col">
        <span className="text-base text-tinta">{label}</span>
        {description ? <span className="text-sm text-tinta-2">{description}</span> : null}
      </span>
    </label>
  );
}
