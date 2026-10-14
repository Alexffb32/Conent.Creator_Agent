import { createHmac } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const hasBackend = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function createUser(email: string, opts: { name?: string; onboarded?: boolean; isAdmin?: boolean } = {}) {
  const sb = admin();
  const { data, error } = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: opts.name ?? 'Teste' } });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  if (opts.onboarded !== false) {
    await sb.from('profiles').update({
      display_name: opts.name ?? 'Teste E2E', handle: `e2e_${uid()}`.slice(0, 24), city: 'Covilhã', is_admin: Boolean(opts.isAdmin), is_demo: true,
      onboarded_at: new Date().toISOString(), consents: { terms: true, privacy: true, location: false, push: false, ads_personalization: false },
    }).eq('id', data.user.id);
  }
  return data.user.id;
}

/** Entra sem e-mail: gera um link mágico com o service role e abre-o (token_hash, funciona em qualquer contexto). */
export async function loginAs(page: Page, email: string, next = '/') {
  const sb = admin();
  const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message}`);
  await page.goto(`/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
}

export async function newContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ locale: 'pt-PT', timezoneId: 'Europe/Lisbon' });
}

export interface Fixture {
  restaurantId: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
  staffId: string;
  staffEmail: string;
  tableCode: string;
  tableId: string;
  postId: string | null;
}

/** Restaurante verificado com dono, staff, mesa e (opcionalmente) um prato publicado. */
export async function createFixture(opts: { plan?: 'free' | 'paid'; verified?: 'verified' | 'pending'; withPost?: boolean; stampsRequired?: number } = {}): Promise<Fixture> {
  const sb = admin();
  const id = uid();
  const ownerEmail = `dono-${id}@provei.test`;
  const staffEmail = `staff-${id}@provei.test`;
  const ownerId = await createUser(ownerEmail, { name: 'Dono E2E' });
  const staffId = await createUser(staffEmail, { name: 'Staff E2E' });
  const slug = `e2e-${id}`;
  const { data: r, error } = await sb.from('restaurants').insert({
    slug, name: `Restaurante E2E ${id}`, city: 'Covilhã', lat: 40.2811, lng: -7.5042, plan: opts.plan ?? 'free', verified_status: opts.verified ?? 'verified', is_demo: true,
    description: 'Fictício de teste', cuisine: ['Teste'],
  }).select('id').single();
  if (error || !r) throw new Error(`restaurante: ${error?.message}`);
  await sb.from('restaurant_members').insert([{ restaurant_id: r.id, user_id: ownerId, role: 'owner' }, { restaurant_id: r.id, user_id: staffId, role: 'waiter' }]);
  await sb.from('loyalty_programs').insert({ restaurant_id: r.id, stamps_required: opts.stampsRequired ?? 2, reward_text: 'Sobremesa de teste', min_interval_hours: 0 });
  const tableCode = `e2e${id}`.replace(/[^a-z0-9]/g, '').slice(0, 12).padEnd(8, 'x');
  const { data: t } = await sb.from('tables').insert({ restaurant_id: r.id, label: '7', public_code: tableCode }).select('id').single();
  let postId: string | null = null;
  if (opts.withPost !== false) {
    const { data: m } = await sb.from('media_assets').insert({ owner_restaurant_id: r.id, kind: 'photo', storage_path: '/seed/dish-1.svg', status: 'ready', mime: 'image/svg+xml' }).select('id').single();
    const { data: p } = await sb.from('posts').insert({ restaurant_id: r.id, type: 'photo', media_id: m!.id, dish_name: `Prato E2E ${id}`, price_cents: 1250, status: 'published', published_at: new Date().toISOString() }).select('id').single();
    postId = p!.id;
  }
  return { restaurantId: r.id, slug, ownerId, ownerEmail, staffId, staffEmail, tableCode, tableId: t!.id, postId };
}

export async function cleanup(f: Fixture, extraUsers: string[] = []) {
  const sb = admin();
  await sb.from('restaurants').delete().eq('id', f.restaurantId);
  for (const u of [f.ownerId, f.staffId, ...extraUsers]) await sb.auth.admin.deleteUser(u).catch(() => {});
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'scroll horizontal').toBeLessThanOrEqual(1);
}

/** Código TOTP (RFC 6238, SHA-1, 6 dígitos, 30 s) para o segundo fator nos testes. */
export function totp(secretBase32: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secretBase32.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return (((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000) + '').padStart(6, '0');
}

/** Admin: entra, regista o TOTP em /mfa e confirma o código (a administração exige aal2). */
export async function loginAsAdmin(page: Page, email: string, next = '/admin') {
  await loginAs(page, email, next);
  await page.waitForURL(/\/mfa/);
  const secret = (await page.locator('.font-mono').innerText()).trim();
  await page.getByLabel('Código').fill(totp(secret));
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await page.waitForURL((u) => u.pathname.startsWith(next.split('?')[0]!));
}
