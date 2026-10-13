'use client';
import { Button, EmptyState } from '@/components/ui';
import { useT } from '@/i18n/client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <div className="pv-container pt-8">
      <EmptyState title={t('common.error')} description={t('common.errorHint')} action={<Button onClick={reset}>{t('feed.retry')}</Button>} />
    </div>
  );
}
