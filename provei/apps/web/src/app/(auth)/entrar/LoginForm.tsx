'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState('sending');
    const sb = createClient();
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setState('idle');
      setError(error.status === 429 ? 'Já te enviámos um link há pouco. Espera um minuto e tenta outra vez.' : 'Não conseguimos enviar o link. Confirma o e-mail e tenta outra vez.');
      return;
    }
    setState('sent');
  }

  async function google() {
    const sb = createClient();
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
  }

  if (state === 'sent') {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-m bg-verde-tinta p-4">
        <p className="font-semibold text-verde-escuro">Link enviado!</p>
        <p className="text-tinta-2">Abre o e-mail enviado para {email} e toca no link para entrar. Pode demorar um minuto.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="E-mail" htmlFor="email" error={error}>
          <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="o.teu@email.pt" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" loading={state === 'sending'}>
          <Mail size={18} aria-hidden /> Enviar link de entrada
        </Button>
      </form>
      {googleEnabled ? (
        <Button type="button" variant="secondary" onClick={google}>
          Continuar com Google
        </Button>
      ) : null}
      <p className="text-center text-sm text-tinta-2">Ao entrares, aceitas os nossos termos e a política de privacidade.</p>
    </div>
  );
}
