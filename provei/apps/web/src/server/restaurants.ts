import 'server-only';
import { cache } from 'react';
import { averageRating } from '@provei/domain';
import { createAnonSupabase, createServerSupabase } from '@/lib/supabase/server';
import { getSessionProfile } from './auth';
import { isSupabaseConfigured } from '@/lib/env';

/** Cliente adequado: com sessão (para ver o próprio restaurante pendente) ou anónimo. */
async function client() {
  return (await getSessionProfile()) ? await createServerSupabase() : createAnonSupabase();
}

export const getRestaurantBySlug = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null;
  const sb = await client();
  const { data } = await sb.from('restaurants').select('*').eq('slug', slug).is('deleted_at', null).maybeSingle();
  return data;
});

export async function getRestaurantPage(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return null;
  const sb = await client();
  const me = await getSessionProfile();
  const [posts, categories, items, reviews, offers, followRow, program] = await Promise.all([
    sb.from('posts').select('id, dish_name, price_cents, type, media_assets(kind, storage_path, poster_path)').eq('restaurant_id', restaurant.id).eq('status', 'published').is('deleted_at', null).order('published_at', { ascending: false }).limit(24),
    sb.from('menu_categories').select('*').eq('restaurant_id', restaurant.id).order('position'),
    sb.from('menu_items').select('*').eq('restaurant_id', restaurant.id).eq('available', true).order('position'),
    sb.from('reviews').select('id, rating, text, verified, created_at, is_demo, user_id, review_replies(body, created_at)').eq('restaurant_id', restaurant.id).eq('status', 'published').order('created_at', { ascending: false }).limit(30),
    sb.from('offers').select('*').eq('restaurant_id', restaurant.id).eq('active', true).gte('ends_at', new Date().toISOString()),
    me ? sb.from('follows').select('user_id').eq('user_id', me.id).eq('restaurant_id', restaurant.id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from('loyalty_programs').select('stamps_required, reward_text, active').eq('restaurant_id', restaurant.id).maybeSingle(),
  ]);

  const reviewRows = reviews.data ?? [];
  const userIds = [...new Set(reviewRows.map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await sb.from('public_profiles').select('id, display_name, handle').in('id', userIds);
    for (const p of profs ?? []) names.set(p.id, p.display_name || p.handle || 'Cliente');
  }

  return {
    restaurant,
    posts: posts.data ?? [],
    categories: categories.data ?? [],
    items: items.data ?? [],
    reviews: reviewRows.map((r) => ({ ...r, author: names.get(r.user_id) ?? 'Cliente' })),
    average: averageRating(reviewRows.map((r) => r.rating)),
    offers: offers.data ?? [],
    following: Boolean(followRow.data),
    program: program.data,
  };
}
