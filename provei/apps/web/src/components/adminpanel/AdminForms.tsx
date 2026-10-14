'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardTitle, Field, Input, Textarea, useToast } from '@/components/ui';
import { createAdCampaign, setRestaurantPlan } from '@/server/actions/admin';

export function PlanForm({ restaurantId, plan }: { restaurantId: string; plan: 'free' | 'paid' }) {
  const { toast } = useToast();
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await setRestaurantPlan(restaurantId, plan === 'paid' ? 'free' : 'paid', note);
        setBusy(false);
        if (!r.ok) return toast(r.error, 'erro');
        setNote('');
        router.refresh();
      }}
    >
      <Field label="Nota (obrigatória)" htmlFor={`note-${restaurantId}`}><Input id={`note-${restaurantId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pago em dinheiro na instalação" /></Field>
      <Button type="submit" variant={plan === 'paid' ? 'secondary' : 'primary'} loading={busy}>{plan === 'paid' ? 'Passar a gratuito' : 'Ativar plano pago'}</Button>
    </form>
  );
}

export function CampaignForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardTitle className="mb-3 text-xl">Nova campanha (fictícia em desenvolvimento)</CardTitle>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          const fd = new FormData(f);
          setBusy(true);
          const split = (k: string) => String(fd.get(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
          const r = await createAdCampaign({
            advertiserName: fd.get('advertiser'), headline: fd.get('headline'), body: fd.get('body'), url: fd.get('url') || undefined,
            cities: split('cities'), hours: split('hours').map(Number), interests: split('interests'),
            budgetEuros: fd.get('budget'), startsAt: fd.get('startsAt'), endsAt: fd.get('endsAt'),
          });
          setBusy(false);
          if (!r.ok) return toast(r.error, 'erro');
          f.reset();
          router.refresh();
        }}
      >
        <Field label="Anunciante" htmlFor="ad-a"><Input id="ad-a" name="advertiser" required /></Field>
        <Field label="Título" htmlFor="ad-h"><Input id="ad-h" name="headline" required maxLength={80} /></Field>
        <div className="sm:col-span-2"><Field label="Texto" htmlFor="ad-b"><Textarea id="ad-b" name="body" maxLength={200} /></Field></div>
        <Field label="Ligação (opcional)" htmlFor="ad-u"><Input id="ad-u" name="url" type="url" /></Field>
        <Field label="Orçamento (€)" htmlFor="ad-bu"><Input id="ad-bu" name="budget" inputMode="decimal" required /></Field>
        <Field label="Cidades" htmlFor="ad-c" hint="Separadas por vírgulas"><Input id="ad-c" name="cities" placeholder="Covilhã, Fundão" /></Field>
        <Field label="Horas (0-23)" htmlFor="ad-hr" hint="Ex.: 11,12,13,19,20"><Input id="ad-hr" name="hours" /></Field>
        <Field label="Interesses" htmlFor="ad-i" hint="Só usados com consentimento"><Input id="ad-i" name="interests" /></Field>
        <div />
        <Field label="Início" htmlFor="ad-s"><Input id="ad-s" name="startsAt" type="datetime-local" required /></Field>
        <Field label="Fim" htmlFor="ad-e"><Input id="ad-e" name="endsAt" type="datetime-local" required /></Field>
        <div className="sm:col-span-2"><Button type="submit" loading={busy}>Criar campanha</Button></div>
      </form>
    </Card>
  );
}
