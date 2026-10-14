'use server';
import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { closeShiftSchema, orderStatusSchema, placeOrderSchema, uuidSchema } from '@provei/api-client';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv, tableSecret } from '@/lib/env';
import { getFlags } from '@/lib/flags';
import { type ActionResult, parse, run, UserError } from '../action';
import { FLOOR, MANAGE, requireMemberForAction, getSessionProfile } from '../auth';
import { audit } from '../audit';
import { rateLimit } from '../ratelimit';
import { sendPush } from '../push';
import { getPaymentProvider } from '../payment-provider';
import { escapeHtml, getMailer } from '../mail';
import { publicEnv } from '@/lib/env';
import { formatPrice } from '@/lib/media';

const ERRORS: Record<string, string> = {
  ordering_off: 'Os pedidos pelo Provei ainda não estão ativos neste restaurante. Chama a equipa.',
  restaurant_unavailable: 'Este restaurante não está disponível.',
  table_not_found: 'Esta mesa não está ativa. Pede ajuda à equipa.',
  rate_limited: 'Recebemos muitos pedidos seguidos desta mesa. Espera um pouco ou chama a equipa.',
  unknown_item: 'Um dos pratos já não está no menu. Atualiza a página.',
  unavailable: 'Um dos pratos esgotou. Retira-o do pedido.',
  bad_qty: 'Quantidade inválida.',
  empty: 'O pedido está vazio.',
  too_many_lines: 'O pedido tem demasiadas linhas.',
  name_required: 'Indica o teu nome para levantares o pedido.',
  forbidden: 'Não tens permissão para fazer isto neste restaurante.',
  bad_transition: 'Este pedido já mudou de estado. Atualiza o ecrã.',
  not_payable: 'Este pedido já está pago ou foi cancelado.',
  not_found: 'Pedido não encontrado.',
  bad_period: 'O período tem de ter entre alguns minutos e 36 horas.',
  too_many_open: 'Já há vários pedidos em aberto aqui. Espera que a equipa os confirme ou chama-a.',
  paid_order: 'Este pedido já foi pago: não se cancela aqui. Faz o reembolso primeiro.',
  overlap: 'Este período já foi fechado (total ou parcialmente).',
};
function dbError(message: string): never {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  if (key) throw new UserError(ERRORS[key]!);
  throw new Error(message);
}
const hashSecret = (s: string) => createHash('sha256').update(s).digest('hex');
/** Chave de acompanhamento sem conta: derivada do clientRef, por isso um reenvio devolve a mesma chave. */
const guestKeyFor = (clientRef: string) => createHmac('sha256', tableSecret()).update(`guest-order:${clientRef}`).digest('base64url');
const GUEST_COOKIE = 'pv_order_k';

async function guestKeyFromCookie(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

/**
 * Envia o pedido. Sem conta obrigatória: quem pede sem conta fica com uma chave num cookie httpOnly limitado
 * a /pedido/{id} (nunca no endereço). Repetir com o mesmo clientRef devolve o mesmo pedido e a mesma chave.
 */
export async function placeOrder(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  return run(async () => {
    const v = parse(placeOrderSchema, input);
    if (v.kind === 'table' && !v.tableCode) throw new UserError('Falta o código da mesa.');
    const me = await getSessionProfile();
    const h = await headers();
    const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || h.get('x-real-ip') || 'unknown';
    if (!(await rateLimit(`order:ip:${ip}`, 3600, 15))) throw new UserError(ERRORS.rate_limited!);
    let guestKey: string | null = null;
    let sb;
    if (me) sb = await createServerSupabase();
    else {
      // sem conta, o pedido entra pelo servidor (a função não aceita chamadas anónimas diretas)
      if (!serverEnv.serviceRoleKey) throw new UserError('Os pedidos sem conta ainda não estão disponíveis. Entra na tua conta para pedir.');
      guestKey = guestKeyFor(v.clientRef);
      sb = createServiceSupabase();
    }
    const { data, error } = await sb.rpc('place_order', {
      p_restaurant: v.restaurantId,
      p_kind: v.kind,
      p_table_code: v.tableCode ?? null,
      p_items: v.items,
      p_client_ref: v.clientRef,
      p_note: v.note ?? null,
      p_customer_name: v.customerName ?? null,
      p_pickup_at: v.pickupAt ?? null,
      p_guest_secret_hash: guestKey ? hashSecret(guestKey) : null,
    });
    if (error) dbError(error.message);
    const orderId = String(data);
    if (guestKey) {
      (await cookies()).set(GUEST_COOKIE, guestKey, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: `/pedido/${orderId}`, maxAge: 2 * 86400 });
    }
    if (me?.email) await sendOrderConfirmation(orderId, me.email).catch(() => undefined);
    return { orderId };
  });
}

/** E-mail transacional de confirmação (só para quem tem conta; um reenvio idempotente não repete o e-mail). */
async function sendOrderConfirmation(orderId: string, email: string) {
  const sb = await createServerSupabase();
  const { data: o } = await sb.from('orders').select('created_at, total_cents, restaurants(name)').eq('id', orderId).maybeSingle();
  if (!o || Date.now() - new Date(o.created_at).getTime() > 15_000) return;
  const name = (o.restaurants as unknown as { name: string } | null)?.name ?? 'o restaurante';
  const url = `${publicEnv.siteUrl}/pedido/${orderId}`;
  await getMailer().send({
    to: email,
    subject: `Pedido recebido em ${name}`,
    text: `Recebemos o teu pedido em ${name} (total ${formatPrice(o.total_cents)}). Acompanha aqui: ${url}\nEste e-mail não é fatura.`,
    html: `<p>Recebemos o teu pedido em <strong>${escapeHtml(name)}</strong> (total ${escapeHtml(formatPrice(o.total_cents))}).</p><p><a href="${url}">Acompanhar o pedido</a></p><p>Este e-mail não é fatura.</p>`,
  });
}

/** Lê um pedido: com conta pela RLS; sem conta pela chave do cookie (o hash é feito na base de dados). */
export async function loadOrder(orderId: string) {
  if (!uuidSchema.safeParse(orderId).success) return null;
  const sb = await createServerSupabase();
  const { data } = await sb
    .from('orders')
    .select('id, status, kind, total_cents, created_at, payment_status, restaurant_id, note, order_items(name, qty, price_cents, note)')
    .eq('id', orderId)
    .maybeSingle();
  if (data) return { ...data, items: data.order_items } as unknown as GuestOrder;
  const guestKey = await guestKeyFromCookie();
  if (!guestKey) return null;
  const { data: g } = await sb.rpc('get_guest_order', { p_id: orderId, p_secret_hash: guestKey });
  return (g as GuestOrder | null) ?? null;
}
export interface GuestOrder {
  id: string;
  status: string;
  kind: string;
  total_cents: number;
  created_at: string;
  payment_status: string;
  restaurant_id: string;
  note: string | null;
  items: { name: string; qty: number; price_cents: number; note: string | null }[];
}

export async function setOrderStatus(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const v = parse(orderStatusSchema, input);
    const sb = await createServerSupabase();
    const { data: order } = await sb.from('orders').select('id, restaurant_id, user_id').eq('id', v.orderId).maybeSingle();
    if (!order) throw new UserError(ERRORS.not_found!);
    const ctx = await requireMemberForAction(order.restaurant_id, ['owner', 'manager', 'kitchen', 'waiter']);
    const { error } = await sb.rpc('set_order_status', { p_order: v.orderId, p_status: v.status, p_reason: v.reason ?? null });
    if (error) dbError(error.message);
    if (v.status === 'cancelled') await audit({ actorId: ctx.me.id, action: 'order.cancel', entity: 'orders', entityId: v.orderId, restaurantId: order.restaurant_id, meta: { reason: v.reason ?? null } });
    if (v.status === 'ready' && order.user_id && serverEnv.serviceRoleKey) {
      await sendPush([order.user_id], { title: 'O teu pedido está pronto', body: ctx.restaurant.name, url: `/pedido/${v.orderId}` }).catch(() => 0);
    }
    return undefined;
  });
}

export async function markOrderPaidCash(orderId: string): Promise<ActionResult> {
  return run(async () => {
    parse(uuidSchema, orderId);
    const sb = await createServerSupabase();
    const { data: order } = await sb.from('orders').select('restaurant_id').eq('id', orderId).maybeSingle();
    if (!order) throw new UserError(ERRORS.not_found!);
    const ctx = await requireMemberForAction(order.restaurant_id, FLOOR);
    const { error } = await sb.rpc('mark_order_paid_cash', { p_order: orderId });
    if (error) dbError(error.message);
    await audit({ actorId: ctx.me.id, action: 'order.paid_cash', entity: 'orders', entityId: orderId, restaurantId: order.restaurant_id });
    return undefined;
  });
}

export async function closeShift(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const v = parse(closeShiftSchema, input);
    const ctx = await requireMemberForAction(v.restaurantId, MANAGE);
    const sb = await createServerSupabase();
    const { data, error } = await sb.rpc('close_shift', { p_restaurant: v.restaurantId, p_from: v.from, p_to: v.to, p_counted: v.countedCents, p_notes: v.notes ?? null });
    if (error) dbError(error.message);
    await audit({ actorId: ctx.me.id, action: 'cash.close', entity: 'cash_closes', entityId: String(data), restaurantId: v.restaurantId });
    revalidatePath(`/r/${ctx.restaurant.slug}/admin/caixa`);
    return { id: String(data) };
  });
}

/** Pagamento online do pedido (Stripe Connect, modo de teste). Leva o cliente para o checkout. */
export async function payOrderOnline(orderId: string): Promise<ActionResult> {
  const res = await run(async () => {
    const order = await loadOrder(orderId);
    if (!order) throw new UserError(ERRORS.not_found!);
    if (order.payment_status === 'paid' || order.status === 'cancelled') throw new UserError(ERRORS.not_payable!);
    const flags = await getFlags(order.restaurant_id);
    if (!flags.payments || !flags.ordering) throw new UserError('O pagamento online não está ativo. Paga ao balcão.');
    const sb = await createServerSupabase();
    const { data: r } = await sb.from('restaurants').select('name, stripe_account_id, stripe_charges_enabled').eq('id', order.restaurant_id).single();
    const provider = getPaymentProvider();
    if (!r || !provider.isReady({ stripeAccountId: r.stripe_account_id, chargesEnabled: r.stripe_charges_enabled })) {
      throw new UserError('Este restaurante ainda não aceita pagamentos online. Paga ao balcão.');
    }
    const returnPath = `/pedido/${orderId}`;
    const { url } = await provider.startCheckout({ orderId, amountCents: order.total_cents, restaurantName: r.name, stripeAccountId: r.stripe_account_id!, returnPath });
    return url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}

/** Dono liga a conta Stripe Connect Express do restaurante. */
export async function connectStripeAccount(restaurantId: string): Promise<ActionResult> {
  const res = await run(async () => {
    const ctx = await requireMemberForAction(restaurantId, ['owner']);
    const flags = await getFlags(restaurantId);
    if (!flags.payments || !flags.ordering) throw new UserError('Os pagamentos de pedidos ainda não estão ativos.');
    const svc = createServiceSupabase();
    const { data: r } = await svc.from('restaurants').select('stripe_account_id').eq('id', restaurantId).single();
    const { accountId, url } = await getPaymentProvider().onboardRestaurant({
      restaurantId,
      existingAccountId: r?.stripe_account_id ?? null,
      returnPath: `/r/${ctx.restaurant.slug}/admin/definicoes`,
    });
    if (!r?.stripe_account_id) {
      // atómico: se dois pedidos simultâneos criarem contas, só a primeira fica ligada
      const { data: set } = await svc.from('restaurants').update({ stripe_account_id: accountId }).eq('id', restaurantId).is('stripe_account_id', null).select('id');
      if (!set?.length) throw new UserError('A conta Stripe já foi ligada noutro pedido. Atualiza a página.');
    }
    await audit({ actorId: ctx.me.id, action: 'stripe.connect', entity: 'restaurant', entityId: restaurantId, restaurantId });
    return url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}

export interface StaffOrder {
  id: string;
  status: string;
  kind: 'table' | 'pickup';
  total_cents: number;
  created_at: string;
  payment_status: string;
  payment_method: string;
  customer_name: string | null;
  note: string | null;
  table_label: string | null;
  items: { name: string; qty: number; note: string | null; station: string | null }[];
}

/** Pedidos para a equipa: ativos (KDS) ou do dia (sala). Autoriza no servidor e a RLS volta a filtrar. */
export async function listStaffOrders(restaurantId: string, scope: 'active' | 'today'): Promise<ActionResult<StaffOrder[]>> {
  return run(async () => {
    parse(uuidSchema, restaurantId);
    await requireMemberForAction(restaurantId, ['owner', 'manager', 'kitchen', 'waiter']);
    const sb = await createServerSupabase();
    let q = sb
      .from('orders')
      .select('id, status, kind, total_cents, created_at, payment_status, payment_method, customer_name, note, tables(label), order_items(name, qty, note, station)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (scope === 'active') q = q.in('status', ['new', 'preparing', 'ready']);
    else q = q.gte('created_at', new Date(Date.now() - 18 * 3600_000).toISOString());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((o) => {
      const { tables, order_items, ...rest } = o as unknown as StaffOrder & { tables: { label: string } | null; order_items: StaffOrder['items'] };
      return { ...rest, table_label: tables?.label ?? null, items: order_items ?? [] };
    });
  });
}
