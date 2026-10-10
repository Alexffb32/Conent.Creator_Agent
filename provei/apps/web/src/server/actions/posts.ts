'use server';
import 'server-only';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { postCreateSchema, uploadRequestSchema, uuidSchema } from '@provei/api-client';
import { DEFAULT_PLAN_LIMITS, LIMIT_MESSAGES, canCreatePost, sanitizeText } from '@provei/domain';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { extFor, mimesCompatible, sniffMime } from '@/lib/mime';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireMemberForAction } from '../auth';
import { audit } from '../audit';
import { enforceRateLimit } from '../ratelimit';
import { getVideoProcessor } from '../video';
import { sendPush } from '../push';

const BUCKET = 'media';

async function postsThisMonth(restaurantId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await createServiceSupabase().from('posts').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).is('deleted_at', null).gte('created_at', start.toISOString());
  return count ?? 0;
}

/** Passo 1 do upload: valida e devolve URL assinado para enviar direto para o Storage. */
export async function requestUpload(input: unknown): Promise<ActionResult<{ mediaId: string; path: string; token: string }>> {
  return run(async () => {
    const v = parse(uploadRequestSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    await enforceRateLimit(`upload:${ctx.me.id}`, 3600, 40, 'Demasiados envios seguidos. Tenta daqui a pouco.');
    if (v.kind === 'video') {
      const svc = createServiceSupabase();
      const { data: lim } = await svc.from('plan_limits').select('max_posts_per_month').eq('plan', ctx.restaurant.plan).single();
      const limits = { ...DEFAULT_PLAN_LIMITS[ctx.restaurant.plan], maxPostsPerMonth: lim?.max_posts_per_month ?? DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxPostsPerMonth };
      if (!canCreatePost(limits, await postsThisMonth(v.restaurantId))) throw new UserError(LIMIT_MESSAGES.posts);
    }
    const svc = createServiceSupabase();
    const mediaId = randomUUID();
    const path = `restaurants/${v.restaurantId}/${mediaId}.${extFor(v.mime)}`;
    const { data: signed, error } = await svc.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? 'Sem URL de envio');
    const { error: insErr } = await svc.from('media_assets').insert({
      id: mediaId,
      owner_restaurant_id: v.restaurantId,
      kind: v.kind,
      storage_path: path,
      mime: v.mime,
      size_bytes: v.sizeBytes,
      duration_ms: v.durationMs ?? null,
      status: 'uploaded',
    });
    if (insErr) throw new Error(insErr.message);
    return { mediaId, path, token: signed.token };
  });
}

/** Passo 2: confirma o ficheiro enviado (tipo real pelos bytes) e inicia o processamento. */
export async function finalizeUpload(restaurantId: string, mediaId: string): Promise<ActionResult<{ status: string }>> {
  return run(async () => {
    parse(uuidSchema, mediaId);
    await requireMemberForAction(restaurantId, ['owner']);
    const svc = createServiceSupabase();
    const { data: media } = await svc.from('media_assets').select('*').eq('id', mediaId).eq('owner_restaurant_id', restaurantId).maybeSingle();
    if (!media) throw new UserError('Ficheiro não encontrado.');

    const { data: signed } = await svc.storage.from(BUCKET).createSignedUrl(media.storage_path, 120);
    if (!signed) throw new UserError('O envio do ficheiro não chegou ao fim. Tenta outra vez.');
    const head = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-31' } });
    if (!head.ok && head.status !== 206) throw new UserError('O envio do ficheiro não chegou ao fim. Tenta outra vez.');
    const bytes = new Uint8Array(await head.arrayBuffer());
    const real = sniffMime(bytes);
    if (!mimesCompatible(media.mime ?? '', real)) {
      await svc.storage.from(BUCKET).remove([media.storage_path]);
      await svc.from('media_assets').update({ status: 'failed' }).eq('id', mediaId);
      throw new UserError('O ficheiro não é um vídeo ou foto válido.');
    }

    if (media.kind === 'photo') {
      await svc.from('media_assets').update({ status: 'ready' }).eq('id', mediaId);
      return { status: 'ready' };
    }
    const flags = await getFlags(restaurantId);
    const processor = getVideoProcessor(flags.video_external_processor);
    const r = await processor.submit({ mediaId, sourceUrl: (await svc.storage.from(BUCKET).createSignedUrl(media.storage_path, 3600)).data?.signedUrl ?? '' });
    await svc.from('media_assets').update({ status: r.status, external_id: r.externalId ?? null }).eq('id', mediaId);
    if (r.status === 'failed') throw new UserError('Não foi possível processar o vídeo. Tenta com um mp4 mais pequeno.');
    return { status: r.status };
  });
}

export async function createPost(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  return run(async () => {
    const v = parse(postCreateSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, ['owner']);
    const svc = createServiceSupabase();
    const { data: media } = await svc.from('media_assets').select('id, kind, status').eq('id', v.mediaId).eq('owner_restaurant_id', v.restaurantId).maybeSingle();
    if (!media) throw new UserError('Escolhe primeiro uma foto ou um vídeo.');
    if (media.status === 'failed' || media.status === 'uploaded') throw new UserError('O ficheiro ainda não está pronto.');

    const { data: lim } = await svc.from('plan_limits').select('max_posts_per_month').eq('plan', ctx.restaurant.plan).single();
    const limits = { ...DEFAULT_PLAN_LIMITS[ctx.restaurant.plan], maxPostsPerMonth: lim?.max_posts_per_month ?? DEFAULT_PLAN_LIMITS[ctx.restaurant.plan].maxPostsPerMonth };
    if (!canCreatePost(limits, await postsThisMonth(v.restaurantId))) throw new UserError(LIMIT_MESSAGES.posts);

    const status = media.status === 'ready' ? 'published' : 'processing';
    const sb = await createServerSupabase();
    const { data: post, error } = await sb
      .from('posts')
      .insert({
        restaurant_id: v.restaurantId,
        type: media.kind,
        media_id: v.mediaId,
        dish_name: sanitizeText(v.dishName),
        caption: sanitizeText(v.caption) || null,
        price_cents: v.priceEuros != null ? Math.round(v.priceEuros * 100) : null,
        tags: v.tags,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) throw new UserError(error.message.includes('Limite') ? LIMIT_MESSAGES.posts : 'Não foi possível publicar o prato.');
    await audit({ actorId: ctx.me.id, action: 'post.create', entity: 'post', entityId: post.id, restaurantId: v.restaurantId });
    if (status === 'published') await notifyFollowers(v.restaurantId, ctx.restaurant.name, ctx.restaurant.slug, v.dishName);
    revalidatePath('/');
    revalidatePath(`/r/${ctx.restaurant.slug}`);
    return { id: post.id, status };
  });
}

/** Notifica seguidores: no máximo 1 por restaurante por dia (agrupado). */
export async function notifyFollowers(restaurantId: string, restaurantName: string, slug: string, dish: string) {
  const svc = createServiceSupabase();
  const { data: followers } = await svc.from('follows').select('user_id').eq('restaurant_id', restaurantId);
  const ids = (followers ?? []).map((f) => f.user_id);
  if (!ids.length) return;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { data: already } = await svc.from('notifications').select('user_id').in('user_id', ids).eq('type', 'new_post').eq('payload->>restaurantId', restaurantId).gte('created_at', dayStart.toISOString());
  const skip = new Set((already ?? []).map((a) => a.user_id));
  const targets = ids.filter((id) => !skip.has(id));
  if (!targets.length) return;
  const { data: prefs } = await svc.from('notification_prefs').select('user_id, in_app').in('user_id', targets).eq('type', 'new_post');
  const off = new Set((prefs ?? []).filter((p) => !p.in_app).map((p) => p.user_id));
  const final = targets.filter((t) => !off.has(t));
  await svc.from('notifications').insert(final.map((user_id) => ({ user_id, type: 'new_post', payload: { restaurantId, restaurant: restaurantName, slug, dish } })));
  await sendPush(final, { title: restaurantName, body: `Novo prato: ${dish}`, url: `/r/${slug}` });
}

export async function setPostStatus(restaurantId: string, postId: string, action: 'hide' | 'show' | 'delete'): Promise<ActionResult> {
  return run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const sb = await createServerSupabase();
    const patch = action === 'hide' ? { status: 'hidden' } : action === 'show' ? { status: 'published' } : { deleted_at: new Date().toISOString(), status: 'removed' };
    const { error } = await sb.from('posts').update(patch).eq('id', postId).eq('restaurant_id', restaurantId);
    if (error) throw new Error(error.message);
    await audit({ actorId: ctx.me.id, action: `post.${action}`, entity: 'post', entityId: postId, restaurantId });
    revalidatePath('/');
    revalidatePath(`/r/${ctx.restaurant.slug}`);
    return undefined;
  });
}
