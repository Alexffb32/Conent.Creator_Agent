'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { format, type Dict, type DictKey, type Locale } from './dictionaries';

const Ctx = createContext<{ locale: Locale; dict: Dict } | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: ReactNode }) {
  return <Ctx.Provider value={{ locale, dict }}>{children}</Ctx.Provider>;
}

export function useT() {
  const v = useContext(Ctx);
  if (!v) throw new Error('I18nProvider em falta');
  return { locale: v.locale, t: (key: DictKey, vars?: Record<string, string | number>) => format(v.dict[key], vars) };
}
