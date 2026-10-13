import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { newDb } from './helpers';

const seedSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'seed.sql'), 'utf8');

describe('seed.sql', () => {
  it('cria os dados de exemplo, é idempotente e o livro-razão fica coerente', async () => {
    const db = await newDb();
    await db.exec(seedSql);
    await db.exec(seedSql); // segunda vez não faz nada
    const count = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0]!.n);
    expect(await count('select count(*) n from public.restaurants where is_demo')).toBe(12);
    expect(await count('select count(*) n from public.posts')).toBe(40);
    expect(await count('select count(*) n from public.profiles where is_demo')).toBe(20);
    expect(await count('select count(*) n from public.ad_campaigns where is_demo')).toBe(3);
    expect(await count("select count(*) n from public.restaurant_members m join public.profiles p on p.id = m.user_id where p.handle = 'dono' and m.role = 'owner'")).toBe(2);
    expect(await count("select count(*) n from public.profiles where handle = 'admin' and is_admin")).toBe(1);
    expect(await count('select count(*) n from public.tables')).toBe(36);
    expect(await count('select count(*) n from public.loyalty_cards')).toBeGreaterThan(5);
    expect(await count('select count(*) n from public.loyalty_cards c where not public.loyalty_card_consistent(c.id)')).toBe(0);
    expect(await count("select count(*) n from public.reviews where not is_demo")).toBe(0);
  });
});
