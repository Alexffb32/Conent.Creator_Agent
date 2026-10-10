'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Bookmark, Heart, MapPin, Share2, Store } from 'lucide-react';
import { secondsWatched } from '@provei/domain';
import type { FeedItem } from '@provei/api-client';
import { Badge, cn, useToast } from '@/components/ui';
import { mediaUrl, formatPrice } from '@/lib/media';
import { toggleFollow, toggleSave } from '@/server/actions/social';

export function FeedCard({ item, loggedIn, priority }: { item: FeedItem; loggedIn: boolean; priority?: boolean }) {
  const { toast } = useToast();
  const [followed, setFollowed] = useState(item.followed);
  const [saved, setSaved] = useState(item.saved);
  const [, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const watched = useRef<{ lastMs: number; pending: number[] }>({ lastMs: 0, pending: [] });
  const [near, setNear] = useState(Boolean(priority));

  // vídeo só carrega perto do ecrã; reproduz em silêncio quando está visível
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setNear(true);
          const v = videoRef.current;
          if (!v) continue;
          if (e.isIntersecting && e.intersectionRatio > 0.6) v.play().catch(() => {});
          else v.pause();
        }
      },
      { rootMargin: '300px 0px', threshold: [0, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // progresso de visualização por segundo, em lotes a cada 5 s
  useEffect(() => {
    if (item.media?.kind !== 'video') return;
    const flush = () => {
      const secs = watched.current.pending.splice(0);
      if (!secs.length) return;
      const body = JSON.stringify({ postId: item.post.id, seconds: secs.slice(0, 10) });
      navigator.sendBeacon?.('/api/analytics/watch', new Blob([body], { type: 'application/json' }));
    };
    const t = setInterval(flush, 5000);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(t);
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, [item.post.id, item.media?.kind]);

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    const ms = v.currentTime * 1000;
    const w = watched.current;
    if (ms < w.lastMs) w.lastMs = 0; // loop
    for (const s of secondsWatched(w.lastMs, ms)) if (!w.pending.includes(s)) w.pending.push(s);
    w.lastMs = ms;
  }

  function needLogin() {
    toast('Entra na tua conta para fazer isto.', 'info');
    location.href = `/entrar?next=${encodeURIComponent(location.pathname)}`;
  }

  function onFollow() {
    if (!loggedIn) return needLogin();
    const prev = followed;
    setFollowed(!prev);
    start(async () => {
      const r = await toggleFollow(item.restaurant.id);
      if (!r.ok) {
        setFollowed(prev);
        toast(r.error, 'erro');
      }
    });
  }
  function onSave() {
    if (!loggedIn) return needLogin();
    const prev = saved;
    setSaved(!prev);
    start(async () => {
      const r = await toggleSave(item.post.id);
      if (!r.ok) {
        setSaved(prev);
        toast(r.error, 'erro');
      } else toast(r.data.saved ? 'Guardado' : 'Removido dos guardados', 'info');
    });
  }
  async function onShare() {
    const url = `${location.origin}/r/${item.restaurant.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: item.post.dish_name, text: `${item.post.dish_name} em ${item.restaurant.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copiado');
      }
    } catch {
      /* cancelado */
    }
  }

  const src = mediaUrl(item.media?.storage_path);
  const poster = mediaUrl(item.media?.poster_path);
  const isVideo = item.media?.kind === 'video';

  return (
    <article ref={cardRef} aria-label={item.post.dish_name} className="overflow-hidden rounded-l border border-linha bg-branco">
      <div className="relative aspect-[4/5] w-full bg-verde-escuro">
        {isVideo && src ? (
          <video
            ref={videoRef}
            src={near ? src : undefined}
            poster={poster ?? undefined}
            muted
            loop
            playsInline
            preload={priority ? 'auto' : 'none'}
            onTimeUpdate={onTimeUpdate}
            aria-label={`Vídeo: ${item.post.dish_name}`}
            className="h-full w-full object-cover"
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${item.post.dish_name} em ${item.restaurant.name}`} loading={priority ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-branco/70" aria-hidden>
            <Store size={48} />
          </div>
        )}
        {item.restaurant.is_demo ? <Badge tone="amarelo" className="absolute left-3 top-3">Exemplo fictício</Badge> : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-tinta/80 to-transparent p-4 text-branco">
          <h2 className="pv-title text-3xl leading-tight">{item.post.dish_name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm">
            {item.post.price_cents != null ? <span className="rounded-pill bg-amarelo px-2.5 py-0.5 font-semibold text-tinta">{formatPrice(item.post.price_cents)}</span> : null}
            {item.distanceKm != null ? (
              <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{item.distanceKm < 1 ? 'a menos de 1 km' : `a ${Math.round(item.distanceKm)} km`}</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <Link href={`/r/${item.restaurant.slug}`} className="min-w-0 flex-1 truncate font-semibold text-verde-escuro" aria-label={`Ver restaurante ${item.restaurant.name}`}>
          {item.restaurant.name}
          {item.restaurant.city ? <span className="block truncate text-sm font-normal text-tinta-2">{item.restaurant.city}</span> : null}
        </Link>
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={followed}
          className={cn(
            'inline-flex min-h-touch items-center gap-1.5 rounded-pill px-4 text-sm font-semibold',
            followed ? 'bg-verde-tinta text-verde-escuro' : 'bg-verde text-branco',
          )}
        >
          <Heart size={16} aria-hidden className={followed ? 'fill-verde' : ''} />
          {followed ? 'A seguir' : 'Seguir'}
        </button>
        <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? 'Remover dos guardados' : 'Guardar prato'} className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta">
          <Bookmark size={22} aria-hidden className={saved ? 'fill-amarelo text-amarelo' : ''} />
        </button>
        <button type="button" onClick={onShare} aria-label="Partilhar" className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta">
          <Share2 size={20} aria-hidden />
        </button>
      </div>
      {item.post.caption ? <p className="px-4 pb-4 text-tinta-2">{item.post.caption}</p> : null}
    </article>
  );
}
