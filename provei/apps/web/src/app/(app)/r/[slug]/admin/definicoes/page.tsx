import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/forms';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Definições do restaurante' };
export const dynamic = 'force-dynamic';

export default async function DefinicoesRestaurantePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const { data } = await sb.from('restaurants').select('id, name, description, address, city, phone, website, cuisine, price_level, lat, lng, hours').eq('id', ctx.restaurant.id).single();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Definições</h1>
      {data ? <SettingsForm restaurant={data as never} /> : null}
    </div>
  );
}
