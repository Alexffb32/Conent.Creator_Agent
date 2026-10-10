import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui';
import { getSessionProfile } from '@/server/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Entrar' };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const me = await getSessionProfile();
  if (me) redirect(next);
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div>
        <CardTitle>Entra no Provei</CardTitle>
        <p className="mt-1 text-tinta-2">Sem palavras-passe: enviamos-te um link para o teu e-mail.</p>
      </div>
      {sp.erro === 'suspensa' ? <p role="alert" className="rounded-m bg-[#fbe9e7] p-3 text-erro">A tua conta está suspensa. Fala connosco se achas que foi engano.</p> : null}
      {sp.erro === 'link' ? <p role="alert" className="rounded-m bg-[#fbe9e7] p-3 text-erro">O link expirou ou já foi usado. Pede um novo.</p> : null}
      {!isSupabaseConfigured() ? (
        <p role="alert" className="rounded-m bg-amarelo-tinta p-3 text-sm">A ligação à base de dados ainda não está configurada. Vê o README.</p>
      ) : null}
      <LoginForm next={next} googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === 'true'} />
    </Card>
  );
}

function safeNext(n?: string): string {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}
