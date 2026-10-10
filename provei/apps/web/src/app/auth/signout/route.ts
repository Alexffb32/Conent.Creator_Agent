import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
