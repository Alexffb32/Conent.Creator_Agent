import 'server-only';
import { cache } from 'react';
import { createAnonSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured, serverEnv } from '@/lib/env';

export const FLAG_KEYS = [
  'payments',
  'wallet',
  'ads',
  'ad_free_subscription',
  'table_ordering',
  'video_external_processor',
  'web_push',
  'reviews',
  'loyalty',
  'call_waiter',
] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];
export type Flags = Record<FlagKey, boolean>;

export const DEFAULT_FLAGS: Flags = {
  payments: false,
  wallet: false,
  ads: false,
  ad_free_subscription: false,
  table_ordering: false,
  video_external_processor: true,
  web_push: true,
  reviews: true,
  loyalty: true,
  call_waiter: true,
};

/** Flags globais, com override por restaurante. Liga-se por configuração, sem novo deploy. */
export const getFlags = cache(async (restaurantId?: string): Promise<Flags> => {
  const flags = { ...DEFAULT_FLAGS };
  if (!isSupabaseConfigured()) return flags;
  try {
    const sb = serverEnv.serviceRoleKey ? createServiceSupabase() : createAnonSupabase();
    const { data } = await sb.from('feature_flags').select('key, enabled');
    for (const row of data ?? []) if (row.key in flags) flags[row.key as FlagKey] = row.enabled;
    if (restaurantId && serverEnv.serviceRoleKey) {
      const { data: over } = await sb.from('restaurant_flags').select('key, enabled').eq('restaurant_id', restaurantId);
      for (const row of over ?? []) if (row.key in flags) flags[row.key as FlagKey] = row.enabled;
    }
  } catch {
    // base de dados indisponível: usar valores por omissão
  }
  return flags;
});
