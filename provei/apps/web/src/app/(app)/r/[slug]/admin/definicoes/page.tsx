import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/forms';
import { requireMemberPage, MANAGE } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { Badge, Card, CardTitle } from '@/components/ui';
import { ConnectStripe } from '@/components/admin/ConnectStripe';
import { getFlags } from '@/lib/flags';

export const metadata: Metadata = { title: 'Definições do restaurante' };
export const dynamic = 'force-dynamic';

export default async function DefinicoesRestaurantePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, MANAGE);
  const sb = await createServerSupabase();
  const { data } = await sb.from('restaurants').select('id, name, description, address, city, phone, website, cuisine, price_level, lat, lng, hours, stripe_account_id, stripe_charges_enabled').eq('id', ctx.restaurant.id).single();
  const flags = await getFlags(ctx.restaurant.id);
  const showPayments = flags.ordering && flags.payments && ctx.role === 'owner';
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Definições</h1>
      {data ? <SettingsForm restaurant={data as never} /> : null}
      {showPayments && data ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Pagamentos online dos pedidos</CardTitle>
          <p className="text-tinta-2">
            Os clientes pagam diretamente ao restaurante através da Stripe (conta Express em nome do restaurante). O Provei não cobra comissão sobre os pedidos.
            Modo de teste: nenhum dinheiro real é movimentado.
          </p>
          <Badge tone={data.stripe_charges_enabled ? 'verde' : 'neutro'}>
            {data.stripe_charges_enabled ? 'Pagamentos ativos' : data.stripe_account_id ? 'Falta concluir o registo na Stripe' : 'Ainda não ligado'}
          </Badge>
          {!data.stripe_charges_enabled && <ConnectStripe restaurantId={ctx.restaurant.id} label={data.stripe_account_id ? 'Concluir registo na Stripe' : 'Ligar conta Stripe'} />}
        </Card>
      ) : null}
    </div>
  );
}
