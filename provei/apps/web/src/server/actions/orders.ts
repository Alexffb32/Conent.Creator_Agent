'use server';
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { closeShiftSchema, orderStatusSchema, placeOrderSchema, uuidSchema } from '@provei/api-client';
import { createServerSupabase, createServiceSupabase } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { getFlags } from '@/lib/flags';
import { type ActionResult, parse, run, UserError } from '../action';
import { FLOOR, MANAGE, requireMemberForAction, getSessionProfile } from '../auth';
import { audit } from '../audit';
import { sendPush } from '../push';
import { getPaymentProvider } from '../payment-provider';

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
};
function dbError(message: string): never {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  if (key) throw new UserError(ERRORS[key]!);
  throw new Error(message);
}
const hashSecret = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Envia o pedido. Sem conta obrigatória: quem pede sem conta recebe um segredo para acompanhar o pedido.
 * Repetir com o mesmo clientRef (reenvio após falha de rede) devolve o mesmo pedido.
 */
export async function placeOrder(input: unknown): Promise<ActionResult<{ orderId: string; guestKey: string | null }>> {
  return run(async () => {
    const v = parse(placeOrderSchema, input);
    if (v.kind === 'table' && !v.tableCode) throw new UserError('Falta o código da mesa.');
    const me = await getSessionProfile();
    const guestKey = me ? null : randomBytes(24).toString('base64url');
    const sb = await createServerSupabase();
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
    return { orderId: String(data), guestKey };
  });
}

/** Lê um pedido: com conta pela RLS; sem conta pelo segredo. */
export async function loadOrder(orderId: string, guestKey?: string | null) {
  if (!uuidSchema.safeParse(orderId).success) return null;
  const sb = await createServerSupabase();
  if (guestKey) {
    const { data } = await sb.rpc('get_guest_order', { p_id: orderId, p_secret_hash: hashSecret(guestKey) });
    return (data as GuestOrder | null) ?? null;
  }
  const { data } = await sb
    .from('orders')
    .select('id, status, kind, total_cents, created_at, payment_status, restaurant_id, note, order_items(name, qty, price_cents, note)')
    .eq('id', orderId)
    .maybeSingle();
  if (!data) return null;
  return { ...data, items: data.order_items } as unknown as GuestOrder;
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
export async function payOrderOnline(orderId: string, guestKey: string | null): Promise<ActionResult> {
  const res = await run(async () => {
    const order = await loadOrder(orderId, guestKey);
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
    const returnPath = `/pedido/${orderId}${guestKey ? `?k=${encodeURIComponent(guestKey)}` : ''}`;
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
    if (!r?.stripe_account_id) await svc.from('restaurants').update({ stripe_account_id: accountId }).eq('id', restaurantId);
    await audit({ actorId: ctx.me.id, action: 'stripe.connect', entity: 'restaurant', entityId: restaurantId, restaurantId });
    return url;
  });
  if (res.ok) redirect(res.data);
  return res as ActionResult;
}
