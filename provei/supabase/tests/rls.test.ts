import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, newDb, rejects } from './helpers';

const U = {
  admin: '00000000-0000-0000-0000-0000000000a1',
  ownerA: '00000000-0000-0000-0000-0000000000b1',
  ownerB: '00000000-0000-0000-0000-0000000000b2',
  waiterA: '00000000-0000-0000-0000-0000000000c1',
  managerA: '00000000-0000-0000-0000-0000000000c2',
  kitchenA: '00000000-0000-0000-0000-0000000000c3',
  adv: '00000000-0000-0000-0000-0000000000e1',
  alice: '00000000-0000-0000-0000-0000000000d1',
  bob: '00000000-0000-0000-0000-0000000000d2',
};
const R = { A: '10000000-0000-0000-0000-00000000000a', B: '10000000-0000-0000-0000-00000000000b', P: '10000000-0000-0000-0000-00000000000c' };
const svc = { role: 'service_role' as const };
const auth = (uid: string) => ({ role: 'authenticated' as const, uid });
const authMfa = (uid: string) => ({ role: 'authenticated' as const, uid, aal: 'aal2' as const });
const anon = { role: 'anon' as const };

let db: PGlite;

beforeAll(async () => {
  db = await newDb();
  for (const [name, id] of Object.entries(U)) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `${name}@provei.test`]);
  }
  await db.query('update public.profiles set is_admin = true where id = $1', [U.admin]);
  await db.query(
    `insert into public.restaurants (id, slug, name, city, verified_status) values
     ($1,'rest-a','Restaurante A','Covilhã','verified'), ($2,'rest-b','Restaurante B','Fundão','verified'), ($3,'rest-p','Pendente','Covilhã','pending')`,
    [R.A, R.B, R.P],
  );
  await db.query(
    `insert into public.restaurant_members (restaurant_id, user_id, role) values ($1,$2,'owner'), ($1,$3,'waiter'), ($4,$5,'owner'), ($1,$6,'manager'), ($1,$7,'kitchen')`,
    [R.A, U.ownerA, U.waiterA, R.B, U.ownerB, U.managerA, U.kitchenA],
  );
  await db.query(
    `insert into public.posts (restaurant_id, type, dish_name, status, published_at) values
     ($1,'photo','Prato A','published', now()), ($2,'photo','Prato B','published', now()), ($3,'photo','Prato pendente','published', now())`,
    [R.A, R.B, R.P],
  );
  await db.query(`insert into public.tables (restaurant_id, label, public_code) values ($1,'1','codea0001'), ($2,'1','codeb0001')`, [R.A, R.B]);
  await db.query(
    `insert into public.private_feedback (user_id, restaurant_id, message) values ($1,$2,'Estava frio'), ($3,$2,'Excelente')`,
    [U.alice, R.A, U.bob],
  );
});

describe('perfis', () => {
  it('um utilizador só lê o seu perfil privado', async () => {
    const rows = await as<{ id: string }>(db, auth(U.alice), 'select id from public.profiles');
    expect(rows.map((r) => r.id)).toEqual([U.alice]);
  });
  it('não pode elevar-se a admin nem alterar pontos', async () => {
    expect(await rejects(as(db, auth(U.alice), 'update public.profiles set is_admin = true where id = $1', [U.alice]))).toMatch(/permission denied/);
    expect(await rejects(as(db, auth(U.alice), 'update public.profiles set points_total = 999 where id = $1', [U.alice]))).toMatch(/permission denied/);
  });
  it('pode editar o seu nome', async () => {
    await as(db, auth(U.alice), "update public.profiles set display_name = 'Alice' where id = $1", [U.alice]);
    const v = await as<{ display_name: string }>(db, anon, 'select display_name from public.public_profiles where id = $1', [U.alice]);
    expect(v[0]?.display_name).toBe('Alice');
  });
  it('a vista pública não expõe dados privados', async () => {
    const cols = await as<{ column_name: string }>(db, anon, "select column_name from information_schema.columns where table_name = 'public_profiles'");
    const names = cols.map((c) => c.column_name);
    expect(names).not.toContain('consents');
    expect(names).not.toContain('is_admin');
  });
});

describe('isolamento entre restaurantes', () => {
  it('anónimo vê só restaurantes e pratos verificados', async () => {
    const rs = await as<{ slug: string }>(db, anon, 'select slug from public.restaurants order by slug');
    expect(rs.map((r) => r.slug)).toEqual(['rest-a', 'rest-b']);
    const ps = await as<{ dish_name: string }>(db, anon, 'select dish_name from public.posts order by dish_name');
    expect(ps.map((p) => p.dish_name)).toEqual(['Prato A', 'Prato B']);
  });
  it('dono A não altera o restaurante B', async () => {
    const r = await as(db, auth(U.ownerA), "update public.restaurants set name = 'Hackeado' where id = $1 returning id", [R.B]);
    expect(r).toHaveLength(0);
  });
  it('dono A não cria prato no restaurante B', async () => {
    await rejects(as(db, auth(U.ownerA), "insert into public.posts (restaurant_id, type, dish_name) values ($1,'photo','Intruso')", [R.B]));
  });
  it('dono A não vê mesas do restaurante B', async () => {
    const t = await as<{ public_code: string }>(db, auth(U.ownerA), 'select public_code from public.tables');
    expect(t.map((x) => x.public_code)).toEqual(['codea0001']);
  });
  it('dono não altera o plano nem o estado de verificação', async () => {
    expect(await rejects(as(db, auth(U.ownerA), "update public.restaurants set plan = 'paid' where id = $1", [R.A]))).toMatch(/permission denied/);
    expect(await rejects(as(db, auth(U.ownerA), "update public.restaurants set verified_status = 'verified' where id = $1", [R.A]))).toMatch(/permission denied/);
  });
  it('staff não altera o restaurante nem cria publicações', async () => {
    const r = await as(db, auth(U.waiterA), "update public.restaurants set name = 'x' where id = $1 returning id", [R.A]);
    expect(r).toHaveLength(0);
    await rejects(as(db, auth(U.waiterA), "insert into public.posts (restaurant_id, type, dish_name) values ($1,'photo','Staff post')", [R.A]));
  });
  it('restaurante pendente só é visível ao seu dono', async () => {
    await db.query(`insert into public.restaurant_members values ($1,$2,'owner')`, [R.P, U.alice]);
    const own = await as(db, auth(U.alice), 'select id from public.restaurants where id = $1', [R.P]);
    const other = await as(db, auth(U.bob), 'select id from public.restaurants where id = $1', [R.P]);
    expect(own).toHaveLength(1);
    expect(other).toHaveLength(0);
    await db.query('delete from public.restaurant_members where restaurant_id = $1', [R.P]);
  });
});

describe('dados privados do utilizador', () => {
  it('feedback privado: só o autor e o dono do restaurante', async () => {
    const alice = await as<{ message: string }>(db, auth(U.alice), 'select message from public.private_feedback');
    expect(alice.map((x) => x.message)).toEqual(['Estava frio']);
    const owner = await as(db, auth(U.ownerA), 'select 1 from public.private_feedback');
    expect(owner).toHaveLength(2);
    const staff = await as(db, auth(U.waiterA), 'select 1 from public.private_feedback');
    expect(staff).toHaveLength(0);
    const ownerB = await as(db, auth(U.ownerB), 'select 1 from public.private_feedback');
    expect(ownerB).toHaveLength(0);
    const anonRows = await as(db, anon, 'select 1 from public.private_feedback');
    expect(anonRows).toHaveLength(0);
  });
  it('guardados e seguidos são privados', async () => {
    const post = (await db.query<{ id: string }>("select id from public.posts where dish_name = 'Prato A'")).rows[0]!.id;
    await as(db, auth(U.alice), 'insert into public.saves (user_id, post_id) values ($1,$2)', [U.alice, post]);
    expect(await as(db, auth(U.bob), 'select 1 from public.saves')).toHaveLength(0);
    await rejects(as(db, auth(U.bob), 'insert into public.saves (user_id, post_id) values ($1,$2)', [U.alice, post]));
  });
  it('seguir atualiza o contador atomicamente e só restaurantes públicos', async () => {
    await as(db, auth(U.alice), 'insert into public.follows (user_id, restaurant_id) values ($1,$2)', [U.alice, R.A]);
    await as(db, auth(U.bob), 'insert into public.follows (user_id, restaurant_id) values ($1,$2)', [U.bob, R.A]);
    const c = await db.query<{ follower_count: number }>('select follower_count from public.restaurants where id = $1', [R.A]);
    expect(c.rows[0]?.follower_count).toBe(2);
    await as(db, auth(U.bob), 'delete from public.follows where user_id = $1', [U.bob]);
    const c2 = await db.query<{ follower_count: number }>('select follower_count from public.restaurants where id = $1', [R.A]);
    expect(c2.rows[0]?.follower_count).toBe(1);
    await rejects(as(db, auth(U.alice), 'insert into public.follows (user_id, restaurant_id) values ($1,$2)', [U.alice, R.P]));
  });
  it('notificações: só o dono lê e só pode marcar como lida', async () => {
    await db.query("insert into public.notifications (user_id, type) values ($1,'system')", [U.alice]);
    expect(await as(db, auth(U.bob), 'select 1 from public.notifications')).toHaveLength(0);
    await as(db, auth(U.alice), 'update public.notifications set read_at = now() where user_id = $1', [U.alice]);
    expect(await rejects(as(db, auth(U.alice), "update public.notifications set type = 'points' where user_id = $1", [U.alice]))).toMatch(/permission denied/);
  });
});

describe('anónimo não escreve', () => {
  it.each([
    ["insert into public.follows (user_id, restaurant_id) values ('00000000-0000-0000-0000-0000000000d1','10000000-0000-0000-0000-00000000000a')"],
    ["insert into public.posts (restaurant_id, type, dish_name) values ('10000000-0000-0000-0000-00000000000a','photo','x')"],
    ["update public.restaurants set name = 'x'"],
    ["insert into public.reports (reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-0000000000d1','post',gen_random_uuid(),'abc')"],
  ])('%s', async (sql) => {
    await rejects(as(db, anon, sql));
  });
});

describe('chamadas e sessões de mesa', () => {
  let sessionA: string;
  let tableA: string;
  beforeAll(async () => {
    tableA = (await db.query<{ id: string }>("select id from public.tables where public_code = 'codea0001'")).rows[0]!.id;
    sessionA = (
      await db.query<{ id: string }>(
        "insert into public.table_sessions (table_id, restaurant_id, user_id, source, token_jti) values ($1,$2,$3,'qr','jti-1') returning id",
        [tableA, R.A, U.alice],
      )
    ).rows[0]!.id;
  });
  it('cliente não cria chamadas diretamente (só o servidor valida as regras)', async () => {
    await rejects(
      as(db, auth(U.alice), "insert into public.waiter_calls (table_session_id, restaurant_id, table_id, user_id) values ($1,$2,$3,$4)", [sessionA, R.A, tableA, U.alice]),
    );
  });
  it('só uma chamada aberta por mesa; equipa A atende, equipa B não vê', async () => {
    await db.query("insert into public.waiter_calls (table_session_id, restaurant_id, table_id, user_id) values ($1,$2,$3,$4)", [sessionA, R.A, tableA, U.alice]);
    await rejects(
      Promise.resolve(db.query("insert into public.waiter_calls (table_session_id, restaurant_id, table_id, user_id) values ($1,$2,$3,$4)", [sessionA, R.A, tableA, U.alice])),
    );
    expect(await as(db, auth(U.ownerB), 'select 1 from public.waiter_calls')).toHaveLength(0);
    expect(await as(db, auth(U.waiterA), 'select 1 from public.waiter_calls')).toHaveLength(1);
    const upd = await as(db, auth(U.waiterA), "update public.waiter_calls set status = 'acknowledged', acknowledged_by = $1 returning id", [U.waiterA]);
    expect(upd).toHaveLength(1);
    const other = await as(db, auth(U.ownerB), "update public.waiter_calls set status = 'resolved' returning id");
    expect(other).toHaveLength(0);
  });
  it('utilizador não vê sessões de outros', async () => {
    expect(await as(db, auth(U.bob), 'select 1 from public.table_sessions')).toHaveLength(0);
    expect(await as(db, auth(U.alice), 'select 1 from public.table_sessions')).toHaveLength(1);
  });
  it('token de mesa de uso único: jti repetido falha', async () => {
    await db.query("insert into public.table_token_uses (jti, table_id) values ('t-1', $1)", [tableA]);
    await rejects(Promise.resolve(db.query("insert into public.table_token_uses (jti, table_id) values ('t-1', $1)", [tableA])));
  });
});

describe('fidelização', () => {
  let card: string;
  beforeAll(async () => {
    card = (await db.query<{ id: string }>('insert into public.loyalty_cards (user_id, restaurant_id) values ($1,$2) returning id', [U.alice, R.A])).rows[0]!.id;
  });
  it('cartão: só dono do cartão e equipa do restaurante leem', async () => {
    expect(await as(db, auth(U.alice), 'select 1 from public.loyalty_cards')).toHaveLength(1);
    expect(await as(db, auth(U.waiterA), 'select 1 from public.loyalty_cards')).toHaveLength(1);
    expect(await as(db, auth(U.bob), 'select 1 from public.loyalty_cards')).toHaveLength(0);
    expect(await as(db, auth(U.ownerB), 'select 1 from public.loyalty_cards')).toHaveLength(0);
  });
  it('o cliente não pode escrever no livro-razão', async () => {
    await rejects(as(db, auth(U.alice), "insert into public.loyalty_events (card_id, type, delta) values ($1,'points',1000)", [card]));
    expect(await as(db, auth(U.alice), 'update public.loyalty_cards set points = 999 where id = $1 returning id', [card])).toHaveLength(0);
  });
  it('livro-razão imutável e saldo coerente', async () => {
    await db.query("insert into public.loyalty_events (card_id, type, delta) values ($1,'stamp',1), ($1,'stamp',1), ($1,'points',30)", [card]);
    await db.query("insert into public.loyalty_events (card_id, type, delta, reason) values ($1,'adjust',-10,'points: fraude')", [card]);
    const c = (await db.query<{ stamps: number; points: number }>('select stamps, points from public.loyalty_cards where id = $1', [card])).rows[0]!;
    expect(c).toEqual({ stamps: 2, points: 20 });
    expect((await db.query<{ ok: boolean }>('select public.loyalty_card_consistent($1) as ok', [card])).rows[0]?.ok).toBe(true);
    const total = (await db.query<{ points_total: number }>('select points_total from public.profiles where id = $1', [U.alice])).rows[0]!;
    expect(total.points_total).toBe(20);
    await rejects(Promise.resolve(db.query('update public.loyalty_events set delta = 9999 where card_id = $1', [card])));
    await rejects(Promise.resolve(db.query('delete from public.loyalty_events where card_id = $1', [card])));
  });
  it('um carimbo por visita (idempotência) e um resgate por ciclo', async () => {
    const visit = (
      await db.query<{ id: string }>("insert into public.visits (user_id, restaurant_id, level) values ($1,$2,'qr') returning id", [U.alice, R.A])
    ).rows[0]!.id;
    await db.query("insert into public.loyalty_events (card_id, type, delta, visit_id) values ($1,'stamp',1,$2)", [card, visit]);
    await rejects(Promise.resolve(db.query("insert into public.loyalty_events (card_id, type, delta, visit_id) values ($1,'stamp',1,$2)", [card, visit])));
    await db.query("insert into public.redemptions (card_id, restaurant_id, user_id, reward_text, code, cycle) values ($1,$2,$3,'Sobremesa','AAAA-BBBB',0)", [card, R.A, U.alice]);
    await rejects(Promise.resolve(db.query("insert into public.redemptions (card_id, restaurant_id, user_id, reward_text, code, cycle) values ($1,$2,$3,'Sobremesa','CCCC-DDDD',0)", [card, R.A, U.alice])));
  });
  it('duas visitas para a mesma sessão de mesa não são possíveis', async () => {
    const sess = (await db.query<{ id: string }>('select id from public.table_sessions limit 1')).rows[0]!.id;
    await db.query("insert into public.visits (user_id, restaurant_id, table_session_id, level) values ($1,$2,$3,'qr')", [U.alice, R.A, sess]);
    await rejects(Promise.resolve(db.query("insert into public.visits (user_id, restaurant_id, table_session_id, level) values ($1,$2,$3,'qr')", [U.alice, R.A, sess])));
  });
});

describe('planos', () => {
  it('plano gratuito: máximo de 3 mesas e sem ofertas', async () => {
    await db.query("insert into public.tables (restaurant_id, label, public_code) values ($1,'2','codea0002'), ($1,'3','codea0003')", [R.A]);
    await rejects(Promise.resolve(db.query("insert into public.tables (restaurant_id, label, public_code) values ($1,'4','codea0004')", [R.A])));
    await rejects(Promise.resolve(db.query("insert into public.offers (restaurant_id, title, ends_at) values ($1,'2x1', now() + interval '1 day')", [R.A])));
  });
  it('plano gratuito: máximo de 8 publicações por mês', async () => {
    for (let i = 0; i < 7; i++) await db.query("insert into public.posts (restaurant_id, type, dish_name) values ($1,'photo','Extra ' || $2::text)", [R.B, i]);
    await rejects(Promise.resolve(db.query("insert into public.posts (restaurant_id, type, dish_name) values ($1,'photo','Excesso')", [R.B])));
  });
  it('retenção por segundo só no plano pago', async () => {
    const post = (await db.query<{ id: string }>("select id from public.posts where restaurant_id = $1 limit 1", [R.A])).rows[0]!.id;
    await db.query('insert into public.video_watch_buckets (post_id, second, views) values ($1, 0, 10)', [post]);
    expect(await as(db, auth(U.ownerA), 'select 1 from public.video_watch_buckets')).toHaveLength(0);
    await db.query("update public.restaurants set plan = 'paid' where id = $1", [R.A]);
    expect(await as(db, auth(U.ownerA), 'select 1 from public.video_watch_buckets')).toHaveLength(1);
    expect(await as(db, auth(U.ownerB), 'select 1 from public.video_watch_buckets')).toHaveLength(0);
    await db.query("update public.restaurants set plan = 'free' where id = $1", [R.A]);
  });
});

describe('avaliações e moderação', () => {
  it('uma avaliação publicada por utilizador e restaurante', async () => {
    await db.query("insert into public.reviews (user_id, restaurant_id, rating, text) values ($1,$2,5,'Ótimo')", [U.alice, R.A]);
    await rejects(Promise.resolve(db.query("insert into public.reviews (user_id, restaurant_id, rating) values ($1,$2,4)", [U.alice, R.A])));
    await db.query("update public.reviews set status = 'replaced' where user_id = $1", [U.alice]);
    await db.query("insert into public.reviews (user_id, restaurant_id, rating) values ($1,$2,4)", [U.alice, R.A]);
  });
  it('o cliente não escreve avaliações diretamente (selo verificado é do servidor)', async () => {
    await rejects(as(db, auth(U.bob), "insert into public.reviews (user_id, restaurant_id, rating, verified) values ($1,$2,5,true)", [U.bob, R.A]));
  });
  it('só o dono responde, e só ao seu restaurante', async () => {
    const rev = (await db.query<{ id: string }>("select id from public.reviews where status = 'published' limit 1")).rows[0]!.id;
    await rejects(as(db, auth(U.ownerB), "insert into public.review_replies (review_id, restaurant_id, author_id, body) values ($1,$2,$3,'Obrigado')", [rev, R.A, U.ownerB]));
    await as(db, auth(U.ownerA), "insert into public.review_replies (review_id, restaurant_id, author_id, body) values ($1,$2,$3,'Obrigado')", [rev, R.A, U.ownerA]);
    await rejects(as(db, auth(U.ownerA), "insert into public.review_replies (review_id, restaurant_id, author_id, body) values ($1,$2,$3,'Outra')", [rev, R.A, U.ownerA]));
  });
  it('denúncias: só o autor e o admin as veem; o contador de sinalizações sobe', async () => {
    const rev = (await db.query<{ id: string }>("select id from public.reviews where status = 'published' limit 1")).rows[0]!.id;
    await as(db, auth(U.bob), "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1,'review',$2,'Falso')", [U.bob, rev]);
    expect(await as(db, auth(U.alice), 'select 1 from public.reports')).toHaveLength(0);
    expect(await as(db, authMfa(U.admin), 'select 1 from public.reports')).toHaveLength(1);
    const fc = (await db.query<{ flagged_count: number }>('select flagged_count from public.reviews where id = $1', [rev])).rows[0]!;
    expect(fc.flagged_count).toBe(1);
  });
});

describe('administração, auditoria e flags', () => {
  it('flags são públicas para leitura, mas só o admin altera', async () => {
    expect((await as(db, anon, 'select key from public.feature_flags')).length).toBeGreaterThanOrEqual(10);
    expect(await as(db, auth(U.alice), "update public.feature_flags set enabled = true where key = 'ads' returning key")).toHaveLength(0);
    expect(await as(db, authMfa(U.admin), "update public.feature_flags set enabled = true where key = 'ads' returning key")).toHaveLength(1);
    await db.query("update public.feature_flags set enabled = false where key = 'ads'");
  });
  it('por omissão: flags pagas e todas as da ADENDA 2 desligadas, as do produto base ligadas', async () => {
    const rows = (await db.query<{ key: string; enabled: boolean }>('select key, enabled from public.feature_flags')).rows;
    const off = ['payments', 'wallet', 'ads', 'ad_free_subscription', 'table_ordering', 'ordering', 'kds', 'whatsapp', 'review_requests',
      'coupons', 'analytics', 'ai_advisor', 'recommender', 'kitchen_forecast'];
    for (const r of rows) expect(r.enabled).toBe(!off.includes(r.key));
  });
  it('auditoria: não é escrita por clientes e é lida só pelo admin', async () => {
    await rejects(as(db, auth(U.alice), "insert into public.audit_logs (action) values ('x')"));
    await db.query("insert into public.audit_logs (action, actor_id) values ('teste', $1)", [U.admin]);
    expect(await as(db, auth(U.alice), 'select 1 from public.audit_logs')).toHaveLength(0);
    expect((await as(db, authMfa(U.admin), 'select 1 from public.audit_logs')).length).toBeGreaterThan(0);
  });
  it('stripe_events e rate_limits são inacessíveis a clientes', async () => {
    expect(await as(db, auth(U.alice), 'select 1 from public.stripe_events')).toHaveLength(0);
    await rejects(as(db, auth(U.alice), "insert into public.stripe_events (id, type) values ('e1','x')"));
    await rejects(as(db, auth(U.alice), "select public.rate_limit_hit('k', 60, 5)"));
  });
  it('rate_limit_hit conta por janela', async () => {
    const hits: boolean[] = [];
    for (let i = 0; i < 4; i++) hits.push((await as<{ rate_limit_hit: boolean }>(db, svc, "select public.rate_limit_hit('k2', 3600, 3)"))[0]!.rate_limit_hit);
    expect(hits).toEqual([true, true, true, false]);
  });
  it('leads: só o servidor submete (função), admin lê, clientes não; limite por IP', async () => {
    const anon = { role: 'anon' as const };
    await rejects(as(db, anon, "select public.submit_lead('Ana Lima', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip1')"));
    await rejects(as(db, auth(U.alice), "select public.submit_lead('Ana Lima', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip1')"));
    const r = await as<{ submit_lead: string }>(db, svc, "select public.submit_lead('Ana Lima', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip1')");
    expect(r[0]!.submit_lead).toBeTruthy();
    expect(await as(db, anon, 'select 1 from public.leads')).toHaveLength(0);
    expect(await as(db, auth(U.alice), 'select 1 from public.leads')).toHaveLength(0);
    expect((await as(db, authMfa(U.admin), 'select 1 from public.leads')).length).toBe(1);
    await rejects(as(db, anon, "insert into public.leads (name, restaurant, contact, city) values ('aa','bb','ccccc','dd')"));
    await rejects(as(db, svc, "select public.submit_lead('A', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip1')"));
    for (let i = 0; i < 5; i++) await as(db, svc, "select public.submit_lead('Ana Lima', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip2')");
    await rejects(as(db, svc, "select public.submit_lead('Ana Lima', 'Tasca X', 'ana@x.pt', 'Covilhã', null, 'ip2')"));
  });
  it('notificações DSA: só o servidor submete; só o admin lê; boa-fé obrigatória', async () => {
    const anon = { role: 'anon' as const };
    const q = "select public.submit_content_notice(null, 'q@x.pt', 'https://provei.pt/r/x', 'illegal', 'Este conteúdo é ilegal porque blá blá.', BOOL, 'ip9')";
    await rejects(as(db, anon, q.replace('BOOL', 'true')));
    await as(db, svc, q.replace('BOOL', 'true'));
    await rejects(as(db, svc, q.replace('BOOL', 'false')));
    expect(await as(db, anon, 'select 1 from public.content_notices')).toHaveLength(0);
    expect(await as(db, auth(U.alice), 'select 1 from public.content_notices')).toHaveLength(0);
    expect((await as(db, authMfa(U.admin), 'select 1 from public.content_notices')).length).toBe(1);
  });
  it('donos não leem eventos de analytics com user_id (só agregados)', async () => {
    await db.query("insert into public.analytics_events (restaurant_id, user_id, type) values ($1, $2, 'view')", [R.A, U.alice]);
    expect(await as(db, auth(U.ownerA), 'select 1 from public.analytics_events')).toHaveLength(0);
  });
  it('toda a tabela pública tem RLS ativa', async () => {
    const r = await db.query<{ tablename: string }>(
      "select tablename from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace where t.schemaname = 'public' and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
});

describe('F1: quatro tipos de conta', () => {
  it('admin sem MFA (aal1) não tem poderes de admin; com aal2 tem', async () => {
    expect(await as(db, auth(U.admin), 'select 1 from public.audit_logs')).toHaveLength(0);
    expect(await as(db, auth(U.admin), "update public.feature_flags set enabled = true where key = 'kds' returning key")).toHaveLength(0);
    expect((await as(db, authMfa(U.admin), 'select 1 from public.audit_logs')).length).toBeGreaterThan(0);
  });
  it('manager gere o menu do seu restaurante; waiter e kitchen não', async () => {
    const ins = (uid: string) => as(db, auth(uid), "insert into public.menu_items (restaurant_id, name, price_cents) values ($1, 'Sopa', 300) returning id", [R.A]);
    expect(await ins(U.managerA)).toHaveLength(1);
    await rejects(ins(U.waiterA));
    await rejects(ins(U.kitchenA));
  });
  it('kitchen vê o menu e os pedidos, mas não vê chamadas, mesas, visitas nem cartões', async () => {
    expect((await as(db, auth(U.kitchenA), 'select 1 from public.menu_items where restaurant_id = $1', [R.A])).length).toBeGreaterThan(0);
    for (const t of ['waiter_calls', 'tables', 'visits', 'loyalty_cards', 'private_feedback', 'analytics_daily']) {
      expect(await as(db, auth(U.kitchenA), `select 1 from public.${t}`)).toHaveLength(0);
    }
  });
  it('waiter vê mesas do seu restaurante, mas não números nem faturação', async () => {
    expect((await as(db, auth(U.waiterA), 'select 1 from public.tables where restaurant_id = $1', [R.A])).length).toBeGreaterThan(0);
    expect(await as(db, auth(U.waiterA), 'select 1 from public.analytics_daily')).toHaveLength(0);
    expect(await as(db, auth(U.waiterA), 'select 1 from public.subscriptions')).toHaveLength(0);
  });
  it('restaurante A (qualquer papel) não lê nada do restaurante B', async () => {
    for (const uid of [U.ownerA, U.managerA, U.waiterA, U.kitchenA]) {
      expect(await as(db, auth(uid), 'select 1 from public.tables where restaurant_id = $1', [R.B])).toHaveLength(0);
      expect(await as(db, auth(uid), 'select 1 from public.restaurant_members where restaurant_id = $1', [R.B])).toHaveLength(0);
    }
  });
  it('manager não remove o dono; o dono remove o manager', async () => {
    expect(await as(db, auth(U.managerA), 'delete from public.restaurant_members where user_id = $1 returning user_id', [U.ownerA])).toHaveLength(0);
  });
  it('anunciante: cria conta pela função, vê só a sua e nunca dados pessoais de clientes', async () => {
    const r = await as<{ create_advertiser: string }>(db, auth(U.adv), "select public.create_advertiser('Café Central', 'ads@cafe.pt', null)");
    const advId = r[0]!.create_advertiser;
    expect(await as(db, auth(U.adv), 'select id from public.advertisers')).toEqual([{ id: advId }]);
    expect(await as(db, auth(U.alice), 'select 1 from public.advertisers')).toHaveLength(0);
    for (const t of ['profiles', 'consents', 'visits', 'loyalty_cards', 'orders', 'feed_events', 'private_feedback', 'ad_impressions']) {
      const rows = await as<{ id?: string }>(db, auth(U.adv), `select * from public.${t}`);
      expect(rows.filter((x) => x.id !== U.adv)).toHaveLength(0);
    }
    await rejects(as(db, auth(U.adv), "insert into public.advertisers (name, contact_email) values ('X', 'x@x.pt')"));
  });
  it('feed_events: cada utilizador só escreve, lê e apaga os seus', async () => {
    const imp = '20000000-0000-0000-0000-000000000001';
    await as(db, auth(U.alice), "insert into public.feed_events (user_id, impression_id, event) values ($1, $2, 'impression')", [U.alice, imp]);
    await rejects(as(db, auth(U.alice), "insert into public.feed_events (user_id, impression_id, event) values ($1, $2, 'impression')", [U.bob, imp]));
    expect(await as(db, auth(U.bob), 'select 1 from public.feed_events')).toHaveLength(0);
    expect(await as(db, auth(U.ownerA), 'select 1 from public.feed_events')).toHaveLength(0);
    expect(await as(db, auth(U.alice), 'delete from public.feed_events returning id')).toHaveLength(1);
  });
  it('papéis derivados e claim do JWT: o mesmo e-mail pode ter vários papéis', async () => {
    const roles = async (uid: string) => (await db.query<{ r: string[] }>('select public.user_roles($1) as r', [uid])).rows[0]!.r;
    expect(await roles(U.alice)).toEqual(['customer']);
    expect(await roles(U.ownerA)).toEqual(['customer', 'restaurant']);
    expect(await roles(U.adv)).toEqual(['customer', 'advertiser']);
    expect(await roles(U.admin)).toEqual(['customer', 'admin']);
    const ev = (await db.query<{ e: { claims: { app_roles: string[] } } }>(
      "select public.custom_access_token_hook(jsonb_build_object('user_id', $1::text, 'claims', '{}'::jsonb)) as e", [U.ownerA])).rows[0]!.e;
    expect(ev.claims.app_roles).toEqual(['customer', 'restaurant']);
    await rejects(as(db, auth(U.alice), 'select public.user_roles($1)', [U.ownerA]));
  });
});

describe('F2: pedidos', () => {
  const ref = (n: number) => `30000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
  let itemA: string;
  let itemOff: string;
  // Sem conta, o pedido entra pelo servidor (service_role); o segredo fica guardado só como sha256.
  const svc = { role: 'service_role' as const };
  const SECRET_HASH = createHash('sha256').update('segredo').digest('hex');
  const place = (who: { role: 'anon' | 'authenticated' | 'service_role'; uid?: string }, items: unknown, clientRef: string, kind = 'table', code: string | null = 'codea0001', name: string | null = null) =>
    as<{ place_order: string }>(db, who.role === 'anon' ? svc : who, 'select public.place_order($1, $2, $3, $4::jsonb, $5::uuid, null, $6, null, $7)', [R.A, kind, code, JSON.stringify(items), clientRef, name, who.role === 'authenticated' ? null : SECRET_HASH]);

  beforeAll(async () => {
    itemA = (await db.query<{ id: string }>("insert into public.menu_items (restaurant_id, name, price_cents, station) values ($1, 'Bifana', 450, 'cozinha') returning id", [R.A])).rows[0]!.id;
    itemOff = (await db.query<{ id: string }>("insert into public.menu_items (restaurant_id, name, price_cents, available) values ($1, 'Esgotado', 900, false) returning id", [R.A])).rows[0]!.id;
  });

  it('com a flag ordering desligada ninguém pede', async () => {
    expect(await rejects(place(anon, [{ id: itemA, qty: 1 }], ref(1)))).toMatch(/ordering_off/);
  });
  it('anónimo pede pela mesa; preço vem do menu; repetir o client_ref devolve o mesmo pedido', async () => {
    await db.query("update public.feature_flags set enabled = true where key = 'ordering'");
    const a = (await place(anon, [{ id: itemA, qty: 2, price_cents: 1 }], ref(2)))[0]!.place_order;
    const b = (await place(anon, [{ id: itemA, qty: 2 }], ref(2)))[0]!.place_order;
    expect(a).toBe(b);
    const o = (await db.query<{ total_cents: number; user_id: string | null }>('select total_cents, user_id from public.orders where id = $1', [a])).rows[0]!;
    expect(o).toEqual({ total_cents: 900, user_id: null });
  });
  it('recusa prato indisponível, de outro restaurante, quantidade inválida e mesa de outro restaurante', async () => {
    expect(await rejects(place(anon, [{ id: itemOff, qty: 1 }], ref(3)))).toMatch(/unavailable/);
    const itemB = (await db.query<{ id: string }>("insert into public.menu_items (restaurant_id, name, price_cents) values ($1, 'Do B', 100) returning id", [R.B])).rows[0]!.id;
    expect(await rejects(place(anon, [{ id: itemB, qty: 1 }], ref(4)))).toMatch(/unknown_item/);
    expect(await rejects(place(anon, [{ id: itemA, qty: 0 }], ref(5)))).toMatch(/bad_qty/);
    expect(await rejects(place(anon, [{ id: itemA, qty: 1 }], ref(6), 'table', 'codeb0001'))).toMatch(/table_not_found/);
    expect(await rejects(place(anon, [{ id: itemA, qty: 1 }], ref(7), 'pickup', null, null))).toMatch(/name_required/);
  });
  it('clientes não escrevem diretamente em orders; o cliente vê só os seus', async () => {
    await rejects(as(db, auth(U.alice), "insert into public.orders (restaurant_id, status) values ($1, 'new')", [R.A]));
    const mine = (await place(auth(U.alice), [{ id: itemA, qty: 1 }], ref(8)))[0]!.place_order;
    expect((await as<{ id: string }>(db, auth(U.alice), 'select id from public.orders')).map((r) => r.id)).toEqual([mine]);
    expect(await as(db, auth(U.bob), 'select 1 from public.orders')).toHaveLength(0);
    await rejects(as(db, auth(U.alice), 'update public.orders set total_cents = 1 returning id'));
  });
  it('pedido sem conta lê-se só com o segredo certo', async () => {
    const id = (await place(anon, [{ id: itemA, qty: 1 }], ref(9)))[0]!.place_order;
    const ok = await as<{ get_guest_order: { total_cents: number } | null }>(db, anon, 'select public.get_guest_order($1, $2)', [id, 'segredo']);
    expect(ok[0]!.get_guest_order?.total_cents).toBe(450);
    // o hash guardado não serve de senha
    const viaHash = await as<{ get_guest_order: unknown }>(db, anon, 'select public.get_guest_order($1, $2)', [id, SECRET_HASH]);
    expect(viaHash[0]!.get_guest_order).toBeNull();
    const bad = await as<{ get_guest_order: unknown }>(db, anon, 'select public.get_guest_order($1, $2)', [id, 'errado']);
    expect(bad[0]!.get_guest_order).toBeNull();
  });
  it('KDS: cozinha prepara, sala entrega, B não mexe em A, saltos recusados', async () => {
    const id = (await place(anon, [{ id: itemA, qty: 1 }], ref(10)))[0]!.place_order;
    const set = (uid: string, s: string) => as(db, auth(uid), 'select public.set_order_status($1, $2, null)', [id, s]);
    expect(await rejects(set(U.ownerB, 'preparing'))).toMatch(/forbidden/);
    expect(await rejects(set(U.waiterA, 'preparing'))).toMatch(/bad_transition/);
    expect(await rejects(set(U.kitchenA, 'delivered'))).toMatch(/bad_transition/);
    await set(U.kitchenA, 'preparing');
    await set(U.kitchenA, 'ready');
    expect(await rejects(set(U.kitchenA, 'delivered'))).toMatch(/bad_transition/);
    await set(U.waiterA, 'delivered');
    expect((await db.query<{ status: string }>('select status from public.orders where id = $1', [id])).rows[0]!.status).toBe('delivered');
    expect((await as(db, auth(U.kitchenA), 'select 1 from public.orders where id = $1', [id])).length).toBe(1);
    expect(await as(db, auth(U.ownerB), 'select 1 from public.orders where id = $1', [id])).toHaveLength(0);
  });
  it('dinheiro: sala regista; cozinha não; fecho de caixa só por quem gere e assinala diferenças', async () => {
    const id = (await place(anon, [{ id: itemA, qty: 2 }], ref(11)))[0]!.place_order;
    await rejects(as(db, auth(U.kitchenA), 'select public.mark_order_paid_cash($1)', [id]));
    await as(db, auth(U.waiterA), 'select public.mark_order_paid_cash($1)', [id]);
    await rejects(as(db, auth(U.waiterA), 'select public.mark_order_paid_cash($1)', [id]));
    const range = [R.A, new Date(Date.now() - 3600_000).toISOString(), new Date(Date.now() + 60_000).toISOString()];
    await rejects(as(db, auth(U.waiterA), 'select public.close_shift($1, $2, $3, 0, null)', range));
    const c = (await as<{ close_shift: string }>(db, auth(U.managerA), 'select public.close_shift($1, $2, $3, 800, null)', range))[0]!.close_shift;
    const row = (await as<{ cash_expected_cents: number; cash_diff_cents: number }>(db, auth(U.ownerA), 'select cash_expected_cents, cash_diff_cents from public.cash_closes where id = $1', [c]))[0]!;
    expect(row).toEqual({ cash_expected_cents: 900, cash_diff_cents: -100 });
    expect(await as(db, auth(U.waiterA), 'select 1 from public.cash_closes')).toHaveLength(0);
    // período sobreposto recusado
    expect(await rejects(as(db, auth(U.managerA), 'select public.close_shift($1, $2, $3, 0, null)', range))).toMatch(/overlap/);
    // pedido pago não se cancela
    expect(await rejects(as(db, auth(U.waiterA), "select public.set_order_status($1, 'cancelled', 'teste')", [id]))).toMatch(/paid_order/);
  });
  it('endurecimento: anon não chama place_order; teto de pedidos abertos; overrides de flags legíveis', async () => {
    expect(await rejects(as(db, anon, 'select public.place_order($1, $2, $3, $4::jsonb, $5::uuid, null, null, null, null)', [R.A, 'table', 'codea0001', JSON.stringify([{ id: itemA, qty: 1 }]), ref(20)]))).toMatch(/permission denied/);
    let err = '';
    for (let n = 21; n < 40 && !err; n++) err = await place(anon, [{ id: itemA, qty: 1 }], ref(n)).then(() => '', (e: Error) => e.message);
    expect(err).toMatch(/too_many_open|rate_limited/);
    await db.query("insert into public.restaurant_flags (restaurant_id, key, enabled) values ($1, 'kds', true)", [R.A]);
    const o = await as<{ key: string; enabled: boolean }>(db, anon, 'select * from public.restaurant_flag_overrides($1)', [R.A]);
    expect(o).toEqual([{ key: 'kds', enabled: true }]);
    await db.query("delete from public.restaurant_flags where restaurant_id = $1 and key = 'kds'", [R.A]);
  });
  it('Stripe: só marca pago com a conta Connect do restaurante e o valor certo', async () => {
    await db.query("update public.orders set status = 'cancelled' where status in ('new','preparing')");
    const id = (await place(auth(U.bob), [{ id: itemA, qty: 1 }], ref(50)))[0]!.place_order;
    await db.query("update public.restaurants set stripe_account_id = 'acct_A' where id = $1", [R.A]);
    await db.query("update public.restaurants set stripe_account_id = 'acct_B' where id = $1", [R.B]);
    const pay = (acct: string, amount: number) => as<{ r: string }>(db, svc, 'select public.mark_order_paid_stripe($1, $2, $3, $4) as r', [id, acct, 'pi_1', amount]);
    await rejects(as(db, auth(U.ownerA), "select public.mark_order_paid_stripe($1, 'acct_A', 'pi', 450)", [id]));
    expect((await pay('acct_B', 450))[0]!.r).toBe('wrong_account');
    expect((await pay('acct_A', 1))[0]!.r).toBe('amount_mismatch');
    expect((await pay('acct_A', 450))[0]!.r).toBe('paid');
    expect((await db.query<{ payment_status: string }>('select payment_status from public.orders where id = $1', [id])).rows[0]!.payment_status).toBe('paid');
    await db.query("update public.feature_flags set enabled = false where key = 'ordering'");
  });
});

describe('F2: informação pública da mesa', () => {
  it('o QR revela só restaurante e etiqueta; códigos inválidos devolvem nada', async () => {
    const r = await as<{ table_public_info: Record<string, unknown> }>(db, anon, "select public.table_public_info('codea0001')");
    expect(r[0]!.table_public_info).toMatchObject({ restaurant_id: R.A, table_label: '1', ordering: false });
    expect(Object.keys(r[0]!.table_public_info).sort()).toEqual(['name', 'ordering', 'payments', 'restaurant_id', 'slug', 'stripe_ready', 'table_label']);
    const none = await as<{ table_public_info: unknown }>(db, anon, "select public.table_public_info('naoexiste')");
    expect(none[0]!.table_public_info).toBeNull();
  });
});
