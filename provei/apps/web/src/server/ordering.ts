import 'server-only';
import { createServerSupabase } from '@/lib/supabase/server';

export interface OrderMenuItem {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  allergens: string[];
}
export interface OrderMenuData {
  categories: { id: string; name: string }[];
  items: OrderMenuItem[];
}

/** Menu público (só pratos disponíveis) para pedir. Os preços finais são sempre recalculados na base de dados. */
export async function loadOrderMenu(restaurantId: string): Promise<OrderMenuData> {
  const sb = await createServerSupabase();
  const [cats, items] = await Promise.all([
    sb.from('menu_categories').select('id, name').eq('restaurant_id', restaurantId).order('position'),
    sb.from('menu_items').select('id, name, description, price_cents, category_id, allergens').eq('restaurant_id', restaurantId).eq('available', true).order('position'),
  ]);
  return {
    categories: (cats.data ?? []) as OrderMenuData['categories'],
    items: ((items.data ?? []) as OrderMenuItem[]).map((i) => ({ ...i, allergens: i.allergens ?? [] })),
  };
}

export interface TablePublicInfo {
  restaurant_id: string;
  slug: string;
  name: string;
  table_label: string;
  ordering: boolean;
  payments: boolean;
  stripe_ready: boolean;
}
export async function tablePublicInfo(code: string): Promise<TablePublicInfo | null> {
  if (!/^[a-z0-9]{6,16}$/i.test(code)) return null;
  const sb = await createServerSupabase();
  const { data } = await sb.rpc('table_public_info', { p_code: code });
  return (data as TablePublicInfo | null) ?? null;
}

/** Restaurante público para pedidos para levantar. */
export async function pickupRestaurant(slug: string) {
  const sb = await createServerSupabase();
  const { data } = await sb.from('restaurants').select('id, slug, name').eq('slug', slug).eq('verified_status', 'verified').is('deleted_at', null).maybeSingle();
  return data as { id: string; slug: string; name: string } | null;
}
