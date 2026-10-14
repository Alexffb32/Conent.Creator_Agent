import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { acceptPendingInvites } from '@/server/invites';

/** Link do e-mail com token_hash: funciona noutro dispositivo (sem verificador PKCE). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (tokenHash && type) {
    const sb = await createServerSupabase();
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const { data } = await sb.auth.getUser();
      if (data.user) await acceptPendingInvites(data.user.id, data.user.email).catch(() => {});
      return NextResponse.redirect(`${origin}${safe}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
