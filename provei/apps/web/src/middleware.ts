import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Mantém a sessão Supabase atualizada nos cookies. Sem configuração, deixa passar. */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Idioma: ?lang=pt|en fixa o cookie pv_lang e passa o valor já neste pedido.
  const lang = request.nextUrl.searchParams.get('lang');
  const setLang = lang === 'pt' || lang === 'en' ? lang : null;
  if (setLang) request.headers.set('x-pv-lang', setLang);
  const withLang = (res: NextResponse) => {
    if (setLang) res.cookies.set('pv_lang', setLang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
    return res;
  };

  let response = NextResponse.next({ request: { headers: request.headers } });
  if (!url || !key) return withLang(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return withLang(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
};
