'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { consentUpdateSchema, onboardingSchema, profileUpdateSchema } from '@provei/api-client';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireUserForAction } from '../auth';
import { audit } from '../audit';
import { enforceRateLimit } from '../ratelimit';

const CONSENT_VERSION = '2026-10';

function mapProfileError(error: { code?: string; message: string }): never {
  if (error.code === '23505') throw new UserError('Esse nome de utilizador já existe. Escolhe outro.', 'handle');
  throw new Error(error.message);
}

export async function completeOnboarding(input: unknown): Promise<ActionResult<{ next: string }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(onboardingSchema, input);
    const sb = await createServerSupabase();
    const consents = { terms: true, privacy: true, location: v.location, push: v.push, ads_personalization: v.adsPersonalization };
    const { error } = await sb
      .from('profiles')
      .update({ display_name: v.displayName, handle: v.handle, city: v.city, consents, onboarded_at: new Date().toISOString() })
      .eq('id', me.id);
    if (error) mapProfileError(error);
    await sb.from('consents').insert(
      Object.entries(consents).map(([kind, granted]) => ({ user_id: me.id, kind, granted, version: CONSENT_VERSION })),
    );
    revalidatePath('/', 'layout');
    return { next: '/' };
  });
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(profileUpdateSchema, input);
    const sb = await createServerSupabase();
    const { error } = await sb
      .from('profiles')
      .update({ display_name: v.displayName, handle: v.handle, bio: v.bio, city: v.city })
      .eq('id', me.id);
    if (error) mapProfileError(error);
    revalidatePath('/perfil', 'layout');
    return undefined;
  });
}

export async function updateConsent(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(consentUpdateSchema, input);
    if ((v.kind === 'terms' || v.kind === 'privacy') && !v.granted) {
      throw new UserError('Os termos e a privacidade são necessários para usar o Provei. Podes apagar a conta nas definições.');
    }
    const sb = await createServerSupabase();
    const consents = { ...me.consents, [v.kind]: v.granted };
    const { error } = await sb.from('profiles').update({ consents }).eq('id', me.id);
    if (error) throw new Error(error.message);
    await sb.from('consents').insert({ user_id: me.id, kind: v.kind, granted: v.granted, version: CONSENT_VERSION });
    revalidatePath('/perfil/definicoes');
    return undefined;
  });
}

/** Apagamento lógico imediato; remoção definitiva por job (ver /api/jobs/purge). */
export async function deleteAccount(): Promise<ActionResult> {
  const result = await run(async () => {
    const me = await requireUserForAction();
    await enforceRateLimit(`delete:${me.id}`, 3600, 3);
    const svc = createServiceSupabase();
    const { error } = await svc.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', me.id);
    if (error) throw new Error(error.message);
    await svc.from('push_subscriptions').delete().eq('user_id', me.id);
    await svc.from('follows').delete().eq('user_id', me.id);
    await svc.from('saves').delete().eq('user_id', me.id);
    await audit({ actorId: me.id, action: 'account.delete', entity: 'profile', entityId: me.id });
    const sb = await createServerSupabase();
    await sb.auth.signOut();
    return undefined;
  });
  if (result.ok) redirect('/?conta=apagada');
  return result;
}
