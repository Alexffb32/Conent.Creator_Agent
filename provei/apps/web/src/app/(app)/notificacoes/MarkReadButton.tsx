'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { markAllRead } from '@/server/actions/notifications';

export function MarkReadButton() {
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" onClick={async () => { await markAllRead(); router.refresh(); }}>
      Marcar tudo como lido
    </Button>
  );
}
