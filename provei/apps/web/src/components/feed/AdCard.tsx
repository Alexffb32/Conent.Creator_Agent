'use client';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui';

export function AdCard({ ad }: { ad: { id: string; advertiserName: string; headline: string; body: string; url: string | null } }) {
  const ref = useRef<HTMLElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !sent.current) {
        sent.current = true;
        navigator.sendBeacon?.('/api/ads/impression', new Blob([JSON.stringify({ campaignId: ad.id })], { type: 'application/json' }));
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id]);

  function click() {
    navigator.sendBeacon?.('/api/ads/click', new Blob([JSON.stringify({ campaignId: ad.id })], { type: 'application/json' }));
  }
  return (
    <aside ref={ref} aria-label="Conteúdo patrocinado" className="rounded-l border border-amarelo bg-amarelo-tinta p-5">
      <Badge tone="amarelo" className="bg-amarelo text-tinta">Patrocinado</Badge>
      <p className="mt-3 text-sm text-tinta-2">{ad.advertiserName}</p>
      <h2 className="pv-title text-3xl text-verde-escuro">{ad.headline}</h2>
      {ad.body ? <p className="mt-1 text-tinta">{ad.body}</p> : null}
      {ad.url ? (
        <a href={ad.url} target="_blank" rel="sponsored noopener noreferrer" onClick={click} className="mt-4 inline-flex min-h-touch items-center rounded-pill bg-verde px-5 font-semibold text-branco">
          Saber mais
        </a>
      ) : null}
    </aside>
  );
}
