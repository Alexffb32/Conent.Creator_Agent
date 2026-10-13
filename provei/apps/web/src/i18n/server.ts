import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { dictionaries, format, type DictKey, type Locale } from './dictionaries';

export const LOCALE_COOKIE = 'pv_lang';

/**
 * Idioma: ?lang= (via cabeçalho do middleware) ou cookie `pv_lang`; por omissão pt.
 * Não negociamos por Accept-Language: o mesmo URL serviria duas línguas e confundiria canonical/hreflang.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const h = (await headers()).get('x-pv-lang');
  if (h === 'pt' || h === 'en') return h;
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return c === 'en' ? 'en' : 'pt';
});

export async function getT() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, t: (key: DictKey, vars?: Record<string, string | number>) => format(dict[key], vars), dict };
}
