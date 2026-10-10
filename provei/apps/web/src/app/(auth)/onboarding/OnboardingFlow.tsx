'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardTitle, Checkbox, Field, Input, Select, Stepper } from '@/components/ui';
import { completeOnboarding } from '@/server/actions/account';

const STEPS = ['Nome', 'Cidade', 'Privacidade'];

export function OnboardingFlow({ next, initialHandle }: { next: string; initialHandle: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    handle: initialHandle,
    city: 'Covilhã',
    terms: false,
    privacy: false,
    location: false,
    push: false,
    adsPersonalization: false,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function finish() {
    setBusy(true);
    setError(null);
    const res = await completeOnboarding(form);
    setBusy(false);
    if (!res.ok) {
      setError({ message: res.error, field: res.field });
      if (res.field === 'handle' || res.field === 'displayName') setStep(0);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  const canNext = step === 0 ? form.displayName.trim().length >= 2 && /^[a-z0-9_]{3,24}$/.test(form.handle) : true;

  return (
    <Card className="flex flex-col gap-5 p-6">
      <Stepper steps={STEPS} current={step} />
      {step === 0 && (
        <section className="flex flex-col gap-4">
          <CardTitle>Como te chamamos?</CardTitle>
          <Field label="Nome" htmlFor="nome" error={error?.field === 'displayName' ? error.message : null}>
            <Input id="nome" autoComplete="name" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ana Silva" />
          </Field>
          <Field label="Nome de utilizador" htmlFor="handle" hint="3 a 24 letras minúsculas, números ou _" error={error?.field === 'handle' ? error.message : null}>
            <Input id="handle" autoCapitalize="none" autoCorrect="off" value={form.handle} onChange={(e) => set('handle', e.target.value.toLowerCase())} />
          </Field>
        </section>
      )}
      {step === 1 && (
        <section className="flex flex-col gap-4">
          <CardTitle>Onde andas à procura?</CardTitle>
          <p className="text-tinta-2">Mostramos primeiro os pratos perto de ti.</p>
          <Field label="Cidade" htmlFor="cidade">
            <Select id="cidade" value={form.city} onChange={(e) => set('city', e.target.value)}>
              <option>Covilhã</option>
              <option>Fundão</option>
              <option>Outra</option>
            </Select>
          </Field>
        </section>
      )}
      {step === 2 && (
        <section className="flex flex-col gap-3">
          <CardTitle>A tua privacidade</CardTitle>
          <Checkbox
            checked={form.terms}
            onChange={(e) => set('terms', e.target.checked)}
            label={<>Li e aceito os <Link href="/legal/termos" target="_blank" className="underline">termos</Link> (obrigatório)</>}
          />
          <Checkbox
            checked={form.privacy}
            onChange={(e) => set('privacy', e.target.checked)}
            label={<>Li e aceito a <Link href="/legal/privacidade" target="_blank" className="underline">política de privacidade</Link> (obrigatório)</>}
          />
          <p className="pt-2 text-sm font-semibold text-tinta-2">Opcional, podes mudar quando quiseres:</p>
          <Checkbox checked={form.location} onChange={(e) => set('location', e.target.checked)} label="Usar a minha localização" description="Para mostrar pratos perto de ti." />
          <Checkbox checked={form.push} onChange={(e) => set('push', e.target.checked)} label="Receber notificações" description="Novos pratos de quem segues e pontos ganhos." />
          <Checkbox checked={form.adsPersonalization} onChange={(e) => set('adsPersonalization', e.target.checked)} label="Anúncios mais relevantes" description="Sem isto só usamos a cidade e a hora. Nunca vendemos dados pessoais." />
        </section>
      )}
      {error && !error.field ? <p role="alert" className="text-erro">{error.message}</p> : null}
      {error?.field && !['handle', 'displayName'].includes(error.field) ? <p role="alert" className="text-erro">{error.message}</p> : null}
      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} type="button">
            Voltar
          </Button>
        ) : null}
        {step < 2 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)} type="button">
            Continuar
          </Button>
        ) : (
          <Button className="flex-1" loading={busy} disabled={!form.terms || !form.privacy} onClick={finish} type="button">
            Começar a provar
          </Button>
        )}
      </div>
    </Card>
  );
}
