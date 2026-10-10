'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { inviteSchema, loyaltyProgramSchema, menuCategorySchema, menuItemSchema, offerSchema, uuidSchema } from '@provei/api-client';
import { DEFAULT_PLAN_LIMITS, LIMIT_MESSAGES, sanitizeText } from '@provei/domain';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { publicEnv } from '@/lib/env';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireMemberForAction } from '../auth';
import { audit } from '../audit';
import { escapeHtml, getMailer } from '../mail';

export async function addMenuCategory(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(menuCategorySchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const { count } = await sb.from('menu_categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', v.restaurantId);
    const { error } = await sb.from('menu_categories').insert({ restaurant_id: v.restaurantId, name: sanitizeText(v.name), position: count ?? 0 });
    if (error) throw new Error(error.message);
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function addMenuItem(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(menuItemSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const { error } = await sb.from('menu_items').insert({
      restaurant_id: v.restaurantId,
      category_id: v.categoryId ?? null,
      name: sanitizeText(v.name),
      description: sanitizeText(v.description) || null,
      price_cents: Math.round(v.priceEuros * 100),
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<ActionResult> {
  return run(async () => {
    parse(uuidSchema, itemId);
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    await sb.from('menu_items').delete().eq('id', itemId).eq('restaurant_id', restaurantId);
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function addOffer(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(offerSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    if (!DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].offers) throw new UserError(LIMIT_MESSAGES.offers);
    if (v.endsAt <= new Date()) throw new UserError('A data de fim tem de ser no futuro.', 'endsAt');
    const sb = await createServerSupabase();
    const { error } = await sb.from('offers').insert({ restaurant_id: v.restaurantId, title: sanitizeText(v.title), description: sanitizeText(v.description) || null, ends_at: v.endsAt.toISOString() });
    if (error) throw new UserError(error.message.includes('plano pago') ? LIMIT_MESSAGES.offers : 'Não foi possível criar a oferta.');
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function removeOffer(restaurantId: string, offerId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    await sb.from('offers').delete().eq('id', offerId).eq('restaurant_id', restaurantId);
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

export async function saveLoyaltyProgram(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(loyaltyProgramSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const free = ctx.restaurant.plan === 'free';
    // plano gratuito: cartão de carimbos simples (sem pontos extra)
    const row = {
      restaurant_id: v.restaurantId,
      stamps_required: v.stampsRequired,
      reward_text: sanitizeText(v.rewardText),
      points_per_visit: free ? 10 : v.pointsPerVisit,
      points_per_review_photo: free ? 0 : v.pointsPerReviewPhoto,
      points_first_visit: free ? 0 : v.pointsFirstVisit,
      min_interval_hours: v.minIntervalHours,
      active: v.active,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from('loyalty_programs').upsert(row);
    if (error) throw new Error(error.message);
    await audit({ actorId: ctx.me.id, action: 'loyalty.program', entity: 'restaurant', entityId: v.restaurantId, restaurantId: v.restaurantId, meta: row });
    revalidatePath(`/r/${ctx.restaurant.slug}`, 'layout');
    return undefined;
  });
}

/** Convidar staff por e-mail. Se a pessoa já tem conta fica logo na equipa; senão fica o convite pendente. */
export async function inviteStaff(input: unknown): Promise<ActionResult<{ added: boolean }>> {
  return run(async () => {
    const v = parse(inviteSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const svc = createServiceSupabase();
    const { data: users } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = users?.users.find((u) => u.email?.toLowerCase() === v.email);
    let added = false;
    if (existing) {
      const { error } = await svc.from('restaurant_members').upsert({ restaurant_id: v.restaurantId, user_id: existing.id, role: 'staff' }, { onConflict: 'restaurant_id,user_id', ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      added = true;
    } else {
      const { error } = await svc.from('restaurant_invites').upsert({ restaurant_id: v.restaurantId, email: v.email, invited_by: ctx.me.id }, { onConflict: 'restaurant_id,email' });
      if (error) throw new Error(error.message);
    }
    await getMailer().send({
      to: v.email,
      subject: `${ctx.restaurant.name} convidou-te para a equipa no Provei`,
      text: `Foste convidado para a equipa de ${ctx.restaurant.name}. Entra em ${publicEnv.siteUrl}/entrar com este e-mail para aceitares.`,
      html: `<p>Foste convidado para a equipa de <strong>${escapeHtml(ctx.restaurant.name)}</strong>.</p><p><a href="${publicEnv.siteUrl}/entrar">Entrar no Provei</a> com este e-mail para aceitares.</p>`,
    });
    await audit({ actorId: ctx.me.id, action: 'team.invite', entity: 'restaurant', entityId: v.restaurantId, restaurantId: v.restaurantId, meta: { email: v.email, added } });
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/equipa`);
    return { added };
  });
}

export async function removeStaff(restaurantId: string, userId: string): Promise<ActionResult> {
  return run(async () => {
    parse(uuidSchema, userId);
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    await sb.from('restaurant_members').delete().eq('restaurant_id', restaurantId).eq('user_id', userId).eq('role', 'staff');
    await audit({ actorId: ctx.me.id, action: 'team.remove', entity: 'user', entityId: userId, restaurantId });
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/equipa`);
    return undefined;
  });
}

export async function cancelInvite(restaurantId: string, inviteId: string): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    await sb.from('restaurant_invites').delete().eq('id', inviteId).eq('restaurant_id', restaurantId);
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/equipa`);
    return undefined;
  });
}
