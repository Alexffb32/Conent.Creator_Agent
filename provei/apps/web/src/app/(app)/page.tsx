import type { Metadata } from 'next';
import { Suspense } from 'react';
import { publicEnv } from '@/lib/env';
import { localeAlternates } from '@/lib/seo';
import { LinkButton, LinkTabs, Skeleton } from '@/components/ui';
import { FeedList } from '@/components/feed/FeedList';
import { LocationPrompt } from '@/components/feed/LocationPrompt';
import { getFeed, type FeedTab } from '@/server/feed';
import { getSessionProfile } from '@/server/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { getT } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getT();
  return {
    title: { absolute: t('meta.homeTitle') },
    description: t('meta.homeDescription'),
    alternates: localeAlternates('/', locale),
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string; conta?: string }> }) {
  const sp = await searchParams;
  const tab: FeedTab = sp.tab === 'perto' ? 'perto' : 'para-ti';
  const [me, { t }] = await Promise.all([getSessionProfile(), getT()]);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Provei', url: publicEnv.siteUrl, logo: `${publicEnv.siteUrl}/icons/icon-512.png`, email: 'ola@provei.pt' },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Provei', url: publicEnv.siteUrl, inLanguage: ['pt-PT', 'en'] },
  ];
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 pt-5 sm:px-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <div>
        <h1 className="pv-title text-4xl leading-tight text-verde-escuro">{t('feed.hello')}</h1>
        {sp.conta === 'apagada' ? <p role="status" className="mt-2 rounded-m bg-verde-tinta p-3 text-verde-escuro">{t('feed.accountDeleted')}</p> : null}
      </div>
      <LinkTabs
        active={tab}
        tabs={[
          { key: 'para-ti', label: t('feed.forYou'), href: '/' },
          { key: 'perto', label: t('feed.nearby'), href: '/?tab=perto' },
        ]}
      />
      {tab === 'perto' && me?.consents.location ? <LocationPrompt /> : null}
      {!isSupabaseConfigured() ? (
        <div role="alert" className="rounded-m bg-amarelo-tinta p-4">
          {t('feed.notConfigured')}
        </div>
      ) : (
        <Suspense fallback={<FeedSkeleton label={t('feed.loading')} />}>
          <FeedContent tab={tab} loggedIn={Boolean(me)} />
        </Suspense>
      )}
      {!me ? (
        <div className="flex flex-col items-center gap-2 pb-4 text-center">
          <p className="text-sm text-tinta-2">{t('feed.signupHint')}</p>
          <LinkButton href="/entrar" variant="secondary">{t('feed.signupCta')}</LinkButton>
        </div>
      ) : null}
    </div>
  );
}

async function FeedContent({ tab, loggedIn }: { tab: FeedTab; loggedIn: boolean }) {
  const page = await getFeed({ tab });
  return <FeedList key={tab} initial={page} tab={tab} loggedIn={loggedIn} />;
}

function FeedSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label={label}>
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="aspect-[4/5] w-full" />
    </div>
  );
}
