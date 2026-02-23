/**
 * Sistema de Prefetch de Dados
 * 
 * Carrega dados antecipadamente para navegação instantânea
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

/**
 * Prefetch de dados críticos ao carregar o dashboard
 */
export async function prefetchCriticalData(
  queryClient: QueryClient,
  companyId: string
): Promise<void> {
  const prefetchPromises: Promise<void>[] = [];

  // Prefetch pedidos do dia
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['orders', companyId],
      queryFn: async () => {
        const { data: openSession } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('company_id', companyId)
          .eq('status', 'open')
          .maybeSingle();

        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:customers(id, name, whatsapp, alerts),
            deliverer:deliverers(id, name, whatsapp),
            items:order_items(*)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (openSession?.id) {
          query = query.eq('cash_session_id', openSession.id);
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          query = query.gte('created_at', yesterday.toISOString());
        }

        const { data } = await query;
        return data || [];
      },
      staleTime: 1000 * 30,
    })
  );

  // Prefetch produtos ativos - must match useProducts query structure
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['products', companyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('products')
          .select(`
            *,
            subcategory:subcategories(
              *,
              category:categories(id, name)
            )
          `)
          .eq('company_id', companyId)
          .order('name');
        return data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutos
    })
  );

  // Prefetch categorias
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['categories', companyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('categories')
          .select('id, name, display_order, active')
          .eq('company_id', companyId)
          .eq('active', true)
          .order('display_order');
        return data || [];
      },
      staleTime: 1000 * 60 * 10, // 10 minutos
    })
  );

  // Prefetch entregadores ativos
  prefetchPromises.push(
    queryClient.prefetchQuery({
      queryKey: ['deliverers', companyId],
      queryFn: async () => {
        const { data } = await supabase
          .from('deliverers')
          .select('id, name, whatsapp, active, vehicle')
          .eq('company_id', companyId)
          .eq('active', true);
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    })
  );

  // Executar todos os prefetches em paralelo
  await Promise.allSettled(prefetchPromises);
}

/**
 * Prefetch de dados ao passar o mouse sobre um link do menu
 */
export function prefetchOnHover(
  queryClient: QueryClient,
  companyId: string,
  route: string
): void {
  switch (route) {
    case '/orders':
      queryClient.prefetchQuery({
        queryKey: ['orders', companyId],
        staleTime: 1000 * 30,
      });
      break;
    case '/products':
      queryClient.prefetchQuery({
        queryKey: ['products', companyId],
        staleTime: 1000 * 60 * 5,
      });
      break;
    case '/customers':
      queryClient.prefetchQuery({
        queryKey: ['customers', companyId],
        queryFn: async () => {
          const { data } = await supabase
            .from('customers')
            .select('id, name, whatsapp, total_orders, total_spent')
            .eq('company_id', companyId)
            .order('name')
            .limit(100);
          return data || [];
        },
        staleTime: 1000 * 60 * 5,
      });
      break;
    case '/kds':
      queryClient.prefetchQuery({
        queryKey: ['kds-orders', companyId],
        staleTime: 1000 * 15,
      });
      break;
    default:
      break;
  }
}

/**
 * Limpa cache de rotas não utilizadas
 */
export function cleanupStaleCache(queryClient: QueryClient): void {
  // Remove queries não utilizadas há mais de 30 minutos
  queryClient.getQueryCache().findAll().forEach((query) => {
    const lastUpdated = query.state.dataUpdatedAt;
    const thirtyMinutesAgo = Date.now() - 1000 * 60 * 30;
    
    if (lastUpdated < thirtyMinutesAgo && !query.isActive()) {
      queryClient.removeQueries({ queryKey: query.queryKey });
    }
  });
}
