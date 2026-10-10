import { cn } from './cn';

export function Avatar({ src, name, size = 40, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} loading="lazy" className={cn('rounded-pill object-cover', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      role="img"
      aria-label={name}
      className={cn('inline-flex items-center justify-center rounded-pill bg-verde-tinta font-semibold text-verde-escuro', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
