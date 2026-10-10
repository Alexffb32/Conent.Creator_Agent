/** Acesso tipado e centralizado às variáveis de ambiente. Nunca expor as não-públicas ao cliente. */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

export const serverEnv = {
  get serviceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  },
  get tableTokenSecret() {
    return process.env.TABLE_TOKEN_SECRET ?? '';
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? '';
  },
  get vapid() {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
      privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
      subject: process.env.VAPID_SUBJECT ?? 'mailto:ola@provei.pt',
    };
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? '';
  },
  get mailFrom() {
    return process.env.RESEND_FROM ?? process.env.MAIL_FROM ?? 'Provei <onboarding@resend.dev>';
  },
  get stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      priceInstall: process.env.STRIPE_PRICE_INSTALL ?? '',
      priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? '',
      priceAdFree: process.env.STRIPE_PRICE_AD_FREE ?? '',
    };
  },
  get wallet() {
    return {
      appleTypeId: process.env.APPLE_PASS_TYPE_ID ?? '',
      appleTeamId: process.env.APPLE_TEAM_ID ?? '',
      appleCertBase64: process.env.APPLE_PASS_CERT_BASE64 ?? '',
      appleCertPassword: process.env.APPLE_PASS_CERT_PASSWORD ?? '',
      googleIssuerId: process.env.GOOGLE_WALLET_ISSUER_ID ?? '',
      googleServiceAccountJson: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON ?? '',
    };
  },
  get videoProcessor(): 'local' | 'mux' | 'cloudflare' {
    const v = process.env.VIDEO_PROCESSOR;
    return v === 'mux' || v === 'cloudflare' ? v : 'local';
  },
  get redisUrl() {
    return process.env.RATE_LIMIT_REDIS_URL ?? '';
  },
};

/** Exige um segredo com comprimento mínimo; em dev usa um valor derivado (nunca em produção). */
export function tableSecret(): string {
  const s = serverEnv.tableTokenSecret;
  if (s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('TABLE_TOKEN_SECRET em falta ou demasiado curto');
  return 'dev-only-table-secret-change-me-0000';
}
