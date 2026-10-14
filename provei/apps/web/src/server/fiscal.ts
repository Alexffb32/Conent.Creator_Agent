import 'server-only';

/**
 * A Provei NÃO emite faturas. O documento que o cliente vê é um "documento de consumo, não fiscal".
 * A faturação legal é feita por um software certificado pela AT, escolhido pelo restaurante (fiscal_mode = 'external').
 * Esta interface é o ponto de integração futuro; a obrigação fiscal tem de ser confirmada com um contabilista.
 */
export interface FiscalOrder {
  orderId: string;
  restaurantId: string;
  totalCents: number;
  lines: { name: string; qty: number; unitCents: number }[];
  customerVat?: string | null;
}

export interface FiscalExporter {
  readonly mode: 'external';
  exportOrder(order: FiscalOrder): Promise<{ status: 'not_configured' | 'exported'; reference?: string; message: string }>;
}

/** Sem integração escolhida: não exporta nada e di-lo claramente. */
export const externalFiscalExporter: FiscalExporter = {
  mode: 'external',
  async exportOrder() {
    return { status: 'not_configured', message: 'Fatura emitida pelo software de faturação do restaurante (certificado pela AT).' };
  },
};
