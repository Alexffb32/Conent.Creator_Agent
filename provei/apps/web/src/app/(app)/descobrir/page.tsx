import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Store } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { DiscoverMap } from '@/components/restaurant/DiscoverMap';
import { createAnonSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { mediaUrl } from '@/lib/media';

export const metadata: Metadata = { title: 'Descobrir' };
export const dynamic = 'force-dynamic';

export default async function DescobrirPage({ searchParams }: { searchParams: Promise<{ q?: string; cidade?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 60);
  const cidade = (sp.cidade ?? '').trim();
  let rows: { id: string; slug: string; name: string; city: string | null; cuisine: string[]; logo_path: string | null; lat: number | null; lng: number | null; is_demo: boolean; price_level: number | null }[] = [];
  if (isSupabaseConfigured()) {
    let query = createAnonSupabase().from('restaurants').select('id, slug, name, city, cuisine, logo_path, lat, lng, is_demo, price_level').eq('verified_status', 'verified').is('deleted_at', null).order('name').limit(60);
    if (cidade) query = query.eq('city', cidade);
    if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, ' ')}%`);
    const { data } = await query;
    rows = data ?? [];
  }
  const points = rows.filter((r) => r.lat != null && r.lng != null).map((r) => ({ slug: r.slug, name: r.name, lat: r.lat!, lng: r.lng! }));
  return (
    <div className="pv-container flex flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Descobrir</h1>
      <form role="search" className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Pesquisar restaurante</span>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-tinta-2" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Pesquisar restaurante" className="min-h-touch w-full rounded-pill border border-linha bg-branco pl-11 pr-4" />
        </label>
        <select name="cidade" defaultValue={cidade} aria-label="Cidade" className="min-h-touch rounded-pill border border-linha bg-branco px-4">
          <option value="">Todas as cidades</option>
          <option>Covilhã</option>
          <option>Fundão</option>
        </select>
        <button className="min-h-touch rounded-pill bg-verde px-6 font-semibold text-branco">Pesquisar</button>
      </form>
      {points.length ? <DiscoverMap points={points} /> : null}
      {rows.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Tenta outra pesquisa ou outra cidade." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const logo = mediaUrl(r.logo_path);
            return (
              <li key={r.id}>
                <Link href={`/r/${r.slug}`} className="block">
                  <Card className="flex items-center gap-3 transition-colors duration-fast hover:bg-verde-tinta">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-m bg-verde-tinta">
                      {logo ? <Image src={logo} alt="" width={56} height={56} className="h-full w-full object-cover" /> : <Store className="text-verde" aria-hidden />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.name}</p>
                      <p className="truncate text-sm text-tinta-2">{[r.city, r.cuisine.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</p>
                      {r.is_demo ? <Badge tone="amarelo" className="mt-1">Fictício</Badge> : null}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
