import type { Metadata } from 'next';
import { Badge, Card } from '@/components/ui';
import { InviteForm, RemoveStaffButton, UnignoreButton } from '@/components/admin/forms';
import { requireMemberPage } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Equipa' };
export const dynamic = 'force-dynamic';

export default async function EquipaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireMemberPage(slug, ['owner']);
  const sb = await createServerSupabase();
  const [{ data: members }, { data: invites }, { data: ignored }] = await Promise.all([
    sb.from('restaurant_members').select('user_id, role').eq('restaurant_id', ctx.restaurant.id),
    sb.from('restaurant_invites').select('id, email, accepted_at').eq('restaurant_id', ctx.restaurant.id).is('accepted_at', null),
    sb.from('restaurant_user_blocks').select('user_id, kind, until').eq('restaurant_id', ctx.restaurant.id),
  ]);
  const ids = [...new Set([...(members ?? []).map((m) => m.user_id), ...(ignored ?? []).map((m) => m.user_id)])];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await sb.from('public_profiles').select('id, display_name, handle').in('id', ids);
    for (const p of ps ?? []) names.set(p.id, `${p.display_name || 'Utilizador'} (@${p.handle})`);
  }
  return (
    <div className="flex flex-col gap-5">
      <h1 className="pv-title text-4xl text-verde-escuro">Equipa</h1>
      <p className="text-tinta-2">A equipa vê as chamadas de mesa e valida visitas e resgates. Não gere planos nem dados sensíveis.</p>
      <Card><InviteForm restaurantId={ctx.restaurant.id} /></Card>
      <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
        {(members ?? []).map((m) => (
          <li key={m.user_id} className="flex items-center justify-between px-4 py-3"><span>{names.get(m.user_id) ?? 'Membro'}</span><span className="flex items-center gap-2"><Badge tone="neutro">{m.role === 'owner' ? 'Dono' : 'Equipa'}</Badge>{m.role === 'staff' ? <RemoveStaffButton restaurantId={ctx.restaurant.id} userId={m.user_id} /> : null}</span></li>
        ))}
        {(invites ?? []).map((i) => (
          <li key={i.id} className="flex items-center justify-between px-4 py-3"><span>{i.email}</span><span className="flex items-center gap-2"><Badge tone="amarelo">Convite pendente</Badge><RemoveStaffButton restaurantId={ctx.restaurant.id} userId={i.id} invite /></span></li>
        ))}
      </ul>
      {(ignored ?? []).length > 0 ? (
        <section aria-labelledby="bloq" className="flex flex-col gap-2">
          <h2 id="bloq" className="pv-title text-2xl text-verde-escuro">Clientes ignorados ou bloqueados</h2>
          <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
            {(ignored ?? []).map((b) => <li key={`${b.user_id}${b.kind}`} className="flex items-center justify-between px-4 py-3"><span>{names.get(b.user_id) ?? 'Utilizador'} · {b.kind === 'ignored' ? 'ignorado' : 'bloqueado 24 h'}</span>{b.kind === 'ignored' ? <UnignoreButton restaurantId={ctx.restaurant.id} userId={b.user_id} /> : null}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
