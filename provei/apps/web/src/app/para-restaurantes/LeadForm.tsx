'use client';
import { useActionState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { submitLead } from '@/server/actions/public';

export function LeadForm() {
  const [state, action, pending] = useActionState(submitLead, null);
  const done = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.ok) done.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div ref={done} tabIndex={-1} role="status" className="flex flex-col items-start gap-2 rounded-m border border-verde bg-verde-tinta p-6 outline-none">
        <CheckCircle2 className="text-verde" size={32} aria-hidden />
        <p className="pv-title text-3xl text-verde-escuro">Pedido recebido. Obrigado!</p>
        <p>O Alexandre responde pessoalmente para combinar uma visita ao restaurante.</p>
        <Link href="/" className="pv-link inline-flex min-h-touch items-center font-semibold">Ver a app enquanto esperas</Link>
      </div>
    );
  }
  const err = state && !state.ok ? state : null;
  const fe = (f: string) => (err?.field === f ? err.error : null);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="O seu nome" htmlFor="l-name" error={fe('name')}>
          <Input id="l-name" name="name" autoComplete="name" required maxLength={80} aria-invalid={Boolean(fe('name'))} />
        </Field>
        <Field label="Restaurante" htmlFor="l-rest" error={fe('restaurant')}>
          <Input id="l-rest" name="restaurant" autoComplete="organization" required maxLength={120} aria-invalid={Boolean(fe('restaurant'))} />
        </Field>
        <Field label="E-mail ou telefone" htmlFor="l-contact" error={fe('contact')}>
          <Input id="l-contact" name="contact" autoComplete="email" required maxLength={120} aria-invalid={Boolean(fe('contact'))} />
        </Field>
        <Field label="Cidade" htmlFor="l-city" error={fe('city')}>
          <Input id="l-city" name="city" autoComplete="address-level2" required maxLength={60} defaultValue="Covilhã" aria-invalid={Boolean(fe('city'))} />
        </Field>
      </div>
      <Field label="Alguma pergunta? (opcional)" htmlFor="l-msg" error={fe('message')}>
        <Textarea id="l-msg" name="message" rows={3} maxLength={1000} />
      </Field>
      {/* campo-armadilha para robôs: invisível para pessoas e leitores de ecrã */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="l-web">Website</label>
        <input id="l-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {err && !err.field ? <p role="alert" className="font-medium text-erro">{err.error}</p> : null}
      <p className="text-sm text-tinta-2">
        Usamos estes dados só para responder a este pedido e apagamo-los ao fim de 12 meses se não avançarmos. Mais em{' '}
        <Link href="/legal/privacidade" className="pv-link">Privacidade</Link>.
      </p>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:self-start">
        Pedir visita de demonstração
      </Button>
    </form>
  );
}
