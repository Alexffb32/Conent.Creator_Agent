import 'server-only';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; field?: string };

export class UserError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, field?: string): ActionResult<never> => ({ ok: false, error, field });

export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  try {
    return schema.parse(input);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.issues[0];
      throw new UserError(first?.message ?? 'Dados inválidos', first?.path.join('.') || undefined);
    }
    throw e;
  }
}

/** Embrulha uma ação: erros de utilizador viram mensagens claras em pt-PT; o resto não vaza detalhes. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.field);
    // NEXT_REDIRECT e similares têm de continuar a propagar
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
    console.error('[action]', e);
    return fail('Algo correu mal. Tenta outra vez dentro de momentos.');
  }
}

export function formDataToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}
