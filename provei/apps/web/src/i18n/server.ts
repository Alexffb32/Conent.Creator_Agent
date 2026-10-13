import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { dictionaries, format, type DictKey, type Locale } from './dictionaries';

export const LOCALE_COOKIE = 'pv_lang';

/** Idioma: cookie `pv_lang` (definido por ?lang= no middleware) ou Accept-Language; por omissão pt. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (c === 'pt' || c === 'en') return c;
  const h = (await headers()).get('x-pv-lang');
  if (h === 'pt' || h === 'en') return h;
  const al = (await headers()).get('accept-language') ?? '';
  return /^en\b/i.test(al.trim()) ? 'en' : 'pt';
});

export async function getT() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, t: (key: DictKey, vars?: Record<string, string | number>) => format(dict[key], vars), dict };
}
