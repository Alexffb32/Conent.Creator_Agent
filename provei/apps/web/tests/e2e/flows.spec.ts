import { expect, test } from '@playwright/test';
import { admin, cleanup, createFixture, createUser, hasBackend, loginAs, newContext, uid } from './helpers';

test.skip(!hasBackend, 'Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver README).');
test.describe.configure({ mode: 'serial' });

test('1. registo → onboarding → seguir → guardar', async ({ page }) => {
  const f = await createFixture();
  const email = `novo-${uid()}@provei.test`;
  const sb = admin();
  const userId = await createUser(email, { onboarded: false });
  try {
    await loginAs(page, email, '/');
    await expect(page).toHaveURL(/onboarding/);
    await page.getByLabel('Nome', { exact: true }).fill('Ana Teste');
    await page.getByLabel('Nome de utilizador').fill(`ana_${uid()}`.slice(0, 20));
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel(/Li e aceito os/).check();
    await page.getByLabel(/Li e aceito a/).check();
    await page.getByRole('button', { name: 'Começar a provar' }).click();
    await expect(page).toHaveURL(/\/$/);
    const card = page.getByRole('article', { name: new RegExp(`Prato E2E`) }).first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: /Seguir/ }).click();
    await expect(card.getByRole('button', { name: /A seguir/ })).toBeVisible();
    await card.getByRole('button', { name: /Guardar prato/ }).click();
    await expect(card.getByRole('button', { name: /Remover dos guardados/ })).toBeVisible();
    const { data: follows } = await sb.from('follows').select('user_id').eq('user_id', userId).eq('restaurant_id', f.restaurantId);
    expect(follows).toHaveLength(1);
    const { data: saves } = await sb.from('saves').select('user_id').eq('user_id', userId);
    expect((saves ?? []).length).toBeGreaterThanOrEqual(1);
  } finally {
    await cleanup(f, [userId]);
  }
});

test('2. restaurante publica → aparece no feed de um seguidor', async ({ browser }) => {
  const f = await createFixture({ withPost: false });
  const followerEmail = `seg-${uid()}@provei.test`;
  const followerId = await createUser(followerEmail);
  await admin().from('follows').insert({ user_id: followerId, restaurant_id: f.restaurantId });
  const ownerCtx = await newContext(browser);
  const owner = await ownerCtx.newPage();
  try {
    await loginAs(owner, f.ownerEmail, `/r/${f.slug}/admin/publicacoes`);
    // PNG mínimo válido de 1×1 px
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    await owner.locator('#pc-file').setInputFiles({ name: 'prato.png', mimeType: 'image/png', buffer: png });
    await owner.getByLabel('Nome do prato').fill('Bacalhau E2E');
    await owner.getByLabel(/Preço/).fill('13,5');
    await owner.getByRole('button', { name: 'Publicar', exact: true }).click();
    await expect(owner.getByText('Bacalhau E2E').first()).toBeVisible({ timeout: 30_000 });
    const followerCtx = await newContext(browser);
    const follower = await followerCtx.newPage();
    await loginAs(follower, followerEmail, '/');
    await expect(follower.getByRole('article', { name: 'Bacalhau E2E' })).toBeVisible();
    await followerCtx.close();
  } finally {
    await ownerCtx.close();
    await cleanup(f, [followerId]);
  }
});

test('3. QR → sessão de mesa → chamar empregado → equipa atende em tempo real', async ({ browser }) => {
  const f = await createFixture({ withPost: false });
  const clientEmail = `cli-${uid()}@provei.test`;
  const clientId = await createUser(clientEmail);
  const cCtx = await newContext(browser);
  const sCtx = await newContext(browser);
  const client = await cCtx.newPage();
  const staff = await sCtx.newPage();
  try {
    await loginAs(staff, f.staffEmail, `/r/${f.slug}/admin/fila`);
    await expect(staff.getByText('Sem chamadas neste momento')).toBeVisible();
    await loginAs(client, clientEmail, `/t/${f.tableCode}`);
    await expect(client).toHaveURL(/\/mesa$/);
    await expect(client.getByRole('heading', { name: /Restaurante E2E/ })).toBeVisible();
    await client.getByRole('button', { name: /Chamar empregado/ }).click();
    await expect(client.getByText('O empregado já sabe')).toBeVisible();
    await expect(staff.getByText('Mesa 7').first()).toBeVisible({ timeout: 20_000 });
    await staff.getByRole('button', { name: 'Atender' }).click();
    await expect(client.getByText('A caminho')).toBeVisible({ timeout: 20_000 });
    await staff.getByRole('button', { name: 'Resolver' }).click();
    await expect(client.getByRole('button', { name: /Chamar empregado/ })).toBeVisible({ timeout: 20_000 });
  } finally {
    await cCtx.close();
    await sCtx.close();
    await cleanup(f, [clientId]);
  }
});

test('4. visita verificada → carimbo e pontos → recompensa validada pela equipa', async ({ browser }) => {
  const f = await createFixture({ withPost: false, stampsRequired: 2 });
  const clientEmail = `cli-${uid()}@provei.test`;
  const clientId = await createUser(clientEmail);
  const sb = admin();
  const cCtx = await newContext(browser);
  const sCtx = await newContext(browser);
  const client = await cCtx.newPage();
  const staff = await sCtx.newPage();
  try {
    await loginAs(client, clientEmail, `/t/${f.tableCode}`);
    await expect(client).toHaveURL(/\/mesa$/);
    // a visita QR exige 10 min de sessão: recuar o início da sessão
    await sb.from('table_sessions').update({ started_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq('user_id', clientId);
    await client.reload();
    await client.getByRole('button', { name: 'Confirmar a minha visita' }).click();
    await expect(client.getByText('Visita confirmada').first()).toBeVisible();
    const { data: card } = await sb.from('loyalty_cards').select('id, stamps, points').eq('user_id', clientId).single();
    expect(card?.stamps).toBe(1);
    expect(card?.points).toBeGreaterThan(0);
    // segunda visita (equipa valida pelo @utilizador) completa o cartão
    const { data: prof } = await sb.from('profiles').select('handle').eq('id', clientId).single();
    await loginAs(staff, f.staffEmail, `/r/${f.slug}/admin/leitor`);
    await staff.getByLabel(/Código de resgate ou @utilizador/).fill(`@${prof!.handle}`);
    await staff.getByRole('button', { name: 'Validar', exact: true }).click();
    await expect(staff.getByText(/Visita confirmada/)).toBeVisible();
    const { data: red } = await sb.from('redemptions').select('code, status').eq('user_id', clientId).single();
    expect(red?.status).toBe('issued');
    await staff.getByLabel(/Código de resgate ou @utilizador/).fill(red!.code);
    await staff.getByRole('button', { name: 'Validar', exact: true }).click();
    await expect(staff.getByText(/Resgate validado/)).toBeVisible();
    // resgate duplicado é recusado
    await staff.getByLabel(/Código de resgate ou @utilizador/).fill(red!.code);
    await staff.getByRole('button', { name: 'Validar', exact: true }).click();
    await expect(staff.getByText('Este código já foi usado.')).toBeVisible();
    const { data: ok } = await sb.rpc('loyalty_card_consistent', { p_card: card!.id });
    expect(ok).toBe(true);
  } finally {
    await cCtx.close();
    await sCtx.close();
    await cleanup(f, [clientId]);
  }
});

test('5. avaliação com selo "Visita verificada"', async ({ page }) => {
  const f = await createFixture({ withPost: false });
  const email = `rev-${uid()}@provei.test`;
  const userId = await createUser(email);
  const sb = admin();
  try {
    await sb.from('visits').insert({ user_id: userId, restaurant_id: f.restaurantId, level: 'staff_validated', points_awarded: 10 });
    await loginAs(page, email, `/r/${f.slug}`);
    await page.getByRole('radio', { name: '5 estrelas' }).click();
    await page.getByLabel(/Comentário/).fill('Tudo ótimo (teste).');
    await page.getByRole('button', { name: 'Publicar avaliação' }).click();
    await expect(page.getByText('Visita verificada').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Tudo ótimo (teste).')).toBeVisible();
  } finally {
    await cleanup(f, [userId]);
  }
});

test('6. admin aprova um restaurante pendente', async ({ browser, page }) => {
  const f = await createFixture({ verified: 'pending', withPost: false });
  const adminEmail = `adm-${uid()}@provei.test`;
  const adminId = await createUser(adminEmail, { isAdmin: true });
  try {
    const anon = await newContext(browser);
    const anonPage = await anon.newPage();
    expect((await anonPage.goto(`/r/${f.slug}`))?.status()).toBe(404);
    await loginAs(page, adminEmail, '/admin/restaurantes');
    const row = page.getByRole('listitem').filter({ hasText: f.slug });
    await row.getByRole('button', { name: 'Aprovar' }).click();
    await expect.poll(async () => (await admin().from('restaurants').select('verified_status').eq('id', f.restaurantId).single()).data?.verified_status).toBe('verified');
    expect((await anonPage.goto(`/r/${f.slug}`))?.status()).toBe(200);
    const { data: log } = await admin().from('audit_logs').select('action').eq('actor_id', adminId).eq('action', 'restaurant.verified');
    expect(log?.length).toBeGreaterThan(0);
    await anon.close();
  } finally {
    await cleanup(f, [adminId]);
  }
});

test('7. exportar e apagar os meus dados', async ({ page }) => {
  const email = `del-${uid()}@provei.test`;
  const userId = await createUser(email);
  try {
    await loginAs(page, email, '/perfil/definicoes');
    const res = await page.request.get('/api/account/export');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.profile.id).toBe(userId);
    expect(json.account.email).toBe(email);
    await page.getByRole('button', { name: 'Apagar conta' }).click();
    await page.getByRole('button', { name: 'Sim, apagar a minha conta' }).click();
    await expect(page).toHaveURL(/conta=apagada/);
    const { data } = await admin().from('profiles').select('deleted_at').eq('id', userId).single();
    expect(data?.deleted_at).not.toBeNull();
    expect((await page.request.get('/api/account/export')).status()).toBe(401);
  } finally {
    await admin().auth.admin.deleteUser(userId).catch(() => {});
  }
});
