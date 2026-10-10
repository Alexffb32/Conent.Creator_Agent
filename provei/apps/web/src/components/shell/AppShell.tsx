import Link from 'next/link';
import type { ReactNode } from 'react';
import { Bell, Compass, Home, QrCode, Store, User, Wallet } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Avatar, LinkButton } from '@/components/ui';
import { getMyRestaurants, getSessionProfile } from '@/server/auth';
import { NavLink } from './NavLink';
import { ModeSwitch } from './ModeSwitch';

const items = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/descobrir', label: 'Descobrir', icon: Compass },
  { href: '/mesa', label: 'Mesa', icon: QrCode },
  { href: '/cartao', label: 'Cartão', icon: Wallet },
  { href: '/perfil', label: 'Perfil', icon: User },
] as const;

export async function AppShell({ children }: { children: ReactNode }) {
  const [me, restaurants] = await Promise.all([getSessionProfile(), getMyRestaurants()]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-linha bg-branco/95 backdrop-blur pv-safe-top">
        <div className="pv-container flex h-14 items-center justify-between gap-3">
          <Link href="/" aria-label="Provei, ir para o início" className="inline-flex min-h-touch items-center">
            <Logo size={24} />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {items.map((i) => (
              <NavLink key={i.href} href={i.href} className="px-4">
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            {restaurants.length > 0 ? <ModeSwitch restaurants={restaurants} /> : null}
            {me ? (
              <>
                <Link href="/notificacoes" aria-label="Notificações" className="inline-flex h-11 w-11 items-center justify-center rounded-pill hover:bg-verde-tinta">
                  <Bell size={22} aria-hidden />
                </Link>
                <Link href="/perfil" aria-label="O meu perfil" className="inline-flex h-11 w-11 items-center justify-center">
                  <Avatar name={me.displayName || me.email || 'Eu'} size={32} />
                </Link>
              </>
            ) : (
              <LinkButton href="/entrar" size="sm">
                Entrar
              </LinkButton>
            )}
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex-1 pb-24 lg:pb-10">
        {children}
      </main>
      <footer className="hidden border-t border-linha bg-branco py-6 text-sm text-tinta-2 lg:block">
        <div className="pv-container flex flex-wrap items-center justify-between gap-3">
          <span>Provei · Covilhã e Fundão · Em desenvolvimento</span>
          <span className="flex gap-4">
            <Link href="/legal/termos">Termos</Link>
            <Link href="/legal/privacidade">Privacidade</Link>
          </span>
        </div>
      </footer>
      <nav aria-label="Principal (telemóvel)" className="fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-branco/95 backdrop-blur lg:hidden pv-safe-bottom">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {items.map((i) => (
            <li key={i.href}>
              <NavLink href={i.href} mobile>
                <i.icon size={22} aria-hidden />
                <span>{i.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export { Store };
