import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { FlagsProvider } from '@/lib/flags-client';
import { getFlags } from '@/lib/flags';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const flags = await getFlags();
  return (
    <FlagsProvider flags={flags}>
      <AppShell>{children}</AppShell>
    </FlagsProvider>
  );
}
