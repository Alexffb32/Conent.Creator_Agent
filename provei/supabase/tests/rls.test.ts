import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { as, newDb, rejects } from './helpers';

const U = {
  admin: '00000000-0000-0000-0000-0000000000a1',
  ownerA: '00000000-0000-0000-0000-0000000000b1',
  ownerB: '00000000-0000-0000-0000-0000000000b2',
  staffA: '00000000-0000-0000-0000-0000000000c1',
  alice: '00000000-0000-0000-0000-0000000000d1',
  bob: '00000000-0000-0000-0000-0000000000d2',
};
const R = { A: '10000000-0000-0000-0000-00000000000a', B: '10000000-0000-0000-0000-00000000000b', P: '10000000-0000-0000-0000-00000000000c' };
const svc = { role: 'service_role' as const };
const auth = (uid: string) => ({ role: 'authenticated' as const, uid });
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
    `insert into public.restaurant_members (restaurant_id, user_id, role) values ($1,$2,'owner'), ($1,$3,'staff'), ($4,$5,'owner')`,
    [R.A, U.ownerA, U.staffA, R.B, U.ownerB],
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
    const r = await as(db, auth(U.staffA), "update public.restaurants set name = 'x' where id = $1 returning id", [R.A]);
    expect(r).toHaveLength(0);
    await rejects(as(db, auth(U.staffA), "insert into public.posts (restaurant_id, type, dish_name) values ($1,'photo','Staff post')", [R.A]));
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
    const staff = await as(db, auth(U.staffA), 'select 1 from public.private_feedback');
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
    expect(await as(db, auth(U.staffA), 'select 1 from public.waiter_calls')).toHaveLength(1);
    const upd = await as(db, auth(U.staffA), "update public.waiter_calls set status = 'acknowledged', acknowledged_by = $1 returning id", [U.staffA]);
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
    expect(await as(db, auth(U.staffA), 'select 1 from public.loyalty_cards')).toHaveLength(1);
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
    expect(await as(db, auth(U.admin), 'select 1 from public.reports')).toHaveLength(1);
    const fc = (await db.query<{ flagged_count: number }>('select flagged_count from public.reviews where id = $1', [rev])).rows[0]!;
    expect(fc.flagged_count).toBe(1);
  });
});

describe('administração, auditoria e flags', () => {
  it('flags são públicas para leitura, mas só o admin altera', async () => {
    expect((await as(db, anon, 'select key from public.feature_flags')).length).toBeGreaterThanOrEqual(10);
    expect(await as(db, auth(U.alice), "update public.feature_flags set enabled = true where key = 'ads' returning key")).toHaveLength(0);
    expect(await as(db, auth(U.admin), "update public.feature_flags set enabled = true where key = 'ads' returning key")).toHaveLength(1);
    await db.query("update public.feature_flags set enabled = false where key = 'ads'");
  });
  it('por omissão: payments/wallet/ads/ad_free/table_ordering desligadas, as restantes ligadas', async () => {
    const rows = (await db.query<{ key: string; enabled: boolean }>('select key, enabled from public.feature_flags')).rows;
    const off = ['payments', 'wallet', 'ads', 'ad_free_subscription', 'table_ordering'];
    for (const r of rows) expect(r.enabled).toBe(!off.includes(r.key));
  });
  it('auditoria: não é escrita por clientes e é lida só pelo admin', async () => {
    await rejects(as(db, auth(U.alice), "insert into public.audit_logs (action) values ('x')"));
    await db.query("insert into public.audit_logs (action, actor_id) values ('teste', $1)", [U.admin]);
    expect(await as(db, auth(U.alice), 'select 1 from public.audit_logs')).toHaveLength(0);
    expect((await as(db, auth(U.admin), 'select 1 from public.audit_logs')).length).toBeGreaterThan(0);
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
  it('toda a tabela pública tem RLS ativa', async () => {
    const r = await db.query<{ tablename: string }>(
      "select tablename from pg_tables t join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace where t.schemaname = 'public' and not c.relrowsecurity",
    );
    expect(r.rows).toEqual([]);
  });
});
