'use client';
import { Button, EmptyState } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="pv-container pt-8">
      <EmptyState title="Algo correu mal" description="Não conseguimos carregar esta página. Tenta outra vez." action={<Button onClick={reset}>Tentar de novo</Button>} />
    </div>
  );
}
