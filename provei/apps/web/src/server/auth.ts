import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { UserError } from './action';

export interface SessionProfile {
  id: string;
  email: string | null;
  displayName: string;
  handle: string | null;
  city: string | null;
  level: string;
  pointsTotal: number;
  isAdmin: boolean;
  isAdFree: boolean;
  onboarded: boolean;
  suspended: boolean;
  consents: Record<string, boolean>;
}

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: p } = await sb
    .from('profiles')
    .select('display_name, handle, city, level, points_total, is_admin, is_ad_free, onboarded_at, suspended_at, consents, deleted_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!p || p.deleted_at) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: p.display_name,
    handle: p.handle,
    city: p.city,
    level: p.level,
    pointsTotal: p.points_total,
    isAdmin: p.is_admin,
    isAdFree: p.is_ad_free,
    onboarded: Boolean(p.onboarded_at),
    suspended: Boolean(p.suspended_at),
    consents: (p.consents ?? {}) as Record<string, boolean>,
  };
});

/** Para páginas: redireciona para entrar (e para o onboarding se falta completá-lo). */
export async function requireUser(next = '/'): Promise<SessionProfile> {
  const me = await getSessionProfile();
  if (!me) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  if (me.suspended) redirect('/entrar?erro=suspensa');
  if (!me.onboarded) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return me;
}

/** Para ações: lança erro de utilizador em vez de redirecionar. */
export async function requireUserForAction(): Promise<SessionProfile> {
  const me = await getSessionProfile();
  if (!me) throw new UserError('Entra na tua conta para continuar.');
  if (me.suspended) throw new UserError('A tua conta está suspensa.');
  return me;
}

export type MemberRole = 'owner' | 'staff';

export interface MemberContext {
  me: SessionProfile;
  restaurant: { id: string; slug: string; name: string; plan: 'free' | 'paid'; verifiedStatus: string };
  role: MemberRole;
}

/** Autorização no servidor (além de RLS): o utilizador tem de pertencer ao restaurante. */
export async function loadMember(slugOrId: { slug?: string; id?: string }, roles: MemberRole[] = ['owner', 'staff']): Promise<MemberContext | null> {
  const me = await getSessionProfile();
  if (!me || me.suspended) return null;
  const sb = await createServerSupabase();
  let q = sb.from('restaurants').select('id, slug, name, plan, verified_status, restaurant_members!inner(role, user_id)').eq('restaurant_members.user_id', me.id);
  if (slugOrId.slug) q = q.eq('slug', slugOrId.slug);
  if (slugOrId.id) q = q.eq('id', slugOrId.id);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const role = (data.restaurant_members as { role: MemberRole }[])[0]?.role;
  if (!role || !roles.includes(role)) return null;
  return {
    me,
    role,
    restaurant: { id: data.id, slug: data.slug, name: data.name, plan: data.plan, verifiedStatus: data.verified_status },
  };
}

export async function requireMemberPage(slug: string, roles: MemberRole[] = ['owner', 'staff']): Promise<MemberContext> {
  const me = await getSessionProfile();
  if (!me) redirect(`/entrar?next=${encodeURIComponent(`/r/${slug}/admin`)}`);
  const ctx = await loadMember({ slug }, roles);
  if (!ctx) redirect(`/r/${slug}`);
  return ctx;
}

export async function requireMemberForAction(restaurantId: string, roles: MemberRole[] = ['owner', 'staff']): Promise<MemberContext> {
  const ctx = await loadMember({ id: restaurantId }, roles);
  if (!ctx) throw new UserError('Não tens permissão para fazer isto neste restaurante.');
  return ctx;
}

export async function requireAdminPage(): Promise<SessionProfile> {
  const me = await getSessionProfile();
  if (!me) redirect('/entrar?next=/admin');
  if (!me.isAdmin) redirect('/');
  return me;
}

export async function requireAdminForAction(): Promise<SessionProfile> {
  const me = await requireUserForAction();
  if (!me.isAdmin) throw new UserError('Sem permissão de administração.');
  return me;
}

/** Restaurantes onde o utilizador é membro (para o alternador de modo restaurante). */
export const getMyRestaurants = cache(async () => {
  const me = await getSessionProfile();
  if (!me) return [];
  const sb = await createServerSupabase();
  const { data } = await sb
    .from('restaurant_members')
    .select('role, restaurants(id, slug, name, verified_status)')
    .eq('user_id', me.id);
  return (data ?? []).flatMap((m) => {
    const r = m.restaurants as unknown as { id: string; slug: string; name: string; verified_status: string } | null;
    return r ? [{ ...r, role: m.role as MemberRole }] : [];
  });
});

export { createServiceSupabase };
