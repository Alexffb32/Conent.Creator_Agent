'use client';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from './cn';

export function RatingStars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1).replace('.', ',')} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden className={cn(n <= Math.round(value) ? 'fill-amarelo text-amarelo' : 'text-linha')} />
      ))}
    </span>
  );
}

export function RatingInput({ name, defaultValue = 0 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div role="radiogroup" aria-label="Classificação" className="flex gap-1">
      <input type="hidden" name={name} value={value || ''} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
          onClick={() => setValue(n)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta"
        >
          <Star size={28} className={cn(n <= value ? 'fill-amarelo text-amarelo' : 'text-linha')} aria-hidden />
        </button>
      ))}
    </div>
  );
}
