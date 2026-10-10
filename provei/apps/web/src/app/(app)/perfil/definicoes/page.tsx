import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { SettingsForms } from './SettingsForms';

export const metadata: Metadata = { title: 'Definições' };
export const dynamic = 'force-dynamic';

export default async function DefinicoesPage() {
  const me = await requireUser('/perfil/definicoes');
  const sb = await createServerSupabase();
  const { data } = await sb.from('profiles').select('bio').eq('id', me.id).single();
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Definições</h1>
      <SettingsForms
        profile={{ displayName: me.displayName, handle: me.handle ?? '', city: me.city ?? '', bio: data?.bio ?? '' }}
        consents={{
          location: Boolean(me.consents.location),
          push: Boolean(me.consents.push),
          ads_personalization: Boolean(me.consents.ads_personalization),
        }}
      />
    </div>
  );
}
