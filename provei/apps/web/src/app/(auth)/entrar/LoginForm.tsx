'use client';
import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button, Field, Input } from '@/components/ui';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/i18n/client';

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { t } = useT();

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
      setError(error.status === 429 ? t('login.rate') : t('login.fail'));
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
        <p className="font-semibold text-verde-escuro">{t('login.sent')}</p>
        <p className="text-tinta-2">{t('login.sentHint', { email })}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t('login.email')} htmlFor="email" error={error}>
          <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="o.teu@email.pt" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" loading={state === 'sending'}>
          <Mail size={18} aria-hidden /> {t('login.send')}
        </Button>
      </form>
      {googleEnabled ? (
        <Button type="button" variant="secondary" onClick={google}>
          {t('login.google')}
        </Button>
      ) : null}
      <p className="text-center text-sm text-tinta-2">
        {t('login.termsPre')}{' '}
        <Link href="/legal/termos" className="pv-link">{t('footer.terms')}</Link>
        {' · '}
        <Link href="/legal/privacidade" className="pv-link">{t('footer.privacy')}</Link>
      </p>
    </div>
  );
}
