import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { acceptPendingInvites } from '@/server/invites';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (code) {
    const sb = await createServerSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data } = await sb.auth.getUser();
      if (data.user) await acceptPendingInvites(data.user.id, data.user.email).catch(() => {});
      return NextResponse.redirect(`${origin}${safe}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
