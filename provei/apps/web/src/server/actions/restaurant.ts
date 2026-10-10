'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { restaurantCreateSchema, restaurantUpdateSchema, hoursSchema } from '@provei/api-client';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireMemberForAction, requireUserForAction } from '../auth';
import { audit } from '../audit';
import { enforceRateLimit } from '../ratelimit';

const RESERVED = new Set(['novo', 'admin', 'api', 'novo-restaurante']);

export async function createRestaurant(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const res = await run(async () => {
    const me = await requireUserForAction();
    const v = parse(restaurantCreateSchema, input);
    if (RESERVED.has(v.slug)) throw new UserError('Esse endereço não está disponível.', 'slug');
    await enforceRateLimit(`restcreate:${me.id}`, 86400, 3);
    const svc = createServiceSupabase();
    const { data, error } = await svc
      .from('restaurants')
      .insert({ slug: v.slug, name: v.name, city: v.city, address: v.address || null, phone: v.phone || null, lat: v.lat ?? null, lng: v.lng ?? null })
      .select('id, slug')
      .single();
    if (error) {
      if (error.code === '23505') throw new UserError('Esse endereço já está a ser usado. Escolhe outro.', 'slug');
      throw new Error(error.message);
    }
    await svc.from('restaurant_members').insert({ restaurant_id: data.id, user_id: me.id, role: 'owner' });
    await svc.from('loyalty_programs').insert({ restaurant_id: data.id });
    await audit({ actorId: me.id, action: 'restaurant.create', entity: 'restaurant', entityId: data.id, restaurantId: data.id });
    return { slug: data.slug };
  });
  if (res.ok) redirect(`/r/${res.data.slug}/admin?novo=1`);
  return res;
}

export async function updateRestaurant(restaurantId: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const v = parse(restaurantUpdateSchema, input);
    const sb = await createServerSupabase();
    const { error } = await sb
      .from('restaurants')
      .update({
        name: v.name,
        description: v.description || null,
        address: v.address || null,
        city: v.city,
        phone: v.phone || null,
        website: v.website || null,
        cuisine: v.cuisine,
        price_level: v.priceLevel ?? null,
        lat: v.lat ?? null,
        lng: v.lng ?? null,
      })
      .eq('id', restaurantId);
    if (error) throw new Error(error.message);
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function updateHours(restaurantId: string, hours: unknown): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const v = parse(hoursSchema, hours);
    const sb = await createServerSupabase();
    const { error } = await sb.from('restaurants').update({ hours: v }).eq('id', restaurantId);
    if (error) throw new Error(error.message);
    revalidatePath(`/r/${ctx.restaurant.slug}`);
    return undefined;
  });
}
