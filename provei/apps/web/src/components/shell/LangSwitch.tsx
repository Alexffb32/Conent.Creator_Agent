'use client';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/client';

/** Troca PT/EN mantendo a página. Usa <a> para o middleware fixar o cookie. */
export function LangSwitch() {
  const path = usePathname() || '/';
  const { locale, t } = useT();
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={t('footer.language')}>
      {(['pt', 'en'] as const).map((l) => (
        <a
          key={l}
          href={`${path}?lang=${l}`}
          hrefLang={l === 'pt' ? 'pt-PT' : 'en'}
          lang={l === 'pt' ? 'pt-PT' : 'en'}
          aria-current={locale === l ? 'true' : undefined}
          className={`inline-flex min-h-touch min-w-[44px] items-center justify-center rounded-pill px-2 font-semibold uppercase ${
            locale === l ? 'text-verde-escuro underline underline-offset-4' : 'hover:text-verde-escuro'
          }`}
        >
          {l === 'pt' ? 'PT' : 'EN'}
        </a>
      ))}
    </span>
  );
}
