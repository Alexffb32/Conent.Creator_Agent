'use server';
import 'server-only';
import { pushSubscriptionSchema } from '@provei/api-client';
import { createServerSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run } from '../action';
import { requireUserForAction } from '../auth';

export async function markAllRead(): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const sb = await createServerSupabase();
    await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', me.id).is('read_at', null);
    return undefined;
  });
}

export async function savePushSubscription(input: unknown, ua: string): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(pushSubscriptionSchema, input);
    const sb = await createServerSupabase();
    const { error } = await sb.from('push_subscriptions').upsert({ user_id: me.id, endpoint: v.endpoint, keys: v.keys, ua: ua.slice(0, 200) }, { onConflict: 'endpoint' });
    if (error) throw new Error(error.message);
    return undefined;
  });
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const sb = await createServerSupabase();
    await sb.from('push_subscriptions').delete().eq('user_id', me.id).eq('endpoint', endpoint);
    return undefined;
  });
}
