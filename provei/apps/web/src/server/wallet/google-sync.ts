import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { buildGoogleState } from './passes';
import type { GoogleWalletProvider } from './google';

type Svc = ReturnType<typeof createServiceSupabase>;

export interface GoogleSyncReport {
  synced: number;
  notified: number;
  quotaFallback: number;
  errors: number;
  skippedFlagOff: number;
}

/**
 * Sincroniza com a Google os cartões Google com alterações (pontos, oferta, anulação).
 * Aviso de pontos só se o saldo mudou e o cliente tem os avisos ligados; acima de 3 em 24 h fica sem aviso.
 * Anulações seguem sempre (cartão INACTIVE), mesmo com `wallet_updates` desligada.
 */
export async function syncGooglePasses(provider: GoogleWalletProvider, svc: Svc = createServiceSupabase(), passIds?: string[]): Promise<GoogleSyncReport> {
  const rep: GoogleSyncReport = { synced: 0, notified: 0, quotaFallback: 0, errors: 0, skippedFlagOff: 0 };
  let pending: { id: string; update_tag: number }[];
  if (passIds?.length) {
    const { data } = await svc.from('wallet_passes').select('id, update_tag, pushed_tag').eq('platform', 'google').in('id', passIds);
    pending = (data ?? []).filter((r) => Number(r.update_tag) > Number(r.pushed_tag)).map((r) => ({ id: r.id as string, update_tag: Number(r.update_tag) }));
  } else {
    const { data } = await svc.rpc('wallet_pending_sync', { p_platform: 'google', p_limit: 200 });
    pending = ((data ?? []) as { id: string; update_tag: number }[]).map((r) => ({ id: r.id, update_tag: Number(r.update_tag) }));
  }
  for (const p of pending) {
    const st = await buildGoogleState(p.id, provider.issuerId, svc);
    if (!st) continue;
    if (!st.updatesEnabled && !st.row.voided) {
      rep.skippedFlagOff++;
      continue;
    }
    const log = (status: 'sent' | 'error' | 'skipped', reason?: string) =>
      svc.from('wallet_push_events').insert({ platform: 'google', pass_id: p.id, status: provider.simulated && status === 'sent' ? 'skipped' : status, reason: provider.simulated && status === 'sent' ? 'simulado' : reason ?? null });
    try {
      const { data: prev } = await svc.from('wallet_passes').select('pushed_points').eq('id', p.id).single();
      const pointsChanged = !st.row.voided && prev?.pushed_points !== st.points;
      // conteúdo sem aviso; se o saldo mudou, vai à parte (senão a Google não vê mudança e não avisa)
      const { loyaltyPoints, ...rest } = st.obj;
      await provider.upsertObject(pointsChanged ? rest : { ...rest, loyaltyPoints });
      if (pointsChanged) {
        const out = await provider.updatePoints(st.obj.id, st.points, st.pointsAlerts);
        if (out === 'notified') rep.notified++;
        if (out === 'quota_fallback') {
          rep.quotaFallback++;
          await log('sent', 'quota: atualizado sem aviso');
        } else await log('sent');
      } else await log('sent');
      await svc.from('wallet_passes').update({ pushed_tag: p.update_tag, pushed_points: st.points }).eq('id', p.id).eq('update_tag', p.update_tag);
      rep.synced++;
    } catch (e) {
      rep.errors++;
      await log('error', (e as Error).message.slice(0, 120));
    }
  }
  return rep;
}
