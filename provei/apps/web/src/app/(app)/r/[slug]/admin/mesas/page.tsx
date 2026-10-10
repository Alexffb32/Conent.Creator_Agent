import type { Metadata } from 'next';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { Card } from '@/components/ui';
import { CreateTableForm } from '@/components/admin/CreateTableForm';
import { TableQrCard } from '@/components/admin/TableQrCard';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { DEFAULT_PLAN_LIMITS } from '@provei/domain';

export const metadata: Metadata = { title: 'Mesas e QR' };
export const dynamic = 'force-dynamic';

export default async function MesasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const [{ data: tables }, { data: lim }, { data: active }] = await Promise.all([
    sb.from('tables').select('id, label, public_code, active').eq('restaurant_id', ctx.restaurant.id).order('label'),
    createServiceSupabase().from('plan_limits').select('max_tables').eq('plan', ctx.restaurant.plan).single(),
    sb.from('table_sessions').select('table_id').eq('restaurant_id', ctx.restaurant.id).is('ended_at', null).gt('expires_at', new Date().toISOString()),
  ]);
  const max = lim?.max_tables ?? DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxTables;
  const occupied = new Set((active ?? []).map((s) => s.table_id));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="pv-title text-4xl text-verde-escuro">Mesas e QR</h1>
        {(tables ?? []).length > 0 ? <Link href={`/r/${slug}/admin/mesas/folha`} className="inline-flex min-h-touch items-center gap-2 rounded-pill border border-linha bg-branco px-5 font-semibold text-verde-escuro"><Printer size={18} aria-hidden /> Folha A4 de autocolantes</Link> : null}
      </div>
      <p className="text-tinta-2">{ctx.restaurant.plan === 'free' ? `Plano gratuito: ${(tables ?? []).length} de ${max} mesas.` : `${(tables ?? []).length} mesas.`} O mesmo URL serve para QR e NFC.</p>
      <Card><CreateTableForm restaurantId={ctx.restaurant.id} /></Card>
      <ul className="grid gap-4 sm:grid-cols-2">
        {(tables ?? []).map((t) => (
          <li key={t.id}>
            {occupied.has(t.id) ? <p className="mb-1 text-sm font-semibold text-verde">● Ocupada</p> : null}
            <TableQrCard table={t} restaurantId={ctx.restaurant.id} restaurantName={ctx.restaurant.name} siteUrl={publicEnv.siteUrl} />
          </li>
        ))}
      </ul>
    </div>
  );
}
