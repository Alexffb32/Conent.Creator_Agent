import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Globe, MapPin, Phone, ShieldCheck, Store, Gift } from 'lucide-react';
import { Badge, Card, CardTitle, EmptyState, RatingStars, Avatar } from '@/components/ui';
import { getRestaurantPage, getRestaurantBySlug } from '@/server/restaurants';
import { getSessionProfile, loadMember } from '@/server/auth';
import { getFlags } from '@/lib/flags';
import { formatDateTime, formatPrice, mediaUrl } from '@/lib/media';
import { publicEnv } from '@/lib/env';
import { FollowButton } from '@/components/restaurant/FollowButton';
import { ImHereButton } from '@/components/scan/ImHereButton';
import { RestaurantMap } from '@/components/restaurant/RestaurantMap';
import { ReviewForm } from '@/components/restaurant/ReviewForm';
import { ReportButton } from '@/components/restaurant/ReportButton';

export const dynamic = 'force-dynamic';

const DAYS: [string, string][] = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return { title: 'Restaurante não encontrado' };
  const image = mediaUrl(r.cover_path);
  return {
    title: r.name,
    description: r.description ?? `${r.name} em ${r.city ?? 'Portugal'}: pratos, menu e avaliações no Provei.`,
    openGraph: { title: r.name, description: r.description ?? undefined, images: image ? [image] : undefined, url: `${publicEnv.siteUrl}/r/${r.slug}` },
  };
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getRestaurantPage(slug);
  if (!data) notFound();
  const { restaurant: r } = data;
  const [me, flags, member] = await Promise.all([getSessionProfile(), getFlags(r.id), loadMember({ slug })]);
  const cover = mediaUrl(r.cover_path);
  const logo = mediaUrl(r.logo_path);
  const showOffers = data.offers.length > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    description: r.description ?? undefined,
    servesCuisine: r.cuisine,
    telephone: r.phone ?? undefined,
    url: `${publicEnv.siteUrl}/r/${r.slug}`,
    address: r.address ? { '@type': 'PostalAddress', streetAddress: r.address, addressLocality: r.city ?? undefined, addressCountry: 'PT' } : undefined,
    geo: r.lat != null && r.lng != null ? { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng } : undefined,
    aggregateRating: data.reviews.length ? { '@type': 'AggregateRating', ratingValue: data.average, reviewCount: data.reviews.length } : undefined,
  };

  return (
    <div className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="relative h-44 w-full bg-verde-escuro sm:h-60">
        {cover ? <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
      </div>
      <div className="pv-container -mt-10 flex flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-l border border-linha bg-branco p-5">
          <div className="flex items-start gap-4">
            <div className="-mt-12 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-m border-4 border-branco bg-verde-tinta">
              {logo ? <Image src={logo} alt={`Logótipo de ${r.name}`} width={80} height={80} className="h-full w-full object-cover" /> : <Store size={32} className="text-verde" aria-hidden />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="pv-title text-3xl leading-tight text-verde-escuro sm:text-4xl">{r.name}</h1>
              <p className="text-tinta-2">{[r.city, r.cuisine.slice(0, 3).join(' · '), r.price_level ? '€'.repeat(r.price_level) : null].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {r.verified_status === 'verified' ? <Badge><ShieldCheck size={14} aria-hidden /> Verificado</Badge> : <Badge tone="amarelo">Em verificação</Badge>}
            {r.is_demo ? <Badge tone="amarelo">Restaurante fictício de exemplo</Badge> : null}
            {data.reviews.length ? <span className="inline-flex items-center gap-1 text-sm"><RatingStars value={data.average} /> {data.average.toFixed(1).replace('.', ',')} ({data.reviews.length})</span> : null}
          </div>
          {r.description ? <p>{r.description}</p> : null}
          <div className="flex flex-wrap gap-3">
            <FollowButton restaurantId={r.id} initial={data.following} loggedIn={Boolean(me)} count={r.follower_count} />
            <ImHereButton variant="secondary" />
            {member ? <Link href={`/r/${r.slug}/admin`} className="inline-flex min-h-touch items-center rounded-pill px-4 font-semibold text-verde underline">Abrir painel</Link> : null}
          </div>
        </header>

        {showOffers ? (
          <section aria-labelledby="ofertas" className="flex flex-col gap-3">
            <h2 id="ofertas" className="pv-title text-3xl text-verde-escuro">Ofertas</h2>
            {data.offers.map((o) => (
              <Card key={o.id} className="flex items-start gap-3 border-amarelo bg-amarelo-tinta">
                <Gift className="mt-1 shrink-0" aria-hidden />
                <div><p className="font-semibold">{o.title}</p>{o.description ? <p className="text-tinta-2">{o.description}</p> : null}<p className="text-sm text-tinta-2">Até {formatDateTime(o.ends_at)}</p></div>
              </Card>
            ))}
          </section>
        ) : null}

        {flags.loyalty && data.program?.active ? (
          <Card className="flex items-center gap-3 border-verde-fresco bg-verde-tinta">
            <Gift aria-hidden className="shrink-0 text-verde" />
            <p><strong>Cartão de fidelização:</strong> {data.program.stamps_required} visitas verificadas = {data.program.reward_text}.</p>
          </Card>
        ) : null}

        <section aria-labelledby="pratos" className="flex flex-col gap-3">
          <h2 id="pratos" className="pv-title text-3xl text-verde-escuro">Pratos</h2>
          {data.posts.length === 0 ? (
            <EmptyState title="Ainda não há pratos por aqui" description="Segue este restaurante para saberes quando publicar." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.posts.map((p) => {
                const m = p.media_assets as unknown as { kind: string; storage_path: string; poster_path: string | null } | null;
                const src = mediaUrl(m?.kind === 'video' ? m.poster_path : m?.storage_path);
                return (
                  <li key={p.id} className="overflow-hidden rounded-m border border-linha bg-branco">
                    <div className="relative aspect-square bg-verde-tinta">
                      {src ? <Image src={src} alt={p.dish_name} fill sizes="(min-width:640px) 33vw, 50vw" className="object-cover" /> : null}
                    </div>
                    <div className="p-2"><p className="truncate font-semibold">{p.dish_name}</p><p className="text-sm text-tinta-2">{formatPrice(p.price_cents)}</p></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {data.categories.length + data.items.length > 0 ? (
          <section aria-labelledby="menu" className="flex flex-col gap-3">
            <h2 id="menu" className="pv-title text-3xl text-verde-escuro">Menu</h2>
            {[...data.categories, { id: 'sem', name: 'Outros' } as { id: string; name: string }].map((c) => {
              const list = data.items.filter((i) => (c.id === 'sem' ? !i.category_id : i.category_id === c.id));
              if (!list.length) return null;
              return (
                <Card key={c.id}>
                  <CardTitle className="mb-2 text-xl">{c.name}</CardTitle>
                  <ul className="divide-y divide-linha">
                    {list.map((i) => (
                      <li key={i.id} className="flex items-start justify-between gap-3 py-2">
                        <div><p className="font-semibold">{i.name}</p>{i.description ? <p className="text-sm text-tinta-2">{i.description}</p> : null}</div>
                        <span className="shrink-0 font-semibold">{formatPrice(i.price_cents)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </section>
        ) : null}

        <section aria-labelledby="info" className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <h2 id="info" className="pv-title text-2xl text-verde-escuro">Horário e contactos</h2>
            <ul className="text-sm">
              {DAYS.map(([k, label]) => {
                const h = r.hours?.[k];
                return <li key={k} className="flex justify-between py-0.5"><span>{label}</span><span className="text-tinta-2">{h ? `${h.open}–${h.close}` : 'Fechado'}</span></li>;
              })}
            </ul>
            <ul className="flex flex-col gap-2 text-sm">
              {r.address ? <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />{r.address}{r.city ? `, ${r.city}` : ''}</li> : null}
              {r.phone ? <li className="flex gap-2"><Phone size={16} className="mt-0.5" aria-hidden /><a href={`tel:${r.phone}`} className="underline">{r.phone}</a></li> : null}
              {r.website ? <li className="flex gap-2"><Globe size={16} className="mt-0.5" aria-hidden /><a href={r.website} rel="noopener noreferrer nofollow" target="_blank" className="underline">{r.website.replace(/^https?:\/\//, '')}</a></li> : null}
              <li className="flex gap-2 text-tinta-2"><Clock size={16} className="mt-0.5" aria-hidden />Horário em Europe/Lisbon</li>
            </ul>
          </Card>
          {r.lat != null && r.lng != null ? <RestaurantMap lat={r.lat} lng={r.lng} name={r.name} /> : null}
        </section>

        {flags.reviews ? (
          <section aria-labelledby="avaliacoes" className="flex flex-col gap-3">
            <h2 id="avaliacoes" className="pv-title text-3xl text-verde-escuro">Avaliações</h2>
            {data.reviews.length === 0 ? <p className="text-tinta-2">Ainda ninguém avaliou. Sê o primeiro.</p> : null}
            <ul className="flex flex-col gap-3">
              {data.reviews.map((rv) => (
                <li key={rv.id}>
                  <Card className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={rv.author} size={32} />
                      <span className="font-semibold">{rv.author}</span>
                      <RatingStars value={rv.rating} />
                      {rv.verified ? <Badge><ShieldCheck size={14} aria-hidden /> Visita verificada</Badge> : null}
                      {rv.is_demo ? <Badge tone="amarelo">Exemplo</Badge> : null}
                    </div>
                    {rv.text ? <p>{rv.text}</p> : null}
                    {(rv.review_replies as unknown as { body: string }[] | { body: string } | null) ? (
                      <p className="rounded-m bg-nevoa p-3 text-sm"><strong>Resposta do restaurante:</strong> {(Array.isArray(rv.review_replies) ? rv.review_replies[0] : (rv.review_replies as { body: string }))?.body}</p>
                    ) : null}
                    <div className="flex items-center justify-between text-sm text-tinta-2"><time dateTime={rv.created_at}>{formatDateTime(rv.created_at)}</time>{me ? <ReportButton targetType="review" targetId={rv.id} /> : null}</div>
                  </Card>
                </li>
              ))}
            </ul>
            {me ? <ReviewForm restaurantId={r.id} /> : <p className="text-sm text-tinta-2"><Link href={`/entrar?next=/r/${r.slug}`} className="font-semibold text-verde underline">Entra</Link> para avaliar.</p>}
          </section>
        ) : null}
      </div>
    </div>
  );
}
