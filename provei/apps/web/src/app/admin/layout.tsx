import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { requireAdminPage } from '@/server/auth';

const NAV = [
  ['/admin', 'Resumo'], ['/admin/restaurantes', 'Restaurantes'], ['/admin/moderacao', 'Moderação'], ['/admin/utilizadores', 'Utilizadores'],
  ['/admin/flags', 'Flags'], ['/admin/anuncios', 'Anúncios'], ['/admin/planos', 'Planos'], ['/admin/auditoria', 'Auditoria'],
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <div className="min-h-[100dvh]">
      <header className="border-b border-linha bg-branco pv-safe-top">
        <div className="pv-container flex h-14 items-center justify-between"><Link href="/" aria-label="Provei" className="inline-flex min-h-touch items-center"><Logo size={24} /></Link><span className="text-sm font-semibold text-tinta-2">Administração</span></div>
        <nav aria-label="Administração" className="pv-container flex gap-1 overflow-x-auto pb-2">
          {NAV.map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-touch shrink-0 items-center rounded-pill px-4 text-sm font-semibold text-verde-escuro hover:bg-verde-tinta">{label}</Link>)}
        </nav>
      </header>
      <main id="conteudo" className="pv-container py-6">{children}</main>
    </div>
  );
}
