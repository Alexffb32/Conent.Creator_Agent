'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Com consentimento de localização, guarda a posição num cookie curto para ordenar por proximidade. */
export function LocationPrompt() {
  const router = useRouter();
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (document.cookie.includes('pv_loc=')) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = `${p.coords.latitude.toFixed(3)},${p.coords.longitude.toFixed(3)}`;
        document.cookie = `pv_loc=${v}; Max-Age=1800; Path=/; SameSite=Lax`;
        router.refresh();
      },
      () => {},
      { maximumAge: 600000, timeout: 8000 },
    );
  }, [router]);
  return null;
}
