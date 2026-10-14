'use server';
import 'server-only';
import { contentNoticeSchema, leadSchema } from '@provei/api-client';
import { createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { type ActionResult, formDataToObject, parse, run, UserError } from '../action';
import { ipHash } from '../audit';
import { getMailer } from '../mail';

const NOTIFY_TO = process.env.CONTACT_EMAIL ?? 'ola@provei.pt';

const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 120);

/** As funções só aceitam a chave de serviço (o hash do IP não pode vir do cliente). */
function db() {
  if (!serverEnv.serviceRoleKey) throw new UserError(`Este formulário ainda não está disponível. Escreve para ${NOTIFY_TO}.`);
  return createServiceSupabase();
}

function rpcError(message: string): never {
  if (message.includes('rate_limited')) throw new UserError('Recebemos vários pedidos deste dispositivo. Tenta daqui a uma hora.');
  throw new Error(message);
}

/** Pedido de visita de demonstração. Grava via função com limites na base de dados e avisa por e-mail. */
export async function submitLead(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = parse(leadSchema, formDataToObject(fd));
    const { data, error } = await db().rpc('submit_lead', {
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
      .send({ to: NOTIFY_TO, subject: `Provei · pedido de demonstração: ${oneLine(v.restaurant)}`, text, html: `<pre>${text.replace(/[<>&]/g, '')}</pre>` })
      .catch((e) => console.error('[lead mail]', e));
    return { id: String(data) };
  });
}

/** Notificação DSA: fica registada para decisão do administrador; o autor recebe confirmação no ecrã. */
export async function submitContentNotice(_: unknown, fd: FormData): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const obj = formDataToObject(fd);
    const v = parse(contentNoticeSchema, { ...obj, goodFaith: obj.goodFaith === 'on' });
    const { data, error } = await db().rpc('submit_content_notice', {
      p_name: v.name,
      p_email: v.email,
      p_url: v.url,
      p_category: v.category,
      p_explanation: v.explanation,
      p_good_faith: v.goodFaith,
      p_ip_hash: await ipHash(),
    });
    if (error) rpcError(error.message);
    const ref = String(data).slice(0, 8);
    // Confirmação de receção ao autor (DSA art. 16.º, n.º 4).
    await getMailer()
      .send({
        to: v.email,
        subject: `Provei · recebemos a tua denúncia (${ref})`,
        text: `Recebemos a tua denúncia sobre ${v.url}. Referência: ${ref}. Vamos analisá-la e responder-te por e-mail com a decisão e o motivo.`,
        html: `<p>Recebemos a tua denúncia. Referência: <strong>${ref}</strong>. Vamos analisá-la e responder-te por e-mail com a decisão e o motivo.</p>`,
      })
      .catch((e) => console.error('[notice receipt]', e));
    await getMailer()
      .send({ to: NOTIFY_TO, subject: `Provei · nova notificação de conteúdo (${ref})`, text: `Categoria: ${v.category}\nURL: ${v.url}\n\n${v.explanation}`, html: '<p>Nova notificação de conteúdo no painel de administração.</p>' })
      .catch((e) => console.error('[notice mail]', e));
    return { id: String(data) };
  });
}
