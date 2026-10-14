import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { SettingsForms } from './SettingsForms';
import { WalletAlertsToggle } from '@/components/loyalty/WalletAlertsToggle';

export const metadata: Metadata = { title: 'Definições' };
export const dynamic = 'force-dynamic';

export default async function DefinicoesPage() {
  const me = await requireUser('/perfil/definicoes');
  const sb = await createServerSupabase();
  const [{ data }, { count: walletCards }] = await Promise.all([
    sb.from('profiles').select('bio, wallet_points_alerts').eq('id', me.id).single(),
    sb.from('wallet_passes').select('id', { count: 'exact', head: true }).eq('voided', false),
  ]);
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Definições</h1>
      <SettingsForms
        profile={{ displayName: me.displayName, handle: me.handle ?? '', city: me.city ?? '', bio: data?.bio ?? '' }}
        consents={{
          location: Boolean(me.consents.location),
          push: Boolean(me.consents.push),
          ads_personalization: Boolean(me.consents.ads_personalization),
          personalization: Boolean(me.consents.personalization),
        }}
      />
      {walletCards ? <WalletAlertsToggle initial={data?.wallet_points_alerts !== false} /> : null}
    </div>
  );
}
