import 'server-only';
import { compareLocationGroups, type LocationEffectReport } from '@provei/domain';
import { createServiceSupabase } from '@/lib/supabase/server';

export interface RestaurantWalletReport {
  days: number;
  issued: { apple: number; google: number };
  active: { apple: number; google: number };
  devices: number;
  noticesSent: number;
  holderVisits: number;
  holderRedemptions: number;
  location: LocationEffectReport;
}

/**
 * Números da Wallet de um restaurante (só cartões reais, `is_synthetic = false`).
 * Visitas atribuídas = leituras/visitas e pedidos de quem tem cartão, depois de o cartão ter sido emitido.
 */
export async function restaurantWalletReport(restaurantId: string, days = 28): Promise<RestaurantWalletReport> {
  const svc = createServiceSupabase();
  const since = new Date(Date.now() - days * 86400_000);
  const { data: passes } = await svc
    .from('wallet_passes')
    .select('id, platform, customer_id, voided, location_control, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('is_synthetic', false);
  const all = passes ?? [];
  const live = all.filter((p) => !p.voided && p.customer_id);
  const ids = all.map((p) => p.id as string);
  const holders = [...new Set(live.map((p) => p.customer_id as string))];

  const [regs, events, visits, orders, redemptions] = await Promise.all([
    ids.length ? svc.from('wallet_registrations').select('device_library_id', { count: 'exact', head: true }).in('pass_id', ids) : Promise.resolve({ count: 0 }),
    ids.length ? svc.from('wallet_push_events').select('pass_id', { count: 'exact', head: true }).in('pass_id', ids).eq('status', 'sent').gte('created_at', since.toISOString()) : Promise.resolve({ count: 0 }),
    holders.length ? svc.from('visits').select('user_id, created_at').eq('restaurant_id', restaurantId).in('user_id', holders).gte('created_at', since.toISOString()) : Promise.resolve({ data: [] }),
    holders.length ? svc.from('orders').select('user_id, created_at').eq('restaurant_id', restaurantId).in('user_id', holders).eq('is_synthetic', false).neq('status', 'cancelled').gte('created_at', since.toISOString()) : Promise.resolve({ data: [] }),
    holders.length ? svc.from('redemptions').select('user_id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).in('user_id', holders).eq('status', 'redeemed').gte('redeemed_at', since.toISOString()) : Promise.resolve({ count: 0 }),
  ]);

  // visitas por cartão Apple (as localizações só existem nos cartões Apple), contadas depois da emissão
  const apple = live.filter((p) => p.platform === 'apple');
  const per = new Map<string, number>(apple.map((p) => [p.id as string, 0]));
  const byUser = new Map(apple.map((p) => [p.customer_id as string, p]));
  for (const v of [...((visits as { data: { user_id: string; created_at: string }[] | null }).data ?? []), ...((orders as { data: { user_id: string; created_at: string }[] | null }).data ?? [])]) {
    const p = byUser.get(v.user_id);
    if (p && new Date(v.created_at) >= new Date(p.created_at as string)) per.set(p.id as string, (per.get(p.id as string) ?? 0) + 1);
  }
  const treated = apple.filter((p) => !p.location_control).map((p) => per.get(p.id as string) ?? 0);
  const control = apple.filter((p) => p.location_control).map((p) => per.get(p.id as string) ?? 0);
  const holderVisits = [...per.values()].reduce((a, b) => a + b, 0);

  return {
    days,
    issued: { apple: all.filter((p) => p.platform === 'apple').length, google: all.filter((p) => p.platform === 'google').length },
    active: { apple: apple.length, google: live.filter((p) => p.platform === 'google').length },
    devices: (regs as { count: number | null }).count ?? 0,
    noticesSent: (events as { count: number | null }).count ?? 0,
    holderVisits,
    holderRedemptions: (redemptions as { count: number | null }).count ?? 0,
    location: compareLocationGroups(treated, control),
  };
}
