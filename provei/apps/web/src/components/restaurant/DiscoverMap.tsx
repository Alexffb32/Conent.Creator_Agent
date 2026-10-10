'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

export interface MapPoint { slug: string; name: string; lat: number; lng: number }

export function DiscoverMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import('maplibre-gl').Map | undefined;
    let cancelled = false;
    (async () => {
      const ml = await import('maplibre-gl');
      if (cancelled || !ref.current) return;
      const center: [number, number] = points[0] ? [points[0].lng, points[0].lat] : [-7.5, 40.21];
      map = new ml.Map({
        container: ref.current,
        center,
        zoom: 11,
        attributionControl: { compact: true },
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] },
      });
      for (const p of points) {
        const popup = new ml.Popup({ offset: 18 }).setHTML(`<a href="/r/${encodeURIComponent(p.slug)}" style="font-weight:600;color:#0A3D1C">${p.name.replace(/[<>&"]/g, '')}</a>`);
        new ml.Marker({ color: '#2D7F1A' }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);
  return <div ref={ref} role="img" aria-label="Mapa de restaurantes" className="h-72 w-full overflow-hidden rounded-m border border-linha" />;
}
