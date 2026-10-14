import type { Metadata } from 'next';
import { publicEnv } from './env';
import type { Locale } from '@/i18n/dictionaries';

/** Canonical por idioma (a versão EN aponta para si própria) e hreflang com URLs absolutos. */
export function localeAlternates(path: string, locale: Locale): Metadata['alternates'] {
  const base = publicEnv.siteUrl.replace(/\/$/, '');
  const pt = `${base}${path}`;
  const en = `${base}${path}${path.includes('?') ? '&' : '?'}lang=en`;
  return { canonical: locale === 'en' ? en : pt, languages: { 'pt-PT': pt, en, 'x-default': pt } };
}
