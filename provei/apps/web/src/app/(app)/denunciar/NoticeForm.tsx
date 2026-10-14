'use client';
import { useActionState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';
import { submitContentNotice } from '@/server/actions/public';

export function NoticeForm({ defaultUrl }: { defaultUrl: string }) {
  const [state, action, pending] = useActionState(submitContentNotice, null);
  if (state?.ok) {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-m border border-verde bg-verde-tinta p-5">
        <CheckCircle2 className="text-verde" size={28} aria-hidden />
        <p className="font-semibold text-verde-escuro">Denúncia recebida.</p>
        <p>Referência: <span className="font-mono">{state.data.id.slice(0, 8)}</span>. Vamos analisar e responder para o e-mail que indicaste.</p>
      </div>
    );
  }
  const err = state && !state.ok ? state : null;
  const fe = (f: string) => (err?.field === f ? err.error : null);
  return (
    <form action={action} noValidate className="flex flex-col gap-4 rounded-xl border border-linha bg-branco p-5 shadow-sm">
      <Field label="Link exato do conteúdo" htmlFor="n-url" hint="Por exemplo, o endereço da página do restaurante ou da avaliação." error={fe('url')}>
        <Input id="n-url" name="url" required defaultValue={defaultUrl} inputMode="url" aria-invalid={Boolean(fe('url'))} />
      </Field>
      <Field label="Tipo de problema" htmlFor="n-cat" error={fe('category')}>
        <Select id="n-cat" name="category" defaultValue="illegal">
          <option value="illegal">Conteúdo ilegal (ódio, ameaças, fraude…)</option>
          <option value="ip">Direitos de autor ou marca</option>
          <option value="privacy">Privacidade ou dados pessoais</option>
          <option value="consumer">Informação enganosa ao consumidor</option>
          <option value="other">Outro</option>
        </Select>
      </Field>
      <Field label="Porque é ilegal?" htmlFor="n-exp" hint="Explica com o máximo de detalhe que puderes." error={fe('explanation')}>
        <Textarea id="n-exp" name="explanation" rows={5} required maxLength={4000} aria-invalid={Boolean(fe('explanation'))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="O teu nome (opcional)" htmlFor="n-name">
          <Input id="n-name" name="name" autoComplete="name" maxLength={80} />
        </Field>
        <Field label="O teu e-mail" htmlFor="n-email" error={fe('email')}>
          <Input id="n-email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe('email'))} />
        </Field>
      </div>
      <Checkbox name="goodFaith" label="Declaro de boa-fé que a informação desta denúncia é exata e completa." />
      {fe('goodFaith') ? <p role="alert" className="text-sm font-medium text-erro">{fe('goodFaith')}</p> : null}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="n-web">Website</label>
        <input id="n-web" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {err && !err.field ? <p role="alert" className="font-medium text-erro">{err.error}</p> : null}
      <Button type="submit" loading={pending} className="sm:self-start">Enviar denúncia</Button>
    </form>
  );
}
