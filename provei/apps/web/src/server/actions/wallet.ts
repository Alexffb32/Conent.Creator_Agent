'use server';
import 'server-only';
import { z } from 'zod';
import { uuidSchema } from '@provei/api-client';
import { getFlags } from '@/lib/flags';
import { createServiceSupabase } from '@/lib/supabase/server';
import { type ActionResult, parse, run, UserError } from '../action';
import { requireUserForAction } from '../auth';
import { enforceRateLimit } from '../ratelimit';
import { getAppleProvider } from '../wallet/provider';
import { ensureApplePass } from '../wallet/passes';
import { signDownload } from '../wallet/tokens';

const schema = z.object({ restaurantId: uuidSchema, showFirstName: z.boolean().default(false) });

/** Devolve um URL de descarga assinado e temporário (5 min) para o cartão Apple deste restaurante. Só com sessão. */
export async function getAppleWalletLink(input: unknown): Promise<ActionResult<{ url: string; simulated: boolean }>> {
  return run(async () => {
    const v = parse(schema, input);
    const me = await requireUserForAction();
    await enforceRateLimit(`wallet:link:${me.id}`, 3600, 20);
    const flags = await getFlags(v.restaurantId);
    const provider = getAppleProvider();
    if (!flags.wallet_apple || !provider.isConfigured()) throw new UserError('O cartão na Apple Wallet ainda não está disponível neste restaurante.');
    const svc = createServiceSupabase();
    const { data: r } = await svc.from('restaurants').select('id, plan, verified_status, deleted_at').eq('id', v.restaurantId).maybeSingle();
    if (!r || r.verified_status !== 'verified' || r.deleted_at) throw new UserError('Restaurante indisponível.');
    if (r.plan !== 'paid') throw new UserError('O cartão na Wallet faz parte do plano pago do restaurante.');
    const pass = await ensureApplePass(me.id, v.restaurantId, { showFirstName: v.showFirstName }, svc);
    return { url: `/api/wallet/apple/download?t=${encodeURIComponent(signDownload(pass.id))}`, simulated: provider.simulated };
  });
}
