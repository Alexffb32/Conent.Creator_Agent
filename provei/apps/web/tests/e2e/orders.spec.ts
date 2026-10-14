import { expect, test } from '@playwright/test';
import { admin, cleanup, createFixture, hasBackend, loginAs, newContext } from './helpers';

test.skip(!hasBackend, 'Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ver README).');

// F2: QR → pedido sem conta → KDS → pronto → entregue → recebido em dinheiro → fecho de caixa.
// O pagamento online (Stripe Connect, modo de teste) não corre aqui: exige conta Connect ligada.
test('pedido na mesa sem conta chega à cozinha e fecha o ciclo', async ({ browser }) => {
  const f = await createFixture({ withPost: false });
  const sb = admin();
  try {
    await sb.from('restaurant_flags').insert([
      { restaurant_id: f.restaurantId, key: 'ordering', enabled: true },
      { restaurant_id: f.restaurantId, key: 'kds', enabled: true },
    ]);
    await sb.from('menu_items').insert({ restaurant_id: f.restaurantId, name: 'Bitoque de teste', price_cents: 950, station: 'grelha', allergens: ['eggs'] });

    // cliente sem conta
    const guest = await newContext(browser);
    const g = await guest.newPage();
    await g.goto(`/t/${f.tableCode}`);
    await g.getByRole('link', { name: 'Pedir sem conta' }).click();
    await expect(g.getByText('Alergénios: Ovos')).toBeVisible();
    await g.getByRole('button', { name: 'Juntar Bitoque de teste' }).click();
    await g.getByRole('button', { name: 'Juntar Bitoque de teste' }).click();
    await g.getByRole('button', { name: /Enviar pedido · 2/ }).click();
    await expect(g).toHaveURL(/\/pedido\/[0-9a-f-]+\?k=/);
    await expect(g.getByText('Documento de consumo — não é fatura', { exact: false })).toBeVisible();
    await expect(g.getByText('19,00')).toBeVisible();

    // cozinha (dono) vê o pedido e marca pronto
    const owner = await newContext(browser);
    const o = await owner.newPage();
    await loginAs(o, f.ownerEmail, `/r/${f.slug}/admin/cozinha`);
    const card = o.getByText('Mesa 7').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await o.getByRole('button', { name: 'Começar a preparar' }).click();
    await o.getByRole('button', { name: 'Marcar pronto' }).click();

    // cliente vê "pronto" (consulta a cada 10 s)
    await expect(g.getByText('O teu pedido está pronto')).toBeVisible({ timeout: 20000 });

    // sala: entregar e receber em dinheiro
    await o.goto(`/r/${f.slug}/admin/pedidos`);
    await o.getByRole('button', { name: 'Marcar entregue' }).click();
    await o.getByRole('button', { name: 'Receber em dinheiro' }).click();
    await expect(o.getByText('Pago em dinheiro')).toBeVisible({ timeout: 10000 });

    // fecho de caixa
    await o.goto(`/r/${f.slug}/admin/caixa`);
    await o.getByLabel('Dinheiro contado na gaveta (€)').fill('19');
    await expect(o.getByText('(certo)')).toBeVisible();
    await o.getByRole('button', { name: 'Fechar turno' }).click();
    await expect(o.getByText(/1 pedidos/)).toBeVisible({ timeout: 10000 });

    const { data: orders } = await sb.from('orders').select('status, payment_status, payment_method, total_cents').eq('restaurant_id', f.restaurantId);
    expect(orders).toEqual([{ status: 'delivered', payment_status: 'paid', payment_method: 'cash', total_cents: 1900 }]);
    await guest.close();
    await owner.close();
  } finally {
    await cleanup(f);
  }
});

test('com as flags desligadas, a mesa não oferece pedidos', async ({ page }) => {
  const f = await createFixture({ withPost: false });
  try {
    await page.goto(`/t/${f.tableCode}/pedir`);
    await expect(page.getByText('ainda não recebe pedidos pelo Provei')).toBeVisible();
  } finally {
    await cleanup(f);
  }
});
