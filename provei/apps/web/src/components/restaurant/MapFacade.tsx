'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { useT } from '@/i18n/client';
import type { MapPoint } from './DiscoverMap';

const DiscoverMap = dynamic(() => import('./DiscoverMap').then((m) => m.DiscoverMap), { ssr: false });
const RestaurantMap = dynamic(() => import('./RestaurantMap').then((m) => m.RestaurantMap), { ssr: false });

/**
 * O mapa só carrega depois de um toque: os mosaicos vêm do OpenStreetMap (terceiro que recebe o IP)
 * e a biblioteca de mapas pesa ~200 kB. Antes do toque não há pedidos externos.
 */
export function MapFacade(props: { points: MapPoint[]; height?: 'sm' | 'md' } | { point: { lat: number; lng: number; name: string }; height?: 'sm' | 'md' }) {
  const [show, setShow] = useState(false);
  const { t } = useT();
  const h = props.height === 'sm' ? 'h-56' : 'h-72';
  if (show) {
    return 'points' in props ? <DiscoverMap points={props.points} /> : <RestaurantMap {...props.point} />;
  }
  return (
    <div className={`flex ${h} w-full flex-col items-center justify-center gap-3 rounded-m border border-linha bg-verde-tinta p-4 text-center`}>
      <MapPin size={28} className="text-verde" aria-hidden />
      <Button variant="secondary" onClick={() => setShow(true)}>{t('map.show')}</Button>
      <p className="max-w-sm text-sm text-tinta-2">{t('map.notice')}</p>
    </div>
  );
}
