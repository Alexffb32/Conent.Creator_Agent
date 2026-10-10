'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { adCampaignSchema, uuidSchema } from '@provei/api-client';
import { FLAG_KEYS } from '@/lib/flags';
import { createServiceSupabase } from '@/lib/supabase/server';
import { z } from 'zod';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireAdminForAction } from '../auth';
import { audit } from '../audit';
import { sanitizeText } from '@provei/domain';

export async function verifyRestaurant(restaurantId: string, decision: 'verified' | 'rejected'): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    parse(uuidSchema, restaurantId);
    const svc = createServiceSupabase();
    const { error } = await svc.from('restaurants').update({ verified_status: decision }).eq('id', restaurantId);
    if (error) throw new Error(error.message);
    await audit({ actorId: admin.id, action: `restaurant.${decision}`, entity: 'restaurant', entityId: restaurantId, restaurantId });
    revalidatePath('/admin/restaurantes');
    revalidatePath('/');
    return undefined;
  });
}

export async function moderateTarget(input: { reportId: string; targetType: 'review' | 'post' | 'restaurant' | 'user'; targetId: string; action: 'remove' | 'dismiss' }): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    const v = parse(z.object({ reportId: uuidSchema, targetType: z.enum(['review', 'post', 'restaurant', 'user']), targetId: uuidSchema, action: z.enum(['remove', 'dismiss']) }), input);
    const svc = createServiceSupabase();
    if (v.action === 'remove') {
      if (v.targetType === 'review') await svc.from('reviews').update({ status: 'removed' }).eq('id', v.targetId);
      else if (v.targetType === 'post') await svc.from('posts').update({ status: 'removed' }).eq('id', v.targetId);
      else if (v.targetType === 'user') await svc.from('profiles').update({ suspended_at: new Date().toISOString() }).eq('id', v.targetId);
      else if (v.targetType === 'restaurant') await svc.from('restaurants').update({ verified_status: 'rejected' }).eq('id', v.targetId);
    }
    await svc.from('reports').update({ status: v.action === 'remove' ? 'resolved' : 'dismissed', resolved_by: admin.id }).eq('id', v.reportId);
    await audit({ actorId: admin.id, action: `moderation.${v.action}`, entity: v.targetType, entityId: v.targetId, meta: { reportId: v.reportId } });
    revalidatePath('/admin/moderacao');
    return undefined;
  });
}

export async function setUserSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    parse(uuidSchema, userId);
    if (userId === admin.id) throw new UserError('Não podes suspender a tua própria conta.');
    await createServiceSupabase().from('profiles').update({ suspended_at: suspended ? new Date().toISOString() : null }).eq('id', userId);
    await audit({ actorId: admin.id, action: suspended ? 'user.suspend' : 'user.unsuspend', entity: 'user', entityId: userId });
    revalidatePath('/admin/utilizadores');
    return undefined;
  });
}

export async function setGlobalFlag(key: string, enabled: boolean): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    if (!(FLAG_KEYS as readonly string[]).includes(key)) throw new UserError('Flag desconhecida.');
    await createServiceSupabase().from('feature_flags').update({ enabled, updated_at: new Date().toISOString() }).eq('key', key);
    await audit({ actorId: admin.id, action: 'flag.set', entity: 'flag', entityId: key, meta: { enabled } });
    revalidatePath('/admin/flags');
    return undefined;
  });
}

export async function setRestaurantFlag(restaurantId: string, key: string, enabled: boolean | null): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    parse(uuidSchema, restaurantId);
    if (!(FLAG_KEYS as readonly string[]).includes(key)) throw new UserError('Flag desconhecida.');
    const svc = createServiceSupabase();
    if (enabled === null) await svc.from('restaurant_flags').delete().eq('restaurant_id', restaurantId).eq('key', key);
    else await svc.from('restaurant_flags').upsert({ restaurant_id: restaurantId, key, enabled });
    await audit({ actorId: admin.id, action: 'flag.restaurant', entity: 'flag', entityId: key, restaurantId, meta: { enabled } });
    revalidatePath('/admin/flags');
    return undefined;
  });
}

/** Sem Stripe (flag payments desligada) o admin ativa o plano pago à mão, com auditoria. */
export async function setRestaurantPlan(restaurantId: string, plan: 'free' | 'paid', note: string): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    parse(uuidSchema, restaurantId);
    if (note.trim().length < 3) throw new UserError('Indica uma nota (ex.: pago em dinheiro na instalação).');
    const svc = createServiceSupabase();
    await svc.from('restaurants').update({ plan, plan_since: plan === 'paid' ? new Date().toISOString() : null }).eq('id', restaurantId);
    if (plan === 'paid') {
      await svc.from('subscriptions').insert({ restaurant_id: restaurantId, plan: 'paid', status: 'manual' });
      await svc.from('install_fees').insert({ restaurant_id: restaurantId, amount_cents: 0, status: 'manual' });
    }
    await audit({ actorId: admin.id, action: 'plan.manual', entity: 'restaurant', entityId: restaurantId, restaurantId, meta: { plan, note: sanitizeText(note) } });
    revalidatePath('/admin/planos');
    return undefined;
  });
}

export async function createAdCampaign(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    const v = parse(adCampaignSchema, input);
    if (v.endsAt <= v.startsAt) throw new UserError('A data de fim tem de ser depois do início.');
    const { error } = await createServiceSupabase().from('ad_campaigns').insert({
      advertiser_name: sanitizeText(v.advertiserName),
      creative: { headline: sanitizeText(v.headline), body: sanitizeText(v.body), url: v.url ?? null },
      targeting: { cities: v.cities, hours: v.hours, interests: v.interests },
      budget_cents: Math.round(v.budgetEuros * 100),
      status: 'draft',
      starts_at: v.startsAt.toISOString(),
      ends_at: v.endsAt.toISOString(),
    });
    if (error) throw new Error(error.message);
    await audit({ actorId: admin.id, action: 'ad.create', entity: 'ad_campaign', meta: { advertiser: v.advertiserName } });
    revalidatePath('/admin/anuncios');
    return undefined;
  });
}

export async function setCampaignStatus(id: string, status: 'active' | 'paused' | 'ended'): Promise<ActionResult> {
  return run(async () => {
    const admin = await requireAdminForAction();
    parse(uuidSchema, id);
    await createServiceSupabase().from('ad_campaigns').update({ status }).eq('id', id);
    await audit({ actorId: admin.id, action: `ad.${status}`, entity: 'ad_campaign', entityId: id });
    revalidatePath('/admin/anuncios');
    return undefined;
  });
}
