import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { getFlags } from '@/lib/flags';
import { Http2ApnsTransport, SimulatedApnsTransport, type ApnsTransport } from './apns';
import { buildApplePassJson } from './passes';
import { appleCertificatesFromEnv, getAppleProvider } from './provider';
import { pushPendingUpdates, type PushStore } from './push';
import { getGoogleProvider } from './google';
import { syncGooglePasses } from './google-sync';
import type { WebServiceStore, WsPass } from './webservice';

type Svc = ReturnType<typeof createServiceSupabase>;

/** Máximo de dispositivos registados por cartão (o mais antigo sai). */
export const MAX_DEVICES_PER_PASS = 10;

export const passTypeId = () => serverEnv.wallet.appleTypeId || 'pass.pt.provei.simulado';

export function supabaseWebServiceStore(svc: Svc = createServiceSupabase()): WebServiceStore {
  return {
    passTypeIdentifier: passTypeId,
    async findPass(serial) {
      const { data } = await svc.from('wallet_passes').select('id, serial_number, auth_token_hash, update_tag, updated_at, voided').eq('platform', 'apple').eq('serial_number', serial).maybeSingle();
      if (!data) return null;
      return { id: data.id, serialNumber: data.serial_number, authTokenHash: data.auth_token_hash, updateTag: Number(data.update_tag), updatedAt: new Date(data.updated_at), voided: data.voided } satisfies WsPass;
    },
    async register(deviceId, passId, pushToken) {
      const { data: existing } = await svc.from('wallet_registrations').select('pass_id').eq('device_library_id', deviceId).eq('pass_id', passId).maybeSingle();
      // um registo por (dispositivo, cartão): o mais recente substitui o anterior. Nunca mexe noutros cartões.
      await svc.from('wallet_registrations').upsert({ device_library_id: deviceId, pass_id: passId, push_token: pushToken, updated_at: new Date().toISOString() }, { onConflict: 'device_library_id,pass_id' });
      if (!existing) {
        // limite de dispositivos por cartão: remove os mais antigos acima de MAX_DEVICES_PER_PASS
        const { data: regs } = await svc.from('wallet_registrations').select('device_library_id, updated_at').eq('pass_id', passId).order('updated_at', { ascending: false });
        const extra = (regs ?? []).slice(MAX_DEVICES_PER_PASS).map((r) => r.device_library_id as string);
        if (extra.length) await svc.from('wallet_registrations').delete().eq('pass_id', passId).in('device_library_id', extra);
      }
      return !existing;
    },
    async unregister(deviceId, passId) {
      await svc.from('wallet_registrations').delete().eq('device_library_id', deviceId).eq('pass_id', passId);
    },
    async updatedSince(deviceId, since) {
      let q = svc.from('wallet_registrations').select('wallet_passes!inner(serial_number, update_tag)').eq('device_library_id', deviceId);
      if (since != null) q = q.gt('wallet_passes.update_tag', since);
      const { data } = await q.limit(500);
      return (data ?? []).map((r) => {
        const p = r.wallet_passes as unknown as { serial_number: string; update_tag: number };
        return { serialNumber: p.serial_number, updateTag: Number(p.update_tag) };
      });
    },
    async renderPass(passId) {
      const built = await buildApplePassJson(passId, svc);
      if (!built) return null;
      const out = await getAppleProvider().render(built.pass);
      return { body: out.body, contentType: out.contentType };
    },
  };
}

export function supabasePushStore(svc: Svc = createServiceSupabase()): PushStore {
  return {
    async pending(passIds, limit = 200) {
      if (passIds?.length) {
        const { data } = await svc.from('wallet_passes').select('id, restaurant_id, update_tag, pushed_tag, voided').eq('platform', 'apple').in('id', passIds);
        return (data ?? []).filter((r) => Number(r.update_tag) > Number(r.pushed_tag)).map((r) => ({ id: r.id, restaurantId: r.restaurant_id, updateTag: Number(r.update_tag), voided: r.voided }));
      }
      // filtro feito em SQL antes do limite (anulados primeiro)
      const { data } = await svc.rpc('wallet_pending_pushes', { p_limit: limit });
      return ((data ?? []) as { id: string; restaurant_id: string; update_tag: number; voided: boolean }[]).map((r) => ({ id: r.id, restaurantId: r.restaurant_id, updateTag: Number(r.update_tag), voided: r.voided }));
    },
    async updatesEnabled(restaurantId) {
      return (await getFlags(restaurantId)).wallet_updates;
    },
    async registrations(passId) {
      const { data } = await svc.from('wallet_registrations').select('device_library_id, push_token').eq('pass_id', passId);
      return (data ?? []).map((r) => ({ deviceId: r.device_library_id, pushToken: r.push_token }));
    },
    async deleteRegistration(deviceId, passId) {
      await svc.from('wallet_registrations').delete().eq('device_library_id', deviceId).eq('pass_id', passId);
    },
    async deleteAllRegistrations(passId) {
      await svc.from('wallet_registrations').delete().eq('pass_id', passId);
    },
    async markPushed(passId, updateTag) {
      await svc.from('wallet_passes').update({ pushed_tag: updateTag }).eq('id', passId).eq('update_tag', updateTag);
    },
    async logEvent(e) {
      await svc.from('wallet_push_events').insert({ platform: 'apple', pass_id: e.passId, status: e.status, reason: e.reason ?? null });
    },
  };
}

/** APNs real só em produção e com certificados; caso contrário simulado (nada sai do servidor). */
export function getApnsTransport(): ApnsTransport {
  const certs = appleCertificatesFromEnv();
  if (certs && process.env.NODE_ENV === 'production') return new Http2ApnsTransport(certs);
  return new SimulatedApnsTransport();
}

/** Envia os pushes pendentes (todos, ou só destes cartões). Nunca rebenta o pedido que o chamou. */
export async function flushWalletPushes(passIds?: string[]) {
  const apns = getApnsTransport();
  try {
    return await pushPendingUpdates(supabasePushStore(), apns, passTypeId(), { passIds });
  } catch (e) {
    console.error('[wallet-push]', (e as Error).message);
    return null;
  } finally {
    apns.close();
  }
}

/** Depois de mudar pontos/oferta/definições de um cliente: envia já o push dos cartões dele (num restaurante ou em todos). */
export async function pushForCustomer(userId: string, restaurantId?: string) {
  try {
    const svc = createServiceSupabase();
    let q = svc.from('wallet_passes').select('id').eq('customer_id', userId).eq('platform', 'apple');
    if (restaurantId) q = q.eq('restaurant_id', restaurantId);
    const { data } = await q;
    if (data?.length) await flushWalletPushes(data.map((r) => r.id as string));
    const g = getGoogleProvider();
    let gq = svc.from('wallet_passes').select('id').eq('customer_id', userId).eq('platform', 'google');
    if (restaurantId) gq = gq.eq('restaurant_id', restaurantId);
    const { data: gp } = await gq;
    if (g && gp?.length) await syncGooglePasses(g, svc, gp.map((r) => r.id as string));
  } catch (e) {
    console.error('[wallet-push]', (e as Error).message);
  }
}

/** Limpeza diária: registos de cartões anulados há mais de 30 dias e eventos de push com mais de 90 dias. */
export async function walletMaintenance(svc: Svc = createServiceSupabase()) {
  const report = await flushWalletPushes();
  const g = getGoogleProvider();
  const google = g ? await syncGooglePasses(g, svc).catch((e: Error) => ({ error: e.message })) : null;
  const { data: old } = await svc.from('wallet_passes').select('id').eq('voided', true).lt('updated_at', new Date(Date.now() - 30 * 86400_000).toISOString()).limit(500);
  if (old?.length) await svc.from('wallet_registrations').delete().in('pass_id', old.map((r) => r.id as string));
  await svc.from('wallet_push_events').delete().lt('created_at', new Date(Date.now() - 90 * 86400_000).toISOString());
  return { push: report, google, voidedCleaned: old?.length ?? 0 };
}
