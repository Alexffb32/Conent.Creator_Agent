'use client';
import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { createAdvertiser } from '@/server/actions/advertisers';

export function AdvertiserForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(createAdvertiser, null);
  const fe = (f: string) => (state && !state.ok && state.field === f ? state.error : null);
  if (state?.ok) return <p role="status" className="font-semibold text-verde-escuro">Conta criada. As campanhas ficam disponíveis em breve.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Nome da empresa ou marca" htmlFor="adv-name" error={fe('name')}><Input id="adv-name" name="name" required maxLength={120} /></Field>
      <Field label="E-mail de contacto" htmlFor="adv-email" error={fe('email')}><Input id="adv-email" name="email" type="email" required defaultValue={defaultEmail} /></Field>
      <Field label="NIF (opcional)" htmlFor="adv-vat" error={fe('vat')}><Input id="adv-vat" name="vat" maxLength={32} /></Field>
      {state && !state.ok && !state.field ? <p role="alert" className="text-erro">{state.error}</p> : null}
      <Button type="submit" loading={pending} className="sm:self-start">Criar conta de anunciante</Button>
    </form>
  );
}
