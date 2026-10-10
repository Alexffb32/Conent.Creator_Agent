'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

export function RestaurantMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import('maplibre-gl').Map | undefined;
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !ref.current) return;
      map = new ml.Map({
        container: ref.current,
        center: [lng, lat],
        zoom: 15,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
      });
      new ml.Marker({ color: '#2D7F1A' }).setLngLat([lng, lat]).addTo(map);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);
  return <div ref={ref} role="img" aria-label={`Mapa com a localização de ${name}`} className="h-56 w-full overflow-hidden rounded-m border border-linha" />;
}
