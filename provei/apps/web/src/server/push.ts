import 'server-only';
import webpush from 'web-push';
import { createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { getFlags } from '@/lib/flags';

export function pushConfigured(): boolean {
  const v = serverEnv.vapid;
  return Boolean(v.publicKey && v.privateKey);
}

/** Web Push com VAPID. Sem chaves ou sem flag fica só a notificação dentro da app. */
export async function sendPush(userIds: string[], payload: { title: string; body: string; url?: string }) {
  if (!pushConfigured() || userIds.length === 0) return 0;
  if (!(await getFlags()).web_push) return 0;
  const v = serverEnv.vapid;
  webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
  const svc = createServiceSupabase();
  const { data: users } = await svc.from('profiles').select('id, consents').in('id', userIds);
  const allowed = (users ?? []).filter((u) => (u.consents as Record<string, boolean>)?.push).map((u) => u.id);
  if (allowed.length === 0) return 0;
  const { data: subs } = await svc.from('push_subscriptions').select('id, endpoint, keys').in('user_id', allowed);
  let sent = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, JSON.stringify(payload), { TTL: 3600 });
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await svc.from('push_subscriptions').delete().eq('id', s.id);
      }
    }),
  );
  return sent;
}
