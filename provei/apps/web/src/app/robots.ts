import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/auth/', '/r/*/admin', '/perfil', '/cartao', '/mesa', '/t/', '/guardados', '/notificacoes', '/onboarding', '/entrar'] }],
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
