export const REVIEW_MAX_CHARS = 1000;
export const REVIEW_COOLDOWN_DAYS = 30;

const OFFENSIVE = ['merda', 'porcaria nojenta', 'filho da puta', 'cabrão', 'cabrao', 'idiota', 'estúpido', 'estupido'];

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Filtro básico de palavras ofensivas. A moderação humana fica no admin. */
export function containsOffensive(text: string): boolean {
  const t = norm(text);
  return OFFENSIVE.some((w) => t.includes(norm(w)));
}

export function validateReview(input: { rating: number; text: string }):
  | { ok: true }
  | { ok: false; reason: 'rating' | 'too_long' | 'offensive' } {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { ok: false, reason: 'rating' };
  if (input.text.length > REVIEW_MAX_CHARS) return { ok: false, reason: 'too_long' };
  if (containsOffensive(input.text)) return { ok: false, reason: 'offensive' };
  return { ok: true };
}

/** Uma avaliação por utilizador por restaurante por 30 dias: a nova substitui, mantendo histórico. */
export function reviewReplacesPrevious(previousAt: Date | null, now: Date): boolean {
  if (!previousAt) return false;
  return now.getTime() - previousAt.getTime() < REVIEW_COOLDOWN_DAYS * 86_400_000;
}

export function averageRating(ratings: readonly number[]): number {
  if (ratings.length === 0) return 0;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}

/** Sanitiza texto de utilizador: remove caracteres de controlo e HTML. Nunca renderizar como HTML. */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}
