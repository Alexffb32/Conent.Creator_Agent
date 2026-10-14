export type LevelKey = 'convidado' | 'provador' | 'habitual' | 'embaixador';

export interface LoyaltyProgram {
  stampsRequired: number;
  pointsPerVisit: number;
  pointsPerReviewPhoto: number;
  pointsFirstVisit: number;
  minIntervalHours: number;
  active: boolean;
}

export const DEFAULT_PROGRAM: LoyaltyProgram = {
  stampsRequired: 8,
  pointsPerVisit: 10,
  pointsPerReviewPhoto: 5,
  pointsFirstVisit: 20,
  minIntervalHours: 12,
  active: true,
};

export type LedgerEventType = 'stamp' | 'points' | 'redeem' | 'adjust';

export interface LedgerEvent {
  type: LedgerEventType;
  /** Variação: positiva ao ganhar, negativa ao gastar/reverter. */
  delta: number;
  /** Para `stamp` conta carimbos; para os restantes conta pontos. */
  reason?: string;
}
