import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '@/lib/env';

/** Cliente com a sessão do utilizador (RLS aplica-se). */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado a partir de um Server Component: o middleware atualiza a sessão.
        }
      },
    },
  });
}

/**
 * Cliente de serviço: ignora RLS. Só usar no servidor, DEPOIS de autenticar e autorizar
 * explicitamente (ver src/server/auth.ts). Nunca importar em componentes de cliente.
 */
export function createServiceSupabase() {
  if (!serverEnv.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY em falta');
  return createSupabaseClient(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente anónimo sem cookies (para páginas públicas e metadados), respeita RLS. */
export function createAnonSupabase() {
  return createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
