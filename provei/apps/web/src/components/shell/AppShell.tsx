import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bell, Compass, Home, QrCode, Store, User, Wallet } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Avatar, LinkButton } from '@/components/ui';
import { getMyRestaurants, getSessionProfile } from '@/server/auth';
import { NavLink } from './NavLink';
import { ModeSwitch } from './ModeSwitch';
import { LangSwitch } from './LangSwitch';
import { getT } from '@/i18n/server';

const LRE_URL = 'https://www.livroreclamacoes.pt/';

const items = [
  { href: '/', key: 'nav.home', icon: Home },
  { href: '/descobrir', key: 'nav.discover', icon: Compass },
  { href: '/mesa', key: 'nav.table', icon: QrCode },
  { href: '/cartao', key: 'nav.card', icon: Wallet },
  { href: '/perfil', key: 'nav.profile', icon: User },
] as const;

export async function AppShell({ children }: { children: ReactNode }) {
  const [me, restaurants, { t }] = await Promise.all([getSessionProfile(), getMyRestaurants(), getT()]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-linha bg-branco/95 backdrop-blur pv-safe-top">
        <div className="pv-container flex h-16 items-center justify-between gap-3">
          <Link href="/" aria-label={t('nav.homeAria')} className="inline-flex min-h-touch items-center">
            <Logo size={26} />
          </Link>
          <nav aria-label={t('nav.main')} className="hidden items-center gap-1 lg:flex">
            {items.map((i) => (
              <NavLink key={i.href} href={i.href} className="px-4">
                {t(i.key)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {restaurants.length > 0 ? <ModeSwitch restaurants={restaurants} /> : null}
            {me ? (
              <>
                <Link href="/notificacoes" aria-label={t('nav.notifications')} className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta">
                  <Bell size={22} aria-hidden />
                </Link>
                <Link href="/perfil" aria-label={t('nav.myProfile')} className="inline-flex h-11 w-11 items-center justify-center">
                  <Avatar name={me.displayName || me.email || 'Eu'} size={32} />
                </Link>
              </>
            ) : (
              <LinkButton href="/entrar" size="sm">
                {t('nav.signIn')}
              </LinkButton>
            )}
          </div>
        </div>
      </header>
      <main id="conteudo" className="min-h-[100dvh] flex-1 pb-10">
        {children}
      </main>
      <footer className="border-t border-linha bg-branco pb-24 pt-6 text-sm text-tinta-2 lg:pb-6">
        <div className="pv-container flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <span>{t('footer.tagline')}</span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4">
            <Link href="/para-restaurantes" className="inline-flex min-h-touch items-center hover:underline">{t('nav.forRestaurants')}</Link>
            <Link href="/legal/termos" className="inline-flex min-h-touch items-center hover:underline">{t('footer.terms')}</Link>
            <Link href="/legal/privacidade" className="inline-flex min-h-touch items-center hover:underline">{t('footer.privacy')}</Link>
            <Link href="/legal/cookies" className="inline-flex min-h-touch items-center hover:underline">{t('footer.cookies')}</Link>
            <Link href="/legal/aviso-legal" className="inline-flex min-h-touch items-center hover:underline">{t('footer.legal')}</Link>
            <Link href="/denunciar" className="inline-flex min-h-touch items-center hover:underline">{t('footer.report')}</Link>
            <a href={LRE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-touch items-center hover:underline">{t('footer.complaints')}</a>
            <LangSwitch />
          </nav>
        </div>
      </footer>
      <nav aria-label={t('nav.mainMobile')} className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-branco/95 backdrop-blur lg:hidden pv-safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((i) => (
            <li key={i.href}>
              <NavLink href={i.href} mobile>
                <i.icon size={22} aria-hidden />
                <span>{t(i.key)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export { Store };
