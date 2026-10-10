import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/server/auth';
import { OnboardingFlow } from './OnboardingFlow';

export const metadata: Metadata = { title: 'Bem-vindo' };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const me = await getSessionProfile();
  if (!me) redirect('/entrar');
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/';
  if (me.onboarded) redirect(next);
  const suggested = (me.email ?? '').split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ?? '';
  return <OnboardingFlow next={next} initialHandle={suggested.slice(0, 20)} />;
}
