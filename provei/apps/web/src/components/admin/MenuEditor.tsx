'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { EU_ALLERGENS } from '@provei/domain';
import { Button, Card, CardTitle, Checkbox, Field, Input, Select, useToast } from '@/components/ui';
import { formatPrice } from '@/lib/media';
import { addMenuCategory, addMenuItem, deleteMenuItem, setMenuItemAvailable } from '@/server/actions/manage';

export function MenuEditor({ restaurantId, categories, items }: { restaurantId: string; categories: { id: string; name: string }[]; items: { id: string; name: string; description: string | null; price_cents: number; category_id: string | null; available?: boolean; station?: string; allergens?: string[] }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function cat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    setBusy(true);
    const r = await addMenuCategory({ restaurantId, name: fd.get('name') });
    setBusy(false);
    if (!r.ok) return toast(r.error, 'erro');
    f.reset();
    router.refresh();
  }
  async function item(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const fd = new FormData(f);
    setBusy(true);
    const price = String(fd.get('price') ?? '').replace(',', '.');
    const r = await addMenuItem({ restaurantId, name: fd.get('name'), description: fd.get('description'), priceEuros: price, categoryId: fd.get('category') || undefined, station: fd.get('station') || undefined, allergens: fd.getAll('allergens') });
    setBusy(false);
    if (!r.ok) return toast(r.error, 'erro');
    f.reset();
    router.refresh();
  }
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardTitle className="mb-3 text-xl">Nova categoria</CardTitle>
          <form onSubmit={cat} className="flex gap-2"><Input name="name" aria-label="Nome da categoria" required placeholder="Entradas" /><Button type="submit" loading={busy}>Adicionar</Button></form>
        </Card>
        <Card><CardTitle className="mb-3 text-xl">Novo prato no menu</CardTitle>
          <form onSubmit={item} className="flex flex-col gap-3">
            <Field label="Nome" htmlFor="mi-name"><Input id="mi-name" name="name" required /></Field>
            <Field label="Descrição" htmlFor="mi-desc"><Input id="mi-desc" name="description" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço (€)" htmlFor="mi-price"><Input id="mi-price" name="price" required inputMode="decimal" /></Field>
              <Field label="Categoria" htmlFor="mi-cat"><Select id="mi-cat" name="category"><option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            </div>
            <Field label="Posto na cozinha" hint="Ex.: cozinha, grelha, bar. Serve para filtrar o ecrã de cozinha." htmlFor="mi-station"><Input id="mi-station" name="station" defaultValue="cozinha" maxLength={30} /></Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-semibold">Alergénios (Reg. UE 1169/2011)</legend>
              <div className="grid grid-cols-2 gap-2">
                {EU_ALLERGENS.map((a) => <Checkbox key={a.key} name="allergens" value={a.key} label={a.label} />)}
              </div>
            </fieldset>
            <Button type="submit" loading={busy}>Adicionar prato</Button>
          </form>
        </Card>
      </div>
      {[...categories, { id: '', name: 'Sem categoria' }].map((c) => {
        const list = items.filter((i) => (i.category_id ?? '') === c.id);
        if (!list.length) return null;
        return (
          <Card key={c.id || 'none'}><CardTitle className="mb-2 text-xl">{c.name}</CardTitle>
            <ul className="divide-y divide-linha">
              {list.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0"><p className="truncate font-semibold">{i.name}</p>{i.description ? <p className="truncate text-sm text-tinta-2">{i.description}</p> : null}</div>
                  <div className="flex items-center gap-2"><span className="font-semibold">{formatPrice(i.price_cents)}</span>
                    <Button variant={i.available === false ? 'accent' : 'ghost'} size="sm" aria-pressed={i.available === false} onClick={async () => { const r = await setMenuItemAvailable(restaurantId, i.id, i.available === false); if (!r.ok) return toast(r.error, 'erro'); router.refresh(); }}>{i.available === false ? 'Esgotado · repor' : 'Marcar esgotado'}</Button>
                    <button type="button" aria-label={`Apagar ${i.name}`} className="inline-flex h-11 w-11 items-center justify-center rounded-pill text-erro hover:bg-verde-tinta" onClick={async () => { const r = await deleteMenuItem(restaurantId, i.id); if (!r.ok) return toast(r.error, 'erro'); router.refresh(); }}><Trash2 size={18} aria-hidden /></button></div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </>
  );
}
