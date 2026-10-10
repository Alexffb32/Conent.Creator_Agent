'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { BellRing, Check, HandHelping, Receipt, Volume2, VolumeX, X, Ban } from 'lucide-react';
import { Badge, Button, Card, CardTitle, useToast } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/media';
import { getQueue, type QueueCall, type QueueData } from '@/server/actions/queue';
import { ignoreUser, setCallStatus } from '@/server/actions/table';

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {
    /* sem áudio */
  }
}

const REASON = { call: 'Chamar', bill: 'Conta', help: 'Ajuda' } as const;

function Waiting({ since }: { since: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 1000));
  return <span className="font-mono tabular-nums">{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</span>;
}

export function WaiterQueue({ restaurantId, isOwner, initial }: { restaurantId: string; isOwner: boolean; initial: QueueData }) {
  const { toast } = useToast();
  const [data, setData] = useState<QueueData>(initial);
  const [sound, setSound] = useState(false);
  const [vibrate, setVibrate] = useState(false);
  const [live, setLive] = useState(false);
  const [pending, start] = useTransition();
  const known = useRef(new Set(initial.active.map((c) => c.id)));
  const soundRef = useRef(sound);
  const vibRef = useRef(vibrate);
  soundRef.current = sound;
  vibRef.current = vibrate;

  useEffect(() => {
    try {
      setSound(localStorage.getItem('pv_q_sound') === '1');
      setVibrate(localStorage.getItem('pv_q_vib') === '1');
    } catch { /* sem storage */ }
  }, []);

  const refresh = useCallback(async () => {
    const r = await getQueue(restaurantId);
    if (!r.ok) return;
    const fresh = r.data.active.filter((c) => !known.current.has(c.id));
    if (fresh.length) {
      if (soundRef.current) beep();
      if (vibRef.current && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
    }
    known.current = new Set(r.data.active.map((c) => c.id));
    setData(r.data);
  }, [restaurantId]);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`queue-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${restaurantId}` }, () => void refresh())
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    const poll = setInterval(refresh, 8000); // reserva se o tempo real falhar
    return () => {
      clearInterval(poll);
      void sb.removeChannel(ch);
    };
  }, [restaurantId, refresh]);

  function act(c: QueueCall, status: 'acknowledged' | 'resolved' | 'rejected') {
    start(async () => {
      const r = await setCallStatus({ callId: c.id, status });
      if (!r.ok) toast(r.error, 'erro');
      await refresh();
    });
  }
  function toggle(kind: 'sound' | 'vib') {
    if (kind === 'sound') {
      const v = !sound;
      setSound(v);
      if (v) beep();
      try { localStorage.setItem('pv_q_sound', v ? '1' : '0'); } catch { /* ok */ }
    } else {
      const v = !vibrate;
      setVibrate(v);
      try { localStorage.setItem('pv_q_vib', v ? '1' : '0'); } catch { /* ok */ }
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="pv-title text-4xl text-verde-escuro">Fila de mesas</h1>
        <div className="flex items-center gap-2">
          <Badge tone={live ? 'verde' : 'amarelo'}>{live ? 'Em tempo real' : 'A atualizar a cada 8 s'}</Badge>
          <Button variant="secondary" size="sm" aria-pressed={sound} onClick={() => toggle('sound')}>{sound ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />} Som</Button>
          <Button variant="secondary" size="sm" aria-pressed={vibrate} onClick={() => toggle('vib')}>Vibração</Button>
        </div>
      </div>
      {data.occupiedTables.length > 0 ? <p className="text-sm text-tinta-2">Mesas ocupadas: {data.occupiedTables.join(', ')}</p> : null}
      <section aria-label="Chamadas ativas" aria-live="polite" className="flex flex-col gap-3">
        {data.active.length === 0 ? <Card className="text-center text-tinta-2">Sem chamadas neste momento. Tudo calmo.</Card> : null}
        {data.active.map((c) => (
          <Card key={c.id} className={c.status === 'open' ? 'border-amarelo bg-amarelo-tinta' : 'border-verde-fresco bg-verde-tinta'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {c.reason === 'bill' ? <Receipt aria-hidden /> : c.reason === 'help' ? <HandHelping aria-hidden /> : <BellRing aria-hidden />}
                <div>
                  <p className="pv-title text-3xl">Mesa {c.tableLabel}</p>
                  <p className="text-sm text-tinta-2">{REASON[c.reason]} · {c.userName} · à espera <Waiting since={c.createdAt} /></p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.status === 'open' ? <Button disabled={pending} onClick={() => act(c, 'acknowledged')}><Check size={18} aria-hidden /> Atender</Button> : <Badge>A caminho</Badge>}
                <Button variant="accent" disabled={pending} onClick={() => act(c, 'resolved')}>Resolver</Button>
                <Button variant="secondary" disabled={pending} onClick={() => act(c, 'rejected')}><X size={18} aria-hidden /> Rejeitar</Button>
                {isOwner ? <Button variant="ghost" size="sm" onClick={() => start(async () => { const r = await ignoreUser(restaurantId, c.userId, true); toast(r.ok ? 'Utilizador ignorado neste restaurante' : r.error, r.ok ? 'info' : 'erro'); })}><Ban size={16} aria-hidden /> Ignorar</Button> : null}
              </div>
            </div>
          </Card>
        ))}
      </section>
      <section aria-labelledby="hist-hoje" className="flex flex-col gap-2">
        <CardTitle className="text-2xl" id="hist-hoje">Histórico de hoje</CardTitle>
        {data.today.length === 0 ? <p className="text-tinta-2">Ainda sem histórico.</p> : (
          <ul className="divide-y divide-linha rounded-m border border-linha bg-branco">
            {data.today.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>Mesa {c.tableLabel} · {REASON[c.reason]} · {c.userName}</span>
                <span className="text-tinta-2">{c.status === 'resolved' ? 'Resolvida' : c.status === 'rejected' ? 'Rejeitada' : 'Expirada'} · {formatDateTime(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
