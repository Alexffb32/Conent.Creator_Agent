/** Pedidos na mesa e para levantar (ADENDA 2 · F2). Regras puras, sem I/O. */

export const ORDER_STATUSES = ['new', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type CrewRole = 'owner' | 'manager' | 'kitchen' | 'waiter';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded' | 'failed';
export type PaymentMethod = 'none' | 'stripe' | 'cash';

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'preparing'],
  delivered: [],
  cancelled: [],
};

/** Quem pode mover o pedido para cada estado. Cozinha prepara; sala entrega; cancelar é de quem gere ou da sala. */
const WHO: Record<OrderStatus, CrewRole[]> = {
  new: [],
  preparing: ['owner', 'manager', 'kitchen'],
  ready: ['owner', 'manager', 'kitchen'],
  delivered: ['owner', 'manager', 'waiter'],
  cancelled: ['owner', 'manager', 'waiter'],
};

export function canTransition(from: OrderStatus, to: OrderStatus, role: CrewRole): boolean {
  return NEXT[from].includes(to) && WHO[to].includes(role);
}

export const MAX_CART_LINES = 30;
export const MAX_QTY = 20;

export interface CartLine {
  menuItemId: string;
  qty: number;
  note?: string;
}
export interface PricedItem {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  station: string;
}

export type CartError = 'empty' | 'too_many_lines' | 'bad_qty' | 'unknown_item' | 'unavailable';

/**
 * Valida o carrinho contra o menu do servidor e calcula o total. Os preços vêm SEMPRE do menu,
 * nunca do cliente. Linhas repetidas do mesmo prato são somadas.
 */
export function priceCart(lines: readonly CartLine[], menu: readonly PricedItem[]):
  | { ok: true; lines: (PricedItem & { qty: number; note: string | null; lineCents: number })[]; totalCents: number }
  | { ok: false; error: CartError; itemId?: string } {
  if (!lines.length) return { ok: false, error: 'empty' };
  const merged = new Map<string, { qty: number; note: string | null }>();
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) return { ok: false, error: 'bad_qty', itemId: l.menuItemId };
    const prev = merged.get(l.menuItemId);
    const qty = (prev?.qty ?? 0) + l.qty;
    if (qty > MAX_QTY) return { ok: false, error: 'bad_qty', itemId: l.menuItemId };
    merged.set(l.menuItemId, { qty, note: (l.note?.trim() || prev?.note) ?? null });
  }
  if (merged.size > MAX_CART_LINES) return { ok: false, error: 'too_many_lines' };
  const byId = new Map(menu.map((m) => [m.id, m]));
  const out: (PricedItem & { qty: number; note: string | null; lineCents: number })[] = [];
  for (const [id, { qty, note }] of merged) {
    const item = byId.get(id);
    if (!item) return { ok: false, error: 'unknown_item', itemId: id };
    if (!item.available) return { ok: false, error: 'unavailable', itemId: id };
    out.push({ ...item, qty, note, lineCents: item.priceCents * qty });
  }
  return { ok: true, lines: out, totalCents: out.reduce((s, l) => s + l.lineCents, 0) };
}

export interface ShiftOrder {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalCents: number;
}

export interface ShiftReport {
  ordersCount: number;
  stripeCents: number;
  cashExpectedCents: number;
  countedCashCents: number;
  cashDiffCents: number;
  unpaidCount: number;
  unpaidCents: number;
  cancelledCount: number;
  cancelledCents: number;
  flags: ('cash_short' | 'cash_over' | 'unpaid_orders')[];
}

/**
 * Fecho de caixa (NÃO fiscal): reconcilia pagamentos Stripe, dinheiro registado e anulações.
 * Diferença de caixa = contado − esperado (positivo = sobra).
 */
export function reconcileShift(orders: readonly ShiftOrder[], countedCashCents: number): ShiftReport {
  let stripe = 0, cash = 0, unpaidN = 0, unpaid = 0, cancN = 0, canc = 0, n = 0;
  for (const o of orders) {
    if (o.status === 'cancelled') {
      cancN++;
      canc += o.totalCents;
      continue;
    }
    n++;
    if (o.paymentStatus === 'paid' && o.paymentMethod === 'stripe') stripe += o.totalCents;
    else if (o.paymentStatus === 'paid' && o.paymentMethod === 'cash') cash += o.totalCents;
    else {
      unpaidN++;
      unpaid += o.totalCents;
    }
  }
  const diff = countedCashCents - cash;
  const flags: ShiftReport['flags'] = [];
  if (diff < 0) flags.push('cash_short');
  if (diff > 0) flags.push('cash_over');
  if (unpaidN > 0) flags.push('unpaid_orders');
  return {
    ordersCount: n,
    stripeCents: stripe,
    cashExpectedCents: cash,
    countedCashCents,
    cashDiffCents: diff,
    unpaidCount: unpaidN,
    unpaidCents: unpaid,
    cancelledCount: cancN,
    cancelledCents: canc,
    flags,
  };
}

/** Os 14 alergénios de declaração obrigatória na UE (Reg. (UE) 1169/2011, anexo II). */
export const EU_ALLERGENS = [
  { key: 'gluten', label: 'Glúten' },
  { key: 'crustaceans', label: 'Crustáceos' },
  { key: 'eggs', label: 'Ovos' },
  { key: 'fish', label: 'Peixe' },
  { key: 'peanuts', label: 'Amendoins' },
  { key: 'soy', label: 'Soja' },
  { key: 'milk', label: 'Leite' },
  { key: 'nuts', label: 'Frutos de casca rija' },
  { key: 'celery', label: 'Aipo' },
  { key: 'mustard', label: 'Mostarda' },
  { key: 'sesame', label: 'Sésamo' },
  { key: 'sulphites', label: 'Sulfitos' },
  { key: 'lupin', label: 'Tremoço' },
  { key: 'molluscs', label: 'Moluscos' },
] as const;
export type AllergenKey = (typeof EU_ALLERGENS)[number]['key'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Novo',
  preparing: 'Em preparação',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
