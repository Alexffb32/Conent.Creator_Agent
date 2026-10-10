'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { feedbackSchema, reportSchema, reviewCreateSchema, reviewReplySchema } from '@provei/api-client';
import { reviewReplacesPrevious, sanitizeText, validateReview } from '@provei/domain';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireMemberForAction, requireUserForAction } from '../auth';
import { audit } from '../audit';
import { enforceRateLimit } from '../ratelimit';
import { awardReviewPhotoPoints } from '../loyalty';

const REVIEW_ERRORS = {
  rating: 'Escolhe entre 1 e 5 estrelas.',
  too_long: 'O texto pode ter no máximo 1 000 caracteres.',
  offensive: 'Evita palavras ofensivas. Descreve o que se passou com calma.',
} as const;

export async function submitReview(input: unknown): Promise<ActionResult<{ verified: boolean; points: number }>> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(reviewCreateSchema, input);
    const flags = await getFlags(v.restaurantId);
    if (!flags.reviews) throw new UserError('As avaliações estão desativadas de momento.');
    await enforceRateLimit(`review:${me.id}`, 3600, 10);
    const text = sanitizeText(v.text);
    const check = validateReview({ rating: v.rating, text });
    if (!check.ok) throw new UserError(REVIEW_ERRORS[check.reason], check.reason === 'rating' ? 'rating' : 'text');

    const svc = createServiceSupabase();
    const { data: rest } = await svc.from('restaurants').select('id, verified_status').eq('id', v.restaurantId).maybeSingle();
    if (!rest || rest.verified_status !== 'verified') throw new UserError('Restaurante não encontrado.');

    const { data: visit } = await svc
      .from('visits')
      .select('id')
      .eq('user_id', me.id)
      .eq('restaurant_id', v.restaurantId)
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prev } = await svc.from('reviews').select('id, created_at').eq('user_id', me.id).eq('restaurant_id', v.restaurantId).eq('status', 'published').maybeSingle();
    const isEdit = reviewReplacesPrevious(prev ? new Date(prev.created_at) : null, new Date());
    if (prev) await svc.from('reviews').update({ status: 'replaced' }).eq('id', prev.id);

    const { error } = await svc.from('reviews').insert({
      user_id: me.id,
      restaurant_id: v.restaurantId,
      visit_id: visit?.id ?? null,
      rating: v.rating,
      text,
      photo_media_id: v.photoMediaId ?? null,
      verified: Boolean(visit),
    });
    if (error) throw new Error(error.message);

    let points = 0;
    if (v.photoMediaId && !isEdit) points = await awardReviewPhotoPoints(me.id, v.restaurantId);
    revalidatePath('/r/[slug]', 'page');
    return { verified: Boolean(visit), points };
  });
}

export async function submitPrivateFeedback(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(feedbackSchema, input);
    await enforceRateLimit(`feedback:${me.id}`, 3600, 5);
    const sb = await createServerSupabase();
    const { error } = await sb.from('private_feedback').insert({ user_id: me.id, restaurant_id: v.restaurantId, message: sanitizeText(v.message) });
    if (error) throw new UserError('Não foi possível enviar o feedback.');
    return undefined;
  });
}

export async function reportContent(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const me = await requireUserForAction();
    const v = parse(reportSchema, input);
    await enforceRateLimit(`report:${me.id}`, 3600, 20);
    const sb = await createServerSupabase();
    const { error } = await sb.from('reports').insert({ reporter_id: me.id, target_type: v.targetType, target_id: v.targetId, reason: sanitizeText(v.reason) });
    if (error) {
      if (error.code === '23505') throw new UserError('Já denunciaste este conteúdo. Obrigado.');
      throw new UserError('Não foi possível enviar a denúncia.');
    }
    return undefined;
  });
}

export async function replyToReview(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(reviewReplySchema, input);
    const svc = createServiceSupabase();
    const { data: rev } = await svc.from('reviews').select('restaurant_id').eq('id', v.reviewId).maybeSingle();
    if (!rev) throw new UserError('Avaliação não encontrada.');
    const ctx = await requireMemberForAction(rev.restaurant_id, ['owner']);
    const sb = await createServerSupabase();
    const { error } = await sb.from('review_replies').insert({ review_id: v.reviewId, restaurant_id: rev.restaurant_id, author_id: ctx.me.id, body: sanitizeText(v.body) });
    if (error) throw new UserError(error.code === '23505' ? 'Já respondeste a esta avaliação.' : 'Não foi possível publicar a resposta.');
    await audit({ actorId: ctx.me.id, action: 'review.reply', entity: 'review', entityId: v.reviewId, restaurantId: rev.restaurant_id });
    revalidatePath(`/r/${ctx.restaurant.slug}`);
    return undefined;
  });
}
