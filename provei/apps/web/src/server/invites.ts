import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';

/** Ao entrar, aceita convites de equipa pendentes para o e-mail do utilizador. */
export async function acceptPendingInvites(userId: string, email: string | null | undefined) {
  if (!email) return;
  const svc = createServiceSupabase();
  const { data: invites } = await svc.from('restaurant_invites').select('id, restaurant_id').ilike('email', email).is('accepted_at', null);
  for (const inv of invites ?? []) {
    await svc.from('restaurant_members').upsert({ restaurant_id: inv.restaurant_id, user_id: userId, role: 'staff' }, { onConflict: 'restaurant_id,user_id', ignoreDuplicates: true });
    await svc.from('restaurant_invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
  }
}
