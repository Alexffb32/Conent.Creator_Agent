import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';
import { isSupabaseConfigured } from '@/lib/env';
import { createAnonSupabase } from '@/lib/supabase/server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const alt = (path: string) => ({ languages: { 'pt-PT': `${base}${path}`, en: `${base}${path}?lang=en` } });
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1, alternates: alt('/') },
    { url: `${base}/descobrir`, changeFrequency: 'daily', priority: 0.8, alternates: alt('/descobrir') },
    { url: `${base}/para-restaurantes`, changeFrequency: 'monthly', priority: 0.8 },
    ...['/legal/termos', '/legal/privacidade', '/legal/cookies', '/legal/aviso-legal', '/denunciar'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
  ];
  if (!isSupabaseConfigured()) return pages;
  const { data } = await createAnonSupabase()
    .from('restaurants')
    .select('slug, updated_at, is_demo')
    .eq('verified_status', 'verified')
    .is('deleted_at', null)
    .eq('is_demo', false)
    .limit(5000);
  for (const r of data ?? []) {
    pages.push({ url: `${base}/r/${r.slug}`, lastModified: r.updated_at ?? undefined, changeFrequency: 'daily', priority: 0.7, alternates: alt(`/r/${r.slug}`) });
  }
  return pages;
}
