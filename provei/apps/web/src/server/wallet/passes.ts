import 'server-only';
import { DEFAULT_LEVELS, buildStorePassJson, isLocationControl, passProgressText, type StorePassJson } from '@provei/domain';
import { createServiceSupabase } from '@/lib/supabase/server';
import { publicEnv, serverEnv } from '@/lib/env';
import { getFlags } from '@/lib/flags';
import { getOrCreateCard, loadProgram } from '../loyalty';
import { authTokenFor, memberTokenFor, newSerial, sha256Hex } from './tokens';

type Svc = ReturnType<typeof createServiceSupabase>;

/** Janela em que o token do QR anterior ainda é aceite depois de rodar. */
const PREV_TOKEN_GRACE_MS = 10 * 60_000;

export interface WalletPassRow {
  id: string;
  platform: 'apple' | 'google';
  restaurant_id: string;
  customer_id: string | null;
  card_id: string | null;
  serial_number: string;
  member_version: number;
  update_tag: number;
  location_control: boolean;
  show_first_name: boolean;
  offer: string | null;
  voided: boolean;
  updated_at: string;
}

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(DEFAULT_LEVELS.map((l) => [l.key, l.label]));

/** URL HTTPS do serviço web PassKit. Em dev (http) usa-se https no mesmo anfitrião só para o cartão simulado. */
export const webServiceUrl = () => `${publicEnv.siteUrl.replace(/^http:\/\//, 'https://')}/api/wallet/apple`;

/** Cria (ou devolve) o cartão Apple do cliente neste restaurante. Um por restaurante por cliente. */
export async function ensureApplePass(userId: string, restaurantId: string, opts: { showFirstName: boolean }, svc: Svc = createServiceSupabase()): Promise<WalletPassRow> {
  const card = await getOrCreateCard(svc, userId, restaurantId);
  const existing = await svc.from('wallet_passes').select('*').eq('platform', 'apple').eq('restaurant_id', restaurantId).eq('customer_id', userId).eq('voided', false).maybeSingle();
  if (existing.data) {
    const row = existing.data as WalletPassRow;
    if (row.show_first_name !== opts.showFirstName) {
      await svc.from('wallet_passes').update({ show_first_name: opts.showFirstName, update_tag: row.update_tag + 1, updated_at: new Date().toISOString() }).eq('id', row.id);
      return { ...row, show_first_name: opts.showFirstName };
    }
    return row;
  }
  const serial = newSerial();
  const { data, error } = await svc
    .from('wallet_passes')
    .insert({
      platform: 'apple',
      restaurant_id: restaurantId,
      customer_id: userId,
      card_id: card.id,
      serial_number: serial,
      auth_token_hash: sha256Hex(authTokenFor(serial)),
      member_version: 1,
      member_token_hash: sha256Hex(memberTokenFor(serial, 1)),
      location_control: isLocationControl(serial),
      show_first_name: opts.showFirstName,
    })
    .select('*')
    .single();
  if (error) {
    // corrida: outro pedido criou o cartão ao mesmo tempo
    const again = await svc.from('wallet_passes').select('*').eq('platform', 'apple').eq('restaurant_id', restaurantId).eq('customer_id', userId).eq('voided', false).single();
    return again.data as WalletPassRow;
  }
  return data as WalletPassRow;
}

/** Monta o pass.json atual de um cartão a partir dos dados reais (pontos, carimbos, nível, oferta). */
export async function buildApplePassJson(passId: string, svc: Svc = createServiceSupabase()): Promise<{ pass: StorePassJson; row: WalletPassRow } | null> {
  const { data: row } = await svc.from('wallet_passes').select('*').eq('id', passId).eq('platform', 'apple').maybeSingle();
  if (!row) return null;
  const p = row as WalletPassRow;
  const [{ data: r }, { data: card }, program, flags] = await Promise.all([
    svc.from('restaurants').select('name, phone, lat, lng').eq('id', p.restaurant_id).single(),
    p.card_id ? svc.from('loyalty_cards').select('points, stamps, level').eq('id', p.card_id).maybeSingle() : Promise.resolve({ data: null }),
    loadProgram(svc, p.restaurant_id),
    getFlags(p.restaurant_id),
  ]);
  let firstName: string | null = null;
  let pointsAlerts = true;
  if (p.customer_id && !p.voided) {
    const { data: prof } = await svc.from('profiles').select('display_name, wallet_points_alerts').eq('id', p.customer_id).maybeSingle();
    if (p.show_first_name) firstName = (prof?.display_name ?? '').trim().split(/\s+/)[0] || null;
    pointsAlerts = prof?.wallet_points_alerts !== false;
  }
  const w = serverEnv.wallet;
  const locations = r?.lat != null && r?.lng != null ? [{ latitude: Number(r.lat), longitude: Number(r.lng) }] : [];
  const pass = buildStorePassJson({
    passTypeIdentifier: w.appleTypeId || 'pass.pt.provei.simulado',
    teamIdentifier: w.appleTeamId || 'SIMULADO00',
    serialNumber: p.serial_number,
    authenticationToken: authTokenFor(p.serial_number),
    webServiceURL: webServiceUrl(),
    memberToken: memberTokenFor(p.serial_number, p.member_version),
    restaurant: { name: r?.name ?? 'Restaurante', phone: r?.phone ?? null, locations },
    points: card?.points ?? 0,
    level: LEVEL_LABEL[card?.level ?? 'convidado'] ?? 'Convidado',
    progress: passProgressText(card?.stamps ?? 0, program.stampsRequired),
    offer: p.offer,
    holderFirstName: firstName,
    withLocations: flags.wallet_location && !p.location_control,
    relevantText: (card?.points ?? 0) > 0 ? 'Tens pontos para trocar aqui' : `Mostra o cartão no ${r?.name ?? 'restaurante'}`,
    pointsAlerts,
    voided: p.voided,
    links: { terms: `${publicEnv.siteUrl}/legal/termos`, privacy: `${publicEnv.siteUrl}/legal/privacidade` },
  });
  return { pass, row: p };
}

/** Resolve o token lido no QR do cartão. Aceita a versão anterior até o dispositivo buscar o cartão novo. */
export async function resolveMemberToken(token: string, svc: Svc = createServiceSupabase()): Promise<WalletPassRow | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const h = sha256Hex(token);
  const { data } = await svc.from('wallet_passes').select('*').or(`member_token_hash.eq.${h},prev_member_token_hash.eq.${h}`).eq('voided', false).limit(1).maybeSingle();
  const row = data as (WalletPassRow & { member_token_hash: string; prev_valid_until: string | null }) | null;
  if (!row) return null;
  // o token anterior só vale na janela curta depois de rodar (o telemóvel ainda não buscou o cartão novo)
  if (row.member_token_hash !== h && !(row.prev_valid_until && new Date(row.prev_valid_until) > new Date())) return null;
  return row;
}

/** Depois de uma leitura: roda o token do QR (só com atualizações ligadas, senão o cartão no telemóvel ficaria inválido). */
export async function afterScan(p: WalletPassRow, svc: Svc = createServiceSupabase()) {
  const flags = await getFlags(p.restaurant_id);
  const patch: Record<string, unknown> = { update_tag: p.update_tag + 1, updated_at: new Date().toISOString() };
  if (flags.wallet_updates) {
    const next = p.member_version + 1;
    patch.member_version = next;
    patch.prev_member_token_hash = sha256Hex(memberTokenFor(p.serial_number, p.member_version));
    patch.member_token_hash = sha256Hex(memberTokenFor(p.serial_number, next));
    patch.prev_valid_until = new Date(Date.now() + PREV_TOKEN_GRACE_MS).toISOString();
  }
  await svc.from('wallet_passes').update(patch).eq('id', p.id);
}

/** Pontos ou oferta mudaram: avança a etiqueta dos cartões deste cliente neste restaurante (o push é do W2). */
export async function markCardChanged(userId: string, restaurantId: string, svc: Svc = createServiceSupabase()) {
  const { data } = await svc.from('wallet_passes').select('id, update_tag').eq('customer_id', userId).eq('restaurant_id', restaurantId).eq('voided', false);
  for (const r of data ?? []) await svc.from('wallet_passes').update({ update_tag: r.update_tag + 1, updated_at: new Date().toISOString() }).eq('id', r.id);
  return (data ?? []).map((r) => r.id as string);
}
