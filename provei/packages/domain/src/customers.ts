/** Base de clientes do restaurante: segmentos a partir de dados reais e exportação CSV. Puro. */

export type Segment = 'novo' | 'regular' | 'em_risco' | 'perdido' | 'ocasional';

export interface CustomerRow {
  ref: string; // identificador pseudónimo por restaurante (não é o id da conta)
  firstName: string;
  visits: number;
  orders: number;
  spendCents: number;
  points: number;
  firstSeen: Date;
  lastSeen: Date;
  email?: string | null; // só com consentimento de marketing por e-mail
}

export const SEGMENT_LABEL: Record<Segment, string> = {
  novo: 'Novo',
  regular: 'Regular',
  em_risco: 'Em risco',
  perdido: 'Perdido',
  ocasional: 'Ocasional',
};

const DAY = 86_400_000;

/**
 * - novo: primeira vez há menos de 30 dias
 * - regular: 3+ idas (visitas ou pedidos) e a última há menos de 45 dias
 * - em_risco: 2+ idas e a última entre 45 e 90 dias
 * - perdido: última há mais de 90 dias
 * - ocasional: o resto
 */
export function segmentFor(c: Pick<CustomerRow, 'visits' | 'orders' | 'firstSeen' | 'lastSeen'>, now = new Date()): Segment {
  const times = c.visits + c.orders;
  const since = (now.getTime() - c.lastSeen.getTime()) / DAY;
  if (since > 90) return 'perdido';
  if ((now.getTime() - c.firstSeen.getTime()) / DAY < 30 && times <= 2) return 'novo';
  if (times >= 3 && since < 45) return 'regular';
  if (times >= 2 && since >= 45) return 'em_risco';
  return 'ocasional';
}

const csvCell = (v: string | number) => {
  const s = String(v);
  // evita injeção de fórmulas em folhas de cálculo e escapa aspas
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function customersCsv(rows: readonly CustomerRow[], now = new Date()): string {
  const head = ['referencia', 'nome', 'segmento', 'visitas', 'pedidos', 'gasto_eur', 'pontos', 'primeira_vez', 'ultima_vez', 'email_marketing'];
  const lines = rows.map((r) =>
    [
      r.ref,
      r.firstName,
      SEGMENT_LABEL[segmentFor(r, now)],
      r.visits,
      r.orders,
      (r.spendCents / 100).toFixed(2),
      r.points,
      r.firstSeen.toISOString().slice(0, 10),
      r.lastSeen.toISOString().slice(0, 10),
      r.email ?? '',
    ].map(csvCell).join(';'),
  );
  return '﻿' + [head.join(';'), ...lines].join('\r\n') + '\r\n';
}
