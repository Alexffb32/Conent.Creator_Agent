'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BellRing, Gift, LayoutGrid, MessageSquare, QrCode, ScanLine, Settings, Star, Tag, Users, Utensils, Video, CreditCard } from 'lucide-react';
import { ChefHat } from 'lucide-react';
import { cn } from '@/components/ui';
import { useFlag } from '@/lib/flags-client';

type Role = 'owner' | 'manager' | 'kitchen' | 'waiter';
const M: Role[] = ['owner', 'manager'];
const FLOOR: Role[] = ['owner', 'manager', 'waiter'];
const KITCHEN: Role[] = ['owner', 'manager', 'kitchen'];

const items = [
  { path: '', label: 'Visão geral', icon: BarChart3, roles: M },
  { path: '/fila', label: 'Fila de mesas', icon: BellRing, roles: FLOOR },
  { path: '/leitor', label: 'Leitor de QR', icon: ScanLine, roles: FLOOR },
  { path: '/publicacoes', label: 'Publicações', icon: LayoutGrid, roles: M },
  { path: '/retencao', label: 'Retenção de vídeo', icon: Video, roles: M },
  { path: '/menu', label: 'Menu', icon: Utensils, roles: M },
  { path: '/mesas', label: 'Mesas e QR', icon: QrCode, roles: M },
  { path: '/fidelizacao', label: 'Fidelização', icon: Gift, roles: M },
  { path: '/avaliacoes', label: 'Avaliações', icon: Star, roles: M },
  { path: '/ofertas', label: 'Ofertas', icon: Tag, roles: M },
  { path: '/equipa', label: 'Equipa', icon: Users, roles: M },
  { path: '/plano', label: 'Plano', icon: CreditCard, roles: ['owner'] as Role[] },
  { path: '/definicoes', label: 'Definições', icon: Settings, roles: M },
] as const;

export function AdminNav({ slug, role, extra = [] }: { slug: string; role: Role; extra?: { path: string; label: string; icon: typeof BarChart3; roles: Role[] }[] }) {
  const path = usePathname();
  const kdsOn = useFlag('kds');
  const orderingOn = useFlag('ordering');
  const kds = kdsOn && orderingOn;
  const flagged = kds ? [{ path: '/cozinha', label: 'Cozinha', icon: ChefHat, roles: KITCHEN }] : [];
  const base = `/r/${slug}/admin`;
  return (
    <nav aria-label="Painel do restaurante" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {[...items, ...flagged, ...extra].filter((i) => i.roles.includes(role)).map((i) => {
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
