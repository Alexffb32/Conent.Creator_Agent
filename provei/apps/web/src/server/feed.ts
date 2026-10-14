import 'server-only';
import { cookies } from 'next/headers';
import { adSlots, decodeCursor, encodeCursor, feedScore, haversineKm, pickAd, type AdCampaignLite } from '@provei/domain';
import type { FeedEntry, FeedItem, FeedPage } from '@provei/api-client';
import { createAnonSupabase, createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { isSupabaseConfigured, serverEnv } from '@/lib/env';
import { getSessionProfile } from './auth';

export const FEED_PAGE_SIZE = 8;
const CANDIDATES = 120;

export type FeedTab = 'para-ti' | 'perto';

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  covilhã: { lat: 40.2811, lng: -7.5042 },
  covilha: { lat: 40.2811, lng: -7.5042 },
  fundão: { lat: 40.1383, lng: -7.5008 },
  fundao: { lat: 40.1383, lng: -7.5008 },
};

async function readLocation(): Promise<{ lat: number; lng: number } | null> {
  const c = (await cookies()).get('pv_loc')?.value;
  if (!c) return null;
  const [lat, lng] = c.split(',').map(Number);
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

interface Row {
  id: string;
  restaurant_id: string;
  type: 'video' | 'photo';
  media_id: string | null;
  caption: string | null;
  dish_name: string;
  price_cents: number | null;
  tags: string[];
  status: 'published';
  published_at: string;
  view_count: number;
  save_count: number;
  restaurants: { id: string; slug: string; name: string; city: string | null; logo_path: string | null; lat: number | null; lng: number | null; is_demo: boolean };
  media_assets: { kind: 'video' | 'photo'; storage_path: string; poster_path: string | null; duration_ms: number | null; variants: Record<string, string> } | null;
}

/**
 * Feed paginado por cursor. Ordenação explicável (ver packages/domain/src/feedRank.ts e docs/DECISIONS.md).
 */
export async function getFeed(opts: { tab: FeedTab; cursor?: string | null }): Promise<FeedPage> {
  if (!isSupabaseConfigured()) return { entries: [], nextCursor: null };
  const me = await getSessionProfile();
  const sb = me ? await createServerSupabase() : createAnonSupabase();
  const now = new Date();

  const { data, error } = await sb
    .from('posts')
    .select(
      'id, restaurant_id, type, media_id, caption, dish_name, price_cents, tags, status, published_at, view_count, save_count, restaurants!inner(id, slug, name, city, logo_path, lat, lng, is_demo), media_assets(kind, storage_path, poster_path, duration_ms, variants)',
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .limit(CANDIDATES);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  let followed = new Set<string>();
  let saved = new Set<string>();
  if (me) {
    const [f, s] = await Promise.all([
      sb.from('follows').select('restaurant_id').eq('user_id', me.id),
      sb.from('saves').select('post_id').eq('user_id', me.id),
    ]);
    followed = new Set((f.data ?? []).map((x) => x.restaurant_id));
    saved = new Set((s.data ?? []).map((x) => x.post_id));
  }

  const cookieLoc = me?.consents.location ? await readLocation() : null;
  const cityLoc = me?.city ? CITY_COORDS[me.city.toLowerCase()] ?? null : null;
  const origin = cookieLoc ?? cityLoc ?? CITY_COORDS['covilhã']!;

  const scored = rows.map((r) => {
    const rl = r.restaurants.lat != null && r.restaurants.lng != null ? { lat: r.restaurants.lat, lng: r.restaurants.lng } : null;
    const distanceKm = rl ? haversineKm(origin, rl) : null;
    const isFollowed = followed.has(r.restaurant_id);
    const score = feedScore({
      publishedAt: new Date(r.published_at),
      followed: isFollowed && opts.tab === 'para-ti',
      distanceKm: opts.tab === 'perto' ? distanceKm : distanceKm != null ? distanceKm * 2 : null,
      saves: r.save_count,
      views: r.view_count,
      now,
    });
    return { r, distanceKm, isFollowed, score };
  });

  const pool = opts.tab === 'perto' ? scored.filter((x) => x.distanceKm == null || x.distanceKm <= 40) : scored;
  pool.sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id));

  const offset = decodeCursor(opts.cursor);
  const slice = pool.slice(offset, offset + FEED_PAGE_SIZE);
  const nextCursor = offset + FEED_PAGE_SIZE < pool.length ? encodeCursor(offset + FEED_PAGE_SIZE) : null;

  const items: FeedItem[] = slice.map(({ r, distanceKm, isFollowed }) => ({
    post: {
      id: r.id,
      restaurant_id: r.restaurant_id,
      type: r.type,
      media_id: r.media_id,
      caption: r.caption,
      dish_name: r.dish_name,
      price_cents: r.price_cents,
      tags: r.tags,
      status: r.status,
      published_at: r.published_at,
      view_count: r.view_count,
      save_count: r.save_count,
    },
    restaurant: r.restaurants,
    media: r.media_assets
      ? {
          kind: r.media_assets.kind,
          storage_path: r.media_assets.variants?.mp4_720 ?? r.media_assets.storage_path,
          poster_path: r.media_assets.poster_path,
          duration_ms: r.media_assets.duration_ms,
        }
      : null,
    followed: isFollowed,
    saved: saved.has(r.id),
    distanceKm,
  }));

  const entries: FeedEntry[] = items.map((item) => ({ kind: 'post', item }));
  await injectAds(entries, offset, me);
  return { entries, nextCursor };
}

async function injectAds(entries: FeedEntry[], offset: number, me: Awaited<ReturnType<typeof getSessionProfile>>) {
  const flags = await getFlags();
  if (!flags.ads || me?.isAdFree || !serverEnv.serviceRoleKey) return;
  const slots = adSlots(entries.length, offset);
  if (slots.length === 0) return;
  const svc = createServiceSupabase();
  const now = new Date();
  const { data: camps } = await svc
    .from('ad_campaigns')
    .select('id, advertiser_name, creative, targeting, budget_cents, spent_cents, status, starts_at, ends_at')
    .eq('status', 'active')
    .lte('starts_at', now.toISOString())
    .gte('ends_at', now.toISOString());
  if (!camps?.length) return;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const counts: Record<string, number> = {};
  if (me) {
    const { data: imps } = await svc.from('ad_impressions').select('campaign_id').eq('user_id', me.id).gte('ts', today.toISOString());
    for (const i of imps ?? []) counts[i.campaign_id] = (counts[i.campaign_id] ?? 0) + 1;
  }
  const hour = Number(new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', hour12: false, timeZone: 'Europe/Lisbon' }).format(now)) % 24;
  const lite: AdCampaignLite[] = camps.map((c) => ({
    id: c.id,
    status: c.status,
    startsAt: new Date(c.starts_at),
    endsAt: new Date(c.ends_at),
    budgetCents: c.budget_cents,
    spentCents: c.spent_cents,
    targeting: c.targeting ?? {},
  }));
  const viewer = {
    city: me?.city ?? null,
    hour,
    interests: [] as string[],
    isAdFree: Boolean(me?.isAdFree),
    personalizationConsent: Boolean(me?.consents.ads_personalization),
    impressionsTodayByCampaign: counts,
  };
  // inserir de trás para a frente para não deslocar índices
  for (const slot of [...slots].reverse()) {
    const chosen = pickAd(lite, viewer, now);
    if (!chosen) break;
    const c = camps.find((x) => x.id === chosen.id)!;
    const creative = (c.creative ?? {}) as { headline?: string; body?: string; url?: string };
    entries.splice(slot, 0, {
      kind: 'ad',
      ad: { id: c.id, advertiserName: c.advertiser_name, headline: creative.headline ?? c.advertiser_name, body: creative.body ?? '', url: creative.url ?? null },
    });
  }
}
