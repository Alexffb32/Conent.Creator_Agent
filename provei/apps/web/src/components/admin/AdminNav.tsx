'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BellRing, Gift, LayoutGrid, MessageSquare, QrCode, ScanLine, Settings, Star, Tag, Users, Utensils, Video, CreditCard } from 'lucide-react';
import { cn } from '@/components/ui';

const items = [
  { path: '', label: 'Visão geral', icon: BarChart3, owner: true },
  { path: '/fila', label: 'Fila de mesas', icon: BellRing },
  { path: '/leitor', label: 'Leitor de QR', icon: ScanLine },
  { path: '/publicacoes', label: 'Publicações', icon: LayoutGrid, owner: true },
  { path: '/retencao', label: 'Retenção de vídeo', icon: Video, owner: true },
  { path: '/menu', label: 'Menu', icon: Utensils, owner: true },
  { path: '/mesas', label: 'Mesas e QR', icon: QrCode, owner: true },
  { path: '/fidelizacao', label: 'Fidelização', icon: Gift, owner: true },
  { path: '/avaliacoes', label: 'Avaliações', icon: Star, owner: true },
  { path: '/ofertas', label: 'Ofertas', icon: Tag, owner: true },
  { path: '/equipa', label: 'Equipa', icon: Users, owner: true },
  { path: '/plano', label: 'Plano', icon: CreditCard, owner: true },
  { path: '/definicoes', label: 'Definições', icon: Settings, owner: true },
] as const;

export function AdminNav({ slug, role }: { slug: string; role: 'owner' | 'staff' }) {
  const path = usePathname();
  const base = `/r/${slug}/admin`;
  return (
    <nav aria-label="Painel do restaurante" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.filter((i) => role === 'owner' || !('owner' in i && i.owner)).map((i) => {
          const href = `${base}${i.path}`;
          const active = i.path === '' ? path === base : path.startsWith(href);
          return (
            <li key={i.path} className="shrink-0">
              <Link href={href} aria-current={active ? 'page' : undefined} className={cn('inline-flex min-h-touch items-center gap-2 whitespace-nowrap rounded-pill px-4 text-sm font-semibold', active ? 'bg-verde text-branco' : 'text-verde-escuro hover:bg-verde-tinta')}>
                <i.icon size={18} aria-hidden /> {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { MessageSquare };
