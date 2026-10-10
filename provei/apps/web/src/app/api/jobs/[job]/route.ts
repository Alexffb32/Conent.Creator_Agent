import { NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { expireCallsAndSessions } from '@/server/tables';
import { levelFor } from '@provei/domain';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function authorized(req: Request) {
  const secret = serverEnv.cronSecret;
  return Boolean(secret) && req.headers.get('authorization') === `Bearer ${secret}`;
}

/** Remove definitivamente contas apagadas há mais de N dias (RETENTION, por omissão 30). */
async function purgeDeleted(svc: ReturnType<typeof createServiceSupabase>) {
  const days = Number(process.env.ACCOUNT_RETENTION_DAYS ?? 30);
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await svc.from('profiles').select('id').lt('deleted_at', cutoff).limit(100);
  let n = 0;
  for (const p of data ?? []) {
    const { error } = await svc.auth.admin.deleteUser(p.id);
    if (!error) n += 1;
  }
  return n;
}

async function aggregate(svc: ReturnType<typeof createServiceSupabase>) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);
  const a = await svc.from('analytics_events').update({ user_id: null, payload: {} }).lt('ts', cutoff.toISOString()).not('user_id', 'is', null).select('id');
  const old = new Date(Date.now() - 2 * 86_400_000).toISOString();
  await svc.from('rate_limits').delete().lt('window_start', old);
  const reds = await svc.from('redemptions').update({ status: 'expired' }).eq('status', 'issued').lt('expires_at', new Date().toISOString()).select('id');
  await svc.from('ad_campaigns').update({ status: 'ended' }).eq('status', 'active').lt('ends_at', new Date().toISOString());
  return { anonymized: a.data?.length ?? 0, redemptionsExpired: reds.data?.length ?? 0 };
}

async function recalcLevels(svc: ReturnType<typeof createServiceSupabase>) {
  const { data: profiles } = await svc.from('profiles').select('id, points_total, level').is('deleted_at', null).limit(1000);
  let changed = 0;
  for (const p of profiles ?? []) {
    const { count } = await svc.from('visits').select('id', { count: 'exact', head: true }).eq('user_id', p.id);
    const level = levelFor({ visits: count ?? 0, points: p.points_total }).key;
    if (level !== p.level) {
      await svc.from('profiles').update({ level }).eq('id', p.id);
      changed += 1;
    }
  }
  return changed;
}

export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { job } = await params;
  const svc = createServiceSupabase();
  switch (job) {
    case 'expire':
      return NextResponse.json({ ok: true, ...(await expireCallsAndSessions(svc)) });
    case 'aggregate':
      return NextResponse.json({ ok: true, ...(await aggregate(svc)) });
    case 'purge':
      return NextResponse.json({ ok: true, purged: await purgeDeleted(svc) });
    case 'levels':
      return NextResponse.json({ ok: true, changed: await recalcLevels(svc) });
    case 'maintenance': {
      const expire = await expireCallsAndSessions(svc);
      const agg = await aggregate(svc);
      const purged = await purgeDeleted(svc);
      const changed = await recalcLevels(svc);
      return NextResponse.json({ ok: true, expire, agg, purged, changed });
    }
    default:
      return NextResponse.json({ error: 'Tarefa desconhecida' }, { status: 404 });
  }
}
