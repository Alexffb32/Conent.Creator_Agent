'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { uuidSchema } from '@provei/api-client';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireUserForAction } from '../auth';
import { enforceRateLimit } from '../ratelimit';
import { getFeed, type FeedTab } from '../feed';
import type { FeedPage } from '@provei/api-client';

export async function toggleFollow(restaurantId: string): Promise<ActionResult<{ following: boolean }>> {
  return run(async () => {
    const me = await requireUserForAction();
    parse(uuidSchema, restaurantId);
    await enforceRateLimit(`follow:${me.id}`, 60, 30);
    const sb = await createServerSupabase();
    const { data: existing } = await sb.from('follows').select('user_id').eq('user_id', me.id).eq('restaurant_id', restaurantId).maybeSingle();
    if (existing) {
      const { error } = await sb.from('follows').delete().eq('user_id', me.id).eq('restaurant_id', restaurantId);
      if (error) throw new Error(error.message);
      return { following: false };
    }
    const { error } = await sb.from('follows').insert({ user_id: me.id, restaurant_id: restaurantId });
    if (error) throw new UserError('Não foi possível seguir este restaurante.');
    await createServiceSupabase().rpc('bump_event', { p_restaurant: restaurantId, p_type: 'follow' });
    revalidatePath('/');
    return { following: true };
  });
}

export async function toggleSave(postId: string): Promise<ActionResult<{ saved: boolean }>> {
  return run(async () => {
    const me = await requireUserForAction();
    parse(uuidSchema, postId);
    await enforceRateLimit(`save:${me.id}`, 60, 60);
    const sb = await createServerSupabase();
    const { data: existing } = await sb.from('saves').select('user_id').eq('user_id', me.id).eq('post_id', postId).maybeSingle();
    if (existing) {
      const { error } = await sb.from('saves').delete().eq('user_id', me.id).eq('post_id', postId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await sb.from('saves').insert({ user_id: me.id, post_id: postId });
    if (error) throw new UserError('Não foi possível guardar este prato.');
    const { data: post } = await sb.from('posts').select('restaurant_id').eq('id', postId).maybeSingle();
    if (post) await createServiceSupabase().rpc('bump_event', { p_restaurant: post.restaurant_id, p_type: 'save' });
    revalidatePath('/guardados');
    return { saved: true };
  });
}

export async function loadFeedPage(tab: FeedTab, cursor: string | null): Promise<ActionResult<FeedPage>> {
  return run(() => getFeed({ tab: tab === 'perto' ? 'perto' : 'para-ti', cursor }));
}
