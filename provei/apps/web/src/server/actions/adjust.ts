'use server';
import 'server-only';
import { createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, fail } from '../action';
import { adjustLoyalty } from './table';

/** Ajuste por @utilizador (a equipa não conhece o UUID). */
export async function adjustLoyaltyByHandle(input: { restaurantId: string; handle: string; kind: 'stamps' | 'points'; delta: number; reason: string }): Promise<ActionResult> {
  const { data } = await createServiceSupabase().from('profiles').select('id').eq('handle', input.handle).is('deleted_at', null).maybeSingle();
  if (!data) return fail('Não encontrámos esse utilizador.');
  return adjustLoyalty({ restaurantId: input.restaurantId, userId: data.id, kind: input.kind, delta: input.delta, reason: input.reason });
}
