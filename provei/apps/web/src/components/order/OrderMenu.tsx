'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, ShoppingBag, WifiOff } from 'lucide-react';
import { EU_ALLERGENS } from '@provei/domain';
import { Button, Card, CardTitle, Field, Input, Textarea } from '@/components/ui';
import { formatPrice } from '@/lib/media';
import { placeOrder } from '@/server/actions/orders';
import type { OrderMenuData } from '@/server/ordering';

const ALLERGEN = new Map<string, string>(EU_ALLERGENS.map((a) => [a.key, a.label]));

interface Saved {
  lines: Record<string, number>;
  note: string;
  name: string;
  clientRef: string;
  queued: boolean;
}

function load(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
function save(key: string, v: Saved | null) {
  try {
    if (v) localStorage.setItem(key, JSON.stringify(v));
    else localStorage.removeItem(key);
  } catch {
    /* sem storage: o carrinho fica só em memória */
  }
}

/**
 * Menu com carrinho. O carrinho fica guardado no aparelho; o clientRef mantém-se até o pedido entrar,
 * por isso reenviar depois de uma falha de rede nunca duplica o pedido. Sem rede, o pedido fica em fila
 * e é enviado quando a ligação voltar.
 */
export function OrderMenu({
  restaurantId,
  kind,
  tableCode,
  menu,
  needsName,
}: {
  restaurantId: string;
  kind: 'table' | 'pickup';
  tableCode?: string;
  menu: OrderMenuData;
  needsName: boolean;
}) {
  const router = useRouter();
  const storeKey = `pv_cart_${restaurantId}_${kind}_${tableCode ?? ''}`;
  const [lines, setLines] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [clientRef, setClientRef] = useState('');
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const sending = useRef(false);

  useEffect(() => {
    const s = load(storeKey);
    if (s) {
      setLines(s.lines);
      setNote(s.note);
      setName(s.name);
      setClientRef(s.clientRef);
      setQueued(s.queued);
    } else setClientRef(crypto.randomUUID());
    setOnline(navigator.onLine);
  }, [storeKey]);

  useEffect(() => {
    if (!clientRef) return;
    save(storeKey, { lines, note, name, clientRef, queued });
  }, [storeKey, lines, note, name, clientRef, queued]);

  const byId = useMemo(() => new Map(menu.items.map((i) => [i.id, i])), [menu.items]);
  const cart = Object.entries(lines).filter(([id, q]) => q > 0 && byId.has(id));
  const count = cart.reduce((s, [, q]) => s + q, 0);
  const total = cart.reduce((s, [id, q]) => s + q * (byId.get(id)?.price_cents ?? 0), 0);

  function setQty(id: string, q: number) {
    setError(null);
    setLines((l) => ({ ...l, [id]: Math.max(0, Math.min(20, q)) }));
  }

  const submit = useCallback(async () => {
    if (sending.current || !clientRef) return;
    if (needsName && name.trim().length < 2) {
      setError('Indica o teu nome para levantares o pedido.');
      return;
    }
    sending.current = true;
    setBusy(true);
    setError(null);
    try {
      const r = await placeOrder({
        restaurantId,
        kind,
        tableCode,
        clientRef,
        items: cart.map(([id, qty]) => ({ id, qty })),
        note: note.trim() || undefined,
        customerName: name.trim() || undefined,
      });
      if (!r.ok) {
        setQueued(false);
        setError(r.error);
        return;
      }
      save(storeKey, null);
      router.push(`/pedido/${r.data.orderId}`);
    } catch {
      // falha de rede: guarda e tenta outra vez quando a ligação voltar (mesmo clientRef = sem duplicados)
      setQueued(true);
      setError('Sem ligação. O pedido fica guardado e é enviado assim que a rede voltar.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }, [cart, clientRef, kind, name, needsName, note, restaurantId, router, storeKey, tableCode]);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      if (queued) void submit();
    };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, [queued, submit]);

  const groups = [
    ...menu.categories.map((c) => ({ id: c.id, name: c.name, items: menu.items.filter((i) => i.category_id === c.id) })),
    { id: 'other', name: 'Outros', items: menu.items.filter((i) => !i.category_id || !menu.categories.some((c) => c.id === i.category_id)) },
  ].filter((g) => g.items.length);

  if (!menu.items.length) {
    return <p className="text-tinta-2">Este restaurante ainda não tem pratos disponíveis para pedir. Chama a equipa.</p>;
  }

  return (
    <div className="flex flex-col gap-6 pb-56">
      {!online && (
        <p role="status" className="flex items-center gap-2 rounded-card bg-amarelo-tinta p-3">
          <WifiOff size={20} aria-hidden /> Estás sem rede. Podes montar o pedido; enviamos quando a ligação voltar.
        </p>
      )}
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`cat-${g.id}`} className="flex flex-col gap-3">
          <h2 id={`cat-${g.id}`} className="text-xl font-semibold">{g.name}</h2>
          {g.items.map((i) => {
            const q = lines[i.id] ?? 0;
            return (
              <Card key={i.id} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">{i.name}</p>
                  {i.description && <p className="text-tinta-2">{i.description}</p>}
                  <p className="mt-1 font-semibold tabular-nums">{formatPrice(i.price_cents)}</p>
                  {i.allergens.length > 0 && (
                    <p className="mt-1 text-[15px] text-tinta-2">Alergénios: {i.allergens.map((a) => ALLERGEN.get(a) ?? a).join(', ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {q > 0 && (
                    <>
                      <Button variant="secondary" size="sm" aria-label={`Tirar um ${i.name}`} onClick={() => setQty(i.id, q - 1)}>
                        <Minus size={18} aria-hidden />
                      </Button>
                      <span className="min-w-[2ch] text-center font-semibold tabular-nums" aria-live="polite">{q}</span>
                    </>
                  )}
                  <Button variant={q ? 'secondary' : 'primary'} size="sm" aria-label={`Juntar ${i.name}`} onClick={() => setQty(i.id, q + 1)}>
                    <Plus size={18} aria-hidden />
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      ))}

      <Card className="flex flex-col gap-3">
        <CardTitle>O teu pedido</CardTitle>
        {needsName && (
          <Field label="Nome para levantar" htmlFor="pv-order-name">
            <Input id="pv-order-name" value={name} maxLength={60} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label="Nota para a cozinha (opcional)" hint="Ex.: sem cebola. Alergias graves: fala também com a equipa." htmlFor="pv-order-note">
          <Textarea id="pv-order-note" value={note} maxLength={300} rows={2} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-linha bg-branco/95 p-4 backdrop-blur lg:bottom-0">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {error && <p role="alert" className="text-erro">{error}</p>}
          <Button size="lg" disabled={!count} loading={busy} onClick={() => void submit()}>
            <ShoppingBag size={20} aria-hidden />
            {count ? `Enviar pedido · ${count} · ${formatPrice(total)}` : 'Escolhe pelo menos um prato'}
          </Button>
          <p className="text-center text-[15px] text-tinta-2">O preço final é confirmado pelo restaurante ao receber o pedido.</p>
        </div>
      </div>
    </div>
  );
}
