import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { publicEnv } from '@/lib/env';
import { RegisterSW } from '@/components/shell/RegisterSW';
import './globals.css';

const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});
const serif = localFont({
  src: '../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  variable: '--font-serif',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: 'Provei: o que está a sair da cozinha', template: '%s · Provei' },
  description: 'Pratos de restaurantes da Covilhã e do Fundão em vídeo e foto. Segue, guarda, chama o empregado e ganha pontos.',
  applicationName: 'Provei',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Provei', statusBarStyle: 'default' },
  openGraph: { type: 'website', siteName: 'Provei', locale: 'pt_PT' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#2D7F1A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-PT" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-pill focus:bg-branco focus:px-4 focus:py-2">
          Saltar para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
