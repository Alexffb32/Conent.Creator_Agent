import type { Metadata } from 'next';
import { MenuEditor } from '@/components/admin/MenuEditor';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Menu' };
export const dynamic = 'force-dynamic';

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const [cats, items] = await Promise.all([
    sb.from('menu_categories').select('id, name').eq('restaurant_id', ctx.restaurant.id).order('position'),
    sb.from('menu_items').select('id, name, description, price_cents, category_id').eq('restaurant_id', ctx.restaurant.id).order('position'),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Menu</h1>
      <MenuEditor restaurantId={ctx.restaurant.id} categories={cats.data ?? []} items={items.data ?? []} />
    </div>
  );
}

