import type { Metadata } from 'next';
import Link from 'next/link';
import { Settings, Store, LogOut, Trophy } from 'lucide-react';
import { DEFAULT_LEVELS, nextLevel } from '@provei/domain';
import { Avatar, Badge, Button, Card, CardTitle, EmptyState, LinkButton } from '@/components/ui';
import { getMyRestaurants, requireUser } from '@/server/auth';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/media';

export const metadata: Metadata = { title: 'O meu perfil' };
export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const me = await requireUser('/perfil');
  const sb = await createServerSupabase();
  const [visits, restaurants, { count }] = await Promise.all([
    sb.from('visits').select('id, verified_at, level, points_awarded, restaurants(name, slug)').eq('user_id', me.id).order('verified_at', { ascending: false }).limit(20),
    getMyRestaurants(),
    sb.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', me.id),
  ]);
  const level = DEFAULT_LEVELS.find((l) => l.key === me.level) ?? DEFAULT_LEVELS[0]!;
  const next = nextLevel({ visits: count ?? 0, points: me.pointsTotal });
  return (
    <div className="pv-container flex max-w-2xl flex-col gap-5 pt-5">
      <header className="flex items-center gap-4">
        <Avatar name={me.displayName || 'Eu'} size={64} />
        <div className="min-w-0">
          <h1 className="pv-title truncate text-3xl text-verde-escuro">{me.displayName}</h1>
          <p className="text-tinta-2">@{me.handle} · {me.city}</p>
        </div>
      </header>
      <Card className="flex flex-col gap-2 border-amarelo bg-amarelo-tinta">
        <div className="flex items-center gap-2"><Trophy aria-hidden /><CardTitle className="text-2xl">{level.label}</CardTitle></div>
        <p>{me.pointsTotal} pontos · {count ?? 0} {(count ?? 0) === 1 ? 'visita' : 'visitas'}</p>
        {next ? <p className="text-sm text-tinta-2">Para {next.level.label}: faltam {next.visitsMissing} visitas ou {next.pointsMissing} pontos.</p> : <p className="text-sm">Chegaste ao nível mais alto. Obrigado!</p>}
      </Card>
      <div className="flex flex-wrap gap-3">
        <LinkButton href="/perfil/definicoes" variant="secondary"><Settings size={18} aria-hidden /> Definições</LinkButton>
        <LinkButton href="/guardados" variant="secondary">Guardados</LinkButton>
        <LinkButton href="/cartao" variant="secondary">Cartões</LinkButton>
        {me.isAdmin ? <LinkButton href="/admin" variant="accent">Administração</LinkButton> : null}
      </div>
      <section aria-labelledby="meus-restaurantes" className="flex flex-col gap-2">
        <h2 id="meus-restaurantes" className="pv-title text-2xl text-verde-escuro">Modo restaurante</h2>
        {restaurants.length === 0 ? (
          <Card className="flex flex-col gap-3">
            <p>Tens um restaurante? Cria o perfil, publica pratos e recebe clientes que voltam.</p>
            <LinkButton href="/restaurante/novo"><Store size={18} aria-hidden /> Criar o meu restaurante</LinkButton>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {restaurants.map((r) => (
              <li key={r.id}>
                <Link href={`/r/${r.slug}/admin`} className="flex min-h-touch items-center justify-between rounded-m border border-linha bg-branco px-4 py-3">
                  <span className="font-semibold">{r.name}</span>
                  <span className="flex gap-2">{r.verified_status === 'pending' ? <Badge tone="amarelo">Em verificação</Badge> : null}<Badge tone="neutro">{r.role === 'owner' ? 'Dono' : 'Equipa'}</Badge></span>
                </Link>
              </li>
            ))}
            <li><LinkButton href="/restaurante/novo" variant="ghost" size="sm">Adicionar outro restaurante</LinkButton></li>
          </ul>
        )}
      </section>
      <section aria-labelledby="historico" className="flex flex-col gap-2">
        <h2 id="historico" className="pv-title text-2xl text-verde-escuro">Histórico de visitas</h2>
        {(visits.data ?? []).length === 0 ? (
          <EmptyState title="Ainda sem visitas" description="Lê o QR da mesa num restaurante para começares a ganhar pontos." />
        ) : (
          <ul className="flex flex-col gap-2">
            {(visits.data ?? []).map((v) => {
              const r = v.restaurants as unknown as { name: string; slug: string } | null;
              return (
                <li key={v.id} className="flex items-center justify-between rounded-m border border-linha bg-branco px-4 py-3">
                  <div><p className="font-semibold">{r?.name}</p><time className="text-sm text-tinta-2" dateTime={v.verified_at}>{formatDateTime(v.verified_at)}</time></div>
                  <Badge tone="amarelo">+{v.points_awarded} pts</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <form action="/auth/signout" method="post"><Button variant="ghost" type="submit"><LogOut size={18} aria-hidden /> Sair</Button></form>
    </div>
  );
}
