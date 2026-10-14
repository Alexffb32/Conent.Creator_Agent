'use server';
import 'server-only';
import { revalidatePath } from 'next/cache';
import { advertiserSchema } from '@provei/api-client';
import { createServerSupabase } from '@/lib/supabase/server';
import { getFlags } from '@/lib/flags';
import { type ActionResult, formDataToObject, parse, run, UserError } from '../action';
import { requireUserForAction } from '../auth';
import { audit } from '../audit';

/** Cria a conta de anunciante pela função da base de dados (o criador fica dono). */
export async function createAdvertiser(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const me = await requireUserForAction();
    if (!(await getFlags()).ads) throw new UserError('Os anúncios ainda não estão disponíveis.');
    const v = parse(advertiserSchema, formDataToObject(fd));
    const sb = await createServerSupabase();
    const { data, error } = await sb.rpc('create_advertiser', { p_name: v.name, p_email: v.email, p_vat: v.vat || null });
    if (error) {
      if (error.message.includes('rate_limited')) throw new UserError('Já criaste várias contas hoje. Tenta amanhã.');
      throw new Error(error.message);
    }
    await audit({ actorId: me.id, action: 'advertiser.create', entity: 'advertisers', entityId: String(data) });
    revalidatePath('/anunciante');
    return { id: String(data) };
  });
}
