import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui';
import { getSessionProfile } from '@/server/auth';
import { MfaFlow } from './MfaFlow';

export const metadata: Metadata = { title: 'Verificação em dois passos', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/admin';
  const me = await getSessionProfile();
  if (!me) redirect(`/entrar?next=${encodeURIComponent(`/mfa?next=${next}`)}`);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardTitle as="h1">Verificação em dois passos</CardTitle>
      <p className="text-tinta-2">A administração exige um segundo fator. Usa uma app de autenticação (por exemplo, Google Authenticator, 1Password ou Aegis).</p>
      <MfaFlow next={next} />
    </Card>
  );
}
