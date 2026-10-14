import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';
import { Card, CardTitle, EmptyState } from '@/components/ui';
import { requireUser } from '@/server/auth';
import { getFlags } from '@/lib/flags';
import { createServerSupabase } from '@/lib/supabase/server';
import { AdvertiserForm } from './AdvertiserForm';

export const metadata: Metadata = { title: 'Anunciantes', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AnunciantePage() {
  const me = await requireUser('/anunciante');
  const flags = await getFlags();
  if (!flags.ads) {
    return (
      <div className="pv-container max-w-2xl pt-6">
        <EmptyState icon={<Megaphone size={40} />} title="Os anúncios ainda não estão disponíveis" description="Quando abrirmos os anúncios no Provei, podes criar aqui a tua conta de anunciante." />
      </div>
    );
  }
  const sb = await createServerSupabase();
  const { data: accounts } = await sb.from('advertisers').select('id, name, status, created_at').order('created_at');
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Conta de anunciante</h1>
      <p className="text-tinta-2">
        Os anunciantes veem só números agregados das suas campanhas (impressões e cliques). Nunca recebem dados pessoais dos clientes do Provei.
      </p>
      {(accounts ?? []).length ? (
        <ul className="flex flex-col gap-2">
          {(accounts ?? []).map((a) => (
            <li key={a.id}><Card className="flex items-center justify-between"><span className="font-semibold">{a.name}</span><span className="text-sm text-tinta-2">{a.status === 'active' ? 'Ativa' : 'Suspensa'}</span></Card></li>
          ))}
        </ul>
      ) : null}
      <Card className="flex flex-col gap-3">
        <CardTitle>{(accounts ?? []).length ? 'Criar outra conta' : 'Criar conta de anunciante'}</CardTitle>
        <AdvertiserForm defaultEmail={me.email ?? ''} />
      </Card>
    </div>
  );
}
