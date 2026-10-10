import Link from 'next/link';
import { Suspense } from 'react';
import { MSG } from '@provei/domain';
import { LinkTabs, Skeleton } from '@/components/ui';
import { FeedList } from '@/components/feed/FeedList';
import { LocationPrompt } from '@/components/feed/LocationPrompt';
import { getFeed, type FeedTab } from '@/server/feed';
import { getSessionProfile } from '@/server/auth';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string; conta?: string }> }) {
  const sp = await searchParams;
  const tab: FeedTab = sp.tab === 'perto' ? 'perto' : 'para-ti';
  const me = await getSessionProfile();
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 pt-5 sm:px-0">
      <div>
        <h1 className="pv-title text-4xl leading-tight text-verde-escuro">{MSG.feedHello}</h1>
        {sp.conta === 'apagada' ? <p role="status" className="mt-2 rounded-m bg-verde-tinta p-3 text-verde-escuro">A tua conta foi apagada. Obrigado por teres estado cá.</p> : null}
      </div>
      <LinkTabs
        active={tab}
        tabs={[
          { key: 'para-ti', label: 'Para ti', href: '/' },
          { key: 'perto', label: 'Perto', href: '/?tab=perto' },
        ]}
      />
      {tab === 'perto' && me?.consents.location ? <LocationPrompt /> : null}
      {!isSupabaseConfigured() ? (
        <div role="alert" className="rounded-m bg-amarelo-tinta p-4">
          A app ainda não está ligada à base de dados. Vê o README para configurar o Supabase.
        </div>
      ) : (
        <Suspense fallback={<FeedSkeleton />}>
          <FeedContent tab={tab} loggedIn={Boolean(me)} />
        </Suspense>
      )}
      {!me ? (
        <p className="pb-4 text-center text-sm text-tinta-2">
          <Link href="/entrar" className="font-semibold text-verde underline">Entra</Link> para seguires restaurantes, guardares pratos e ganhares pontos.
        </p>
      ) : null}
    </div>
  );
}

async function FeedContent({ tab, loggedIn }: { tab: FeedTab; loggedIn: boolean }) {
  const page = await getFeed({ tab });
  return <FeedList key={tab} initial={page} tab={tab} loggedIn={loggedIn} />;
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="A carregar pratos">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="aspect-[4/5] w-full" />
    </div>
  );
}
