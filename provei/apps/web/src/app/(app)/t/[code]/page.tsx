import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardTitle, LinkButton } from '@/components/ui';
import { getSessionProfile } from '@/server/auth';
import { issueTableToken } from '@/server/tables';
import { EnterTable } from './EnterTable';
import { getT } from '@/i18n/server';

export const metadata: Metadata = { title: 'Entrar na mesa', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function TablePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ nfc?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const next = `/t/${code}${sp.nfc ? '?nfc=1' : ''}`;
  const me = await getSessionProfile();
  if (!me) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  if (!me.onboarded) redirect(`/onboarding?next=${encodeURIComponent(next)}`);

  const issued = await issueTableToken(code, sp.nfc ? 'nfc' : 'qr');
  if (!issued) {
    const { t } = await getT();
    return (
      <div className="pv-container max-w-md pt-8">
        <Card className="flex flex-col gap-3 text-center">
          <CardTitle as="h1">{t('table.notFound')}</CardTitle>
          <p className="text-tinta-2">{t('table.notFoundHint')}</p>
          <LinkButton href="/" variant="secondary">{t('table.goHome')}</LinkButton>
        </Card>
      </div>
    );
  }
  return <EnterTable token={issued.token} restaurant={issued.table.restaurantName} label={issued.table.label} />;
}
