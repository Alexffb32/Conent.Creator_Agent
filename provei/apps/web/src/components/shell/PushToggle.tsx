'use client';
import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button, Card, useToast } from '@/components/ui';
import { removePushSubscription, savePushSubscription } from '@/server/actions/notifications';
import { updateConsent } from '@/server/actions/account';

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Web Push (VAPID). Sem chave pública configurada, o botão não aparece e ficam as notificações na app. */
export function PushToggle({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vapid || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setActive(Boolean(s))).catch(() => {});
  }, [vapid]);

  if (!supported || !vapid) return null;

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return toast('Sem permissão para notificações.', 'erro');
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid!) as BufferSource });
      const json = sub.toJSON();
      const r = await savePushSubscription({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } }, navigator.userAgent);
      if (!r.ok) return toast(r.error, 'erro');
      await updateConsent({ kind: 'push', granted: true });
      setActive(true);
      toast('Notificações ativadas');
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    await updateConsent({ kind: 'push', granted: false });
    setActive(false);
    setBusy(false);
  }
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><BellRing aria-hidden className="text-verde" /><p>{active ? 'Notificações push ativas neste dispositivo.' : enabled ? 'Ativa as notificações neste dispositivo.' : 'Recebe avisos de novos pratos e pontos.'}</p></div>
      <Button variant="secondary" size="sm" loading={busy} onClick={active ? disable : enable}>{active ? 'Desativar' : 'Ativar'}</Button>
    </Card>
  );
}
