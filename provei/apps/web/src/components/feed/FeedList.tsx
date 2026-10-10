'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedEntry, FeedPage } from '@provei/api-client';
import { MSG } from '@provei/domain';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { loadFeedPage } from '@/server/actions/social';
import { FeedCard } from './FeedCard';
import { AdCard } from './AdCard';

export function FeedList({ initial, tab, loggedIn }: { initial: FeedPage; tab: 'para-ti' | 'perto'; loggedIn: boolean }) {
  const [entries, setEntries] = useState<FeedEntry[]>(initial.entries);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const more = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    const r = await loadFeedPage(tab, cursor);
    setLoading(false);
    if (!r.ok) return setError(r.error);
    setEntries((e) => [...e, ...r.data.entries]);
    setCursor(r.data.nextCursor);
  }, [cursor, loading, tab]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || error) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && more(), { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, more, error]);

  if (entries.length === 0) {
    return <EmptyState title={MSG.feedEmpty} description="Quando os restaurantes publicarem, os pratos aparecem aqui. Segue os teus favoritos para não perderes nada." />;
  }
  return (
    <div className="flex flex-col gap-5">
      {entries.map((e, i) =>
        e.kind === 'post' ? <FeedCard key={e.item.post.id} item={e.item} loggedIn={loggedIn} priority={i === 0} /> : <AdCard key={`ad-${i}-${e.ad.id}`} ad={e.ad} />,
      )}
      {loading ? <Skeleton className="aspect-[4/5] w-full" /> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-2 rounded-m border border-linha bg-branco p-4 text-center">
          <p>{error}</p>
          <Button variant="secondary" onClick={more}>Tentar de novo</Button>
        </div>
      ) : null}
      <div ref={sentinel} aria-hidden className="h-1" />
      {!cursor && entries.length > 0 ? <p className="py-4 text-center text-sm text-tinta-2">Chegaste ao fim. Volta mais logo!</p> : null}
    </div>
  );
}
