/** Tipos mínimos usados pela app. Substituir por `supabase gen types typescript` quando houver projeto ligado. */
export type VerifiedStatus = 'pending' | 'verified' | 'rejected';
export type PlanKey = 'free' | 'paid';

export interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine: string[];
  address: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  hours: Record<string, { open: string; close: string } | null>;
  price_level: number | null;
  cover_path: string | null;
  logo_path: string | null;
  verified_status: VerifiedStatus;
  plan: PlanKey;
  settings: Record<string, unknown>;
  follower_count: number;
  is_demo: boolean;
}

export interface PostRow {
  id: string;
  restaurant_id: string;
  type: 'video' | 'photo';
  media_id: string | null;
  caption: string | null;
  dish_name: string;
  price_cents: number | null;
  tags: string[];
  status: 'processing' | 'published' | 'hidden' | 'removed';
  published_at: string | null;
  view_count: number;
  save_count: number;
}

export interface MediaRow {
  id: string;
  kind: 'video' | 'photo';
  storage_path: string;
  poster_path: string | null;
  duration_ms: number | null;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  variants: Record<string, string>;
}

export interface FeedItem {
  post: PostRow;
  restaurant: Pick<RestaurantRow, 'id' | 'slug' | 'name' | 'city' | 'logo_path' | 'lat' | 'lng' | 'is_demo'>;
  media: Pick<MediaRow, 'kind' | 'storage_path' | 'poster_path' | 'duration_ms'> | null;
  followed: boolean;
  saved: boolean;
  distanceKm: number | null;
}

export type FeedEntry =
  | { kind: 'post'; item: FeedItem }
  | { kind: 'ad'; ad: { id: string; advertiserName: string; headline: string; body: string; url: string | null } };

export interface FeedPage {
  entries: FeedEntry[];
  nextCursor: string | null;
}
