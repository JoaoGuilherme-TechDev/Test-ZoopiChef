import PublicMenuBySlug from '@/pages/PublicMenuBySlug';

/**
 * TenantWeb - Cardápio Web público
 * Rota: /:slug/web
 * 
 * Redireciona para o menu público usando o slug do tenant.
 * Mesmo comportamento do delivery, mas com rota /web.
 */
export default function TenantWeb() {
  return <PublicMenuBySlug />;
}
