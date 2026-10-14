'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardTitle, Checkbox, Field, Input, Select, Stepper } from '@/components/ui';
import { completeOnboarding } from '@/server/actions/account';
import { useT } from '@/i18n/client';

export function OnboardingFlow({ next, initialHandle }: { next: string; initialHandle: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { t } = useT();
  const STEPS = [t('onb.stepName'), t('onb.stepCity'), t('onb.stepPrivacy')];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [form, setForm] = useState({
    displayName: '',
    handle: initialHandle,
    city: 'Covilhã',
    terms: false,
    privacy: false,
    age13: false,
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
          <CardTitle as="h1">{t('onb.nameTitle')}</CardTitle>
          <Field label={t('onb.name')} htmlFor="nome" error={error?.field === 'displayName' ? error.message : null}>
            <Input id="nome" autoComplete="name" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder="Ana Silva" />
          </Field>
          <Field label={t('onb.handle')} htmlFor="handle" hint={t('onb.handleHint')} error={error?.field === 'handle' ? error.message : null}>
            <Input id="handle" autoCapitalize="none" autoCorrect="off" value={form.handle} onChange={(e) => set('handle', e.target.value.toLowerCase())} />
          </Field>
        </section>
      )}
      {step === 1 && (
        <section className="flex flex-col gap-4">
          <CardTitle as="h1">{t('onb.cityTitle')}</CardTitle>
          <p className="text-tinta-2">{t('onb.cityHint')}</p>
          <Field label={t('discover.city')} htmlFor="cidade">
            <Select id="cidade" value={form.city} onChange={(e) => set('city', e.target.value)}>
              <option>Covilhã</option>
              <option>Fundão</option>
              <option value="Outra">{t('onb.otherCity')}</option>
            </Select>
          </Field>
        </section>
      )}
      {step === 2 && (
        <section className="flex flex-col gap-3">
          <CardTitle as="h1">{t('onb.privacyTitle')}</CardTitle>
          <Checkbox
            checked={form.terms}
            onChange={(e) => set('terms', e.target.checked)}
            label={<>{t('onb.acceptTerms')} <Link href="/legal/termos" target="_blank" className="underline">{t('footer.terms')}</Link> {t('onb.required')}</>}
          />
          <Checkbox
            checked={form.privacy}
            onChange={(e) => set('privacy', e.target.checked)}
            label={<>{t('onb.readPrivacy')} <Link href="/legal/privacidade" target="_blank" className="underline">{t('footer.privacy')}</Link> {t('onb.required')}</>}
          />
          <Checkbox checked={form.age13} onChange={(e) => set('age13', e.target.checked)} label={<>{t('onb.age13')} {t('onb.required')}</>} />
          <p className="pt-2 text-sm font-semibold text-tinta-2">{t('onb.optional')}</p>
          <Checkbox checked={form.location} onChange={(e) => set('location', e.target.checked)} label={t('onb.location')} description={t('onb.locationHint')} />
          <Checkbox checked={form.push} onChange={(e) => set('push', e.target.checked)} label={t('onb.push')} description={t('onb.pushHint')} />
          <Checkbox checked={form.adsPersonalization} onChange={(e) => set('adsPersonalization', e.target.checked)} label={t('onb.ads')} description={t('onb.adsHint')} />
        </section>
      )}
      {error && !error.field ? <p role="alert" className="text-erro">{error.message}</p> : null}
      {error?.field && !['handle', 'displayName'].includes(error.field) ? <p role="alert" className="text-erro">{error.message}</p> : null}
      <div className="flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} type="button">
            {t('onb.back')}
          </Button>
        ) : null}
        {step < 2 ? (
          <Button className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)} type="button">
            {t('onb.next')}
          </Button>
        ) : (
          <Button className="flex-1" loading={busy} disabled={!form.terms || !form.privacy || !form.age13} onClick={finish} type="button">
            {t('onb.finish')}
          </Button>
        )}
      </div>
    </Card>
  );
}
