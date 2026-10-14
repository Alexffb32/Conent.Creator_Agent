import { publicEnv } from '@/lib/env';

/** URL público de um objeto do bucket `media`. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('/')) return path;
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/media/${path}`;
}

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return '';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatDateTime(d: string | Date): string {
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Lisbon' }).format(new Date(d));
}
