'use client';
import { useState } from 'react';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { createRestaurant } from '@/server/actions/restaurant';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

export function NewRestaurantForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    const r = await createRestaurant({ name, slug, city: fd.get('city'), address: fd.get('address'), phone: fd.get('phone') });
    if (r && !r.ok) {
      setBusy(false);
      setErr({ field: r.field, message: r.error });
    }
  }
  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nome do restaurante" htmlFor="rn" error={err?.field === 'name' ? err.message : null}>
          <Input id="rn" required value={name} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Endereço no Provei" htmlFor="rs" hint={`provei.pt/r/${slug || 'o-teu-restaurante'}`} error={err?.field === 'slug' ? err.message : null}>
          <Input id="rs" required value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Cidade" htmlFor="rc"><Select id="rc" name="city" defaultValue="Covilhã"><option>Covilhã</option><option>Fundão</option><option>Tortozendo</option></Select></Field>
        <Field label="Morada" htmlFor="ra"><Input id="ra" name="address" /></Field>
        <Field label="Telefone" htmlFor="rp"><Input id="rp" name="phone" inputMode="tel" /></Field>
        {err && !err.field ? <p role="alert" className="text-erro">{err.message}</p> : null}
        <Button type="submit" loading={busy}>Criar restaurante</Button>
      </form>
    </Card>
  );
}
