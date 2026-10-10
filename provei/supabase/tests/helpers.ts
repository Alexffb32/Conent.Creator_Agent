import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

export async function newDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(here, 'bootstrap.sql'), 'utf8'));
  for (const f of readdirSync(migrationsDir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  return db;
}

/** Executa SQL como um papel (anon/authenticated/service_role) e utilizador. */
export async function as<T = Record<string, unknown>>(
  db: PGlite,
  who: { role: 'anon' | 'authenticated' | 'service_role'; uid?: string },
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await db.exec(`set role ${who.role}`);
  await db.exec(`select set_config('request.jwt.claim.sub', '${who.uid ?? ''}', false)`);
  try {
    const r = await db.query<T>(sql, params);
    return r.rows;
  } finally {
    await db.exec('reset role');
  }
}

export async function rejects(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('Esperava-se um erro (política RLS), mas a operação passou');
}
