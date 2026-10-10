import type { Metadata } from 'next';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { PrintSheet } from '@/components/admin/PrintSheet';

export const metadata: Metadata = { title: 'Folha de autocolantes' };
export const dynamic = 'force-dynamic';

export default async function FolhaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const { data: tables } = await sb.from('tables').select('id, label, public_code').eq('restaurant_id', ctx.restaurant.id).eq('active', true).order('label');
  return <PrintSheet restaurant={ctx.restaurant.name} siteUrl={publicEnv.siteUrl} tables={tables ?? []} />;
}
