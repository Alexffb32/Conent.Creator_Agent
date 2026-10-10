export type PlanKey = 'free' | 'paid';

export interface PlanLimits {
  maxTables: number;
  maxPostsPerMonth: number;
  offers: boolean;
  videoRetention: boolean;
  wallet: boolean;
  fullLoyalty: boolean;
}

/** Valores por omissão; os reais vêm da tabela `plan_limits`. */
export const DEFAULT_PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: { maxTables: 3, maxPostsPerMonth: 8, offers: false, videoRetention: false, wallet: false, fullLoyalty: false },
  paid: {
    maxTables: Number.MAX_SAFE_INTEGER,
    maxPostsPerMonth: Number.MAX_SAFE_INTEGER,
    offers: true,
    videoRetention: true,
    wallet: true,
    fullLoyalty: true,
  },
};

export type LimitDenied = 'tables' | 'posts' | 'offers' | 'retention' | 'wallet';

export function canCreateTable(limits: PlanLimits, currentTables: number): boolean {
  return currentTables < limits.maxTables;
}

export function canCreatePost(limits: PlanLimits, postsThisMonth: number): boolean {
  return postsThisMonth < limits.maxPostsPerMonth;
}

export const LIMIT_MESSAGES: Record<LimitDenied, string> = {
  tables: 'Chegaste ao limite de mesas do plano gratuito. Passa ao plano pago para teres mais.',
  posts: 'Chegaste ao limite de publicações deste mês no plano gratuito.',
  offers: 'As ofertas fazem parte do plano pago.',
  retention: 'A retenção de vídeo por segundo faz parte do plano pago.',
  wallet: 'O cartão na Wallet faz parte do plano pago.',
};
