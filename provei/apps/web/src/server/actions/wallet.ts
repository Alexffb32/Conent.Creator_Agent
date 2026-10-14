'use server';
import 'server-only';
import { z } from 'zod';
import { uuidSchema } from '@provei/api-client';
import { getFlags } from '@/lib/flags';
import { createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireUserForAction } from '../auth';
import { enforceRateLimit } from '../ratelimit';
import { getAppleProvider } from '../wallet/provider';
import { buildGoogleState, ensureApplePass, ensureWalletPass } from '../wallet/passes';
import { getGoogleProvider, googleSaveUrl } from '../wallet/google';
import { signDownload } from '../wallet/tokens';
import { pushForCustomer } from '../wallet/stores';

const schema = z.object({ restaurantId: uuidSchema, showFirstName: z.boolean().default(false) });

/** Devolve um URL de descarga assinado e temporário (5 min) para o cartão Apple deste restaurante. Só com sessão. */
export async function getAppleWalletLink(input: unknown): Promise<ActionResult<{ url: string; simulated: boolean }>> {
  return run(async () => {
    const v = parse(schema, input);
    const me = await requireUserForAction();
    await enforceRateLimit(`wallet:link:${me.id}`, 3600, 20);
    const flags = await getFlags(v.restaurantId);
    const provider = getAppleProvider();
    if (!flags.wallet_apple || !provider.isConfigured()) throw new UserError('O cartão na Apple Wallet ainda não está disponível neste restaurante.');
    const svc = createServiceSupabase();
    const { data: r } = await svc.from('restaurants').select('id, plan, verified_status, deleted_at').eq('id', v.restaurantId).maybeSingle();
    if (!r || r.verified_status !== 'verified' || r.deleted_at) throw new UserError('Restaurante indisponível.');
    if (r.plan !== 'paid') throw new UserError('O cartão na Wallet faz parte do plano pago do restaurante.');
    const pass = await ensureApplePass(me.id, v.restaurantId, { showFirstName: v.showFirstName }, svc);
    return { url: `/api/wallet/apple/download?t=${encodeURIComponent(signDownload(pass.id))}`, simulated: provider.simulated };
  });
}

/** Interruptor "avisos de pontos" (aviso de serviço). Regenera os cartões do cliente sem/com changeMessage. */
export async function setWalletPointsAlerts(on: boolean): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    await enforceRateLimit(`wallet:alerts:${me.id}`, 3600, 30);
    const svc = createServiceSupabase();
    const { error } = await svc.from('profiles').update({ wallet_points_alerts: Boolean(on) }).eq('id', me.id);
    if (error) throw new Error(error.message);
    // qualquer valor diferente faz o gatilho dar uma etiqueta nova da sequência
    await svc.from('wallet_passes').update({ update_tag: 0 }).eq('customer_id', me.id).eq('voided', false);
    await pushForCustomer(me.id);
    return undefined;
  });
}

/** Cria o cartão Google (classe do restaurante + objeto do cliente na API) e devolve a ligação "Adicionar à Google Wallet". */
export async function getGoogleWalletLink(input: unknown): Promise<ActionResult<{ url: string | null; simulated: boolean; preview: unknown }>> {
  return run(async () => {
    const v = parse(schema, input);
    const me = await requireUserForAction();
    await enforceRateLimit(`wallet:glink:${me.id}`, 3600, 20);
    const flags = await getFlags(v.restaurantId);
    const provider = getGoogleProvider();
    if (!flags.wallet_google || !provider) throw new UserError('O cartão na Google Wallet ainda não está disponível neste restaurante.');
    const svc = createServiceSupabase();
    const { data: r } = await svc.from('restaurants').select('id, plan, verified_status, deleted_at').eq('id', v.restaurantId).maybeSingle();
    if (!r || r.verified_status !== 'verified' || r.deleted_at) throw new UserError('Restaurante indisponível.');
    if (r.plan !== 'paid') throw new UserError('O cartão na Wallet faz parte do plano pago do restaurante.');
    const pass = await ensureWalletPass('google', me.id, v.restaurantId, { showFirstName: v.showFirstName }, svc);
    const st = await buildGoogleState(pass.id, provider.issuerId, svc);
    if (!st) throw new UserError('Cartão indisponível.');
    try {
      await provider.upsertClass(st.cls);
      await provider.upsertObject(st.obj);
    } catch {
      throw new UserError('A Google Wallet não respondeu. Tenta daqui a pouco.');
    }
    await svc.from('wallet_passes').update({ pushed_tag: st.row.update_tag, pushed_points: st.points }).eq('id', pass.id).eq('update_tag', st.row.update_tag);
    return { url: provider.simulated ? null : googleSaveUrl(st.obj.id, st.cls.id), simulated: provider.simulated, preview: provider.simulated ? st.obj : null };
  });
}
