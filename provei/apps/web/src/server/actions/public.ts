'use server';
import 'server-only';
import { contentNoticeSchema, leadSchema } from '@provei/api-client';
import { createAnonSupabase } from '@/lib/supabase/server';
import { type ActionResult, formDataToObject, parse, run, UserError } from '../action';
import { ipHash } from '../audit';
import { getMailer } from '../mail';

const NOTIFY_TO = process.env.CONTACT_EMAIL ?? 'ola@provei.pt';

function rpcError(message: string): never {
  if (message.includes('rate_limited')) throw new UserError('Recebemos vários pedidos deste dispositivo. Tenta daqui a uma hora.');
  throw new Error(message);
}

/** Pedido de visita de demonstração. Grava via função com limites na base de dados e avisa por e-mail. */
export async function submitLead(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = parse(leadSchema, formDataToObject(fd));
    const { data, error } = await createAnonSupabase().rpc('submit_lead', {
      p_name: v.name,
      p_restaurant: v.restaurant,
      p_contact: v.contact,
      p_city: v.city,
      p_message: v.message,
      p_ip_hash: await ipHash(),
    });
    if (error) rpcError(error.message);
    const text = `Novo pedido de demonstração\n\nNome: ${v.name}\nRestaurante: ${v.restaurant}\nContacto: ${v.contact}\nCidade: ${v.city}\nMensagem: ${v.message || '—'}`;
    await getMailer()
      .send({ to: NOTIFY_TO, subject: `Provei · pedido de demonstração: ${v.restaurant}`, text, html: `<pre>${text.replace(/[<>&]/g, '')}</pre>` })
      .catch((e) => console.error('[lead mail]', e));
    return { id: String(data) };
  });
}

/** Notificação DSA: fica registada para decisão do administrador; o autor recebe confirmação no ecrã. */
export async function submitContentNotice(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const obj = formDataToObject(fd);
    const v = parse(contentNoticeSchema, { ...obj, goodFaith: obj.goodFaith === 'on' });
    const { data, error } = await createAnonSupabase().rpc('submit_content_notice', {
      p_name: v.name,
      p_email: v.email,
      p_url: v.url,
      p_category: v.category,
      p_explanation: v.explanation,
      p_good_faith: v.goodFaith,
      p_ip_hash: await ipHash(),
    });
    if (error) rpcError(error.message);
    await getMailer()
      .send({ to: NOTIFY_TO, subject: 'Provei · nova notificação de conteúdo', text: `Categoria: ${v.category}\nURL: ${v.url}\n\n${v.explanation}`, html: '<p>Nova notificação de conteúdo no painel de administração.</p>' })
      .catch((e) => console.error('[notice mail]', e));
    return { id: String(data) };
  });
}
