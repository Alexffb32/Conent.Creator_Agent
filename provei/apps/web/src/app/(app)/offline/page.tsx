import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('offline.title'), robots: { index: false } };
}

export default async function OfflinePage() {
  const { t } = await getT();
  return (
    <div className="pv-container pt-10">
      <EmptyState icon={<WifiOff size={40} />} title={t('offline.title')} description={t('offline.hint')} />
    </div>
  );
}
