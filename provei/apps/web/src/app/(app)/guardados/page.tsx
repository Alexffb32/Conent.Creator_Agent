import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatPrice, mediaUrl } from '@/lib/media';

export const metadata: Metadata = { title: 'Guardados' };
export const dynamic = 'force-dynamic';

export default async function GuardadosPage() {
  const me = await requireUser('/guardados');
  const sb = await createServerSupabase();
  const { data } = await sb
    .from('saves')
    .select('created_at, posts(id, dish_name, price_cents, restaurants(slug, name), media_assets(kind, storage_path, poster_path))')
    .eq('user_id', me.id)
    .order('created_at', { ascending: false });
  const rows = (data ?? []).flatMap((s) => {
    const p = s.posts as unknown as { id: string; dish_name: string; price_cents: number | null; restaurants: { slug: string; name: string }; media_assets: { kind: string; storage_path: string; poster_path: string | null } | null } | null;
    return p ? [p] : [];
  });
  return (
    <div className="pv-container flex flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Guardados</h1>
      {rows.length === 0 ? (
        <EmptyState title="Ainda não guardaste nada" description="Toca no marcador de um prato para o guardares aqui." action={<Link href="/" className="font-semibold text-verde underline">Ver pratos</Link>} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => {
            const src = mediaUrl(p.media_assets?.kind === 'video' ? p.media_assets.poster_path : p.media_assets?.storage_path);
            return (
              <li key={p.id} className="overflow-hidden rounded-m border border-linha bg-branco">
                <Link href={`/r/${p.restaurants.slug}`}>
                  <div className="relative aspect-square bg-verde-tinta">{src ? <Image src={src} alt={p.dish_name} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" /> : null}</div>
                  <div className="p-2"><p className="truncate font-semibold">{p.dish_name}</p><p className="truncate text-sm text-tinta-2">{p.restaurants.name} {formatPrice(p.price_cents)}</p></div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
