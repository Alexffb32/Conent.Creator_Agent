import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center bg-nevoa px-4 py-8 pv-safe-top">
      <Link href="/" aria-label="Provei" className="mb-6 inline-flex min-h-touch items-center">
        <Logo size={30} />
      </Link>
      <main id="conteudo" className="w-full max-w-md">{children}</main>
    </div>
  );
}
