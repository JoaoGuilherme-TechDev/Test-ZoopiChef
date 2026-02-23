import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração otimizada do QueryClient para melhor cache e performance.
 * 
 * Estratégias:
 * - staleTime: 5 minutos para dados que não mudam frequentemente
 * - gcTime: 30 minutos de cache antes de garbage collection
 * - retry: 3 tentativas com backoff exponencial
 * - refetchOnWindowFocus: desabilitado para evitar requests desnecessários
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo que dados são considerados "frescos" (não refetch)
      staleTime: 1000 * 60 * 5, // 5 minutos
      
      // Tempo que dados ficam em cache antes de serem removidos
      gcTime: 1000 * 60 * 30, // 30 minutos (anteriormente cacheTime)
      
      // Número de tentativas em caso de erro
      retry: 3,
      
      // Função de delay para retry exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Não refetch automaticamente quando a janela ganha foco
      refetchOnWindowFocus: false,
      
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
      
      // Manter dados anteriores enquanto faz refetch
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // Número de tentativas para mutations
      retry: 2,
      
      // Delay entre tentativas
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

/**
 * Prefetch de dados críticos para navegação mais rápida
 */
export async function prefetchCriticalData(companyId: string) {
  // Prefetch pode ser chamado em componentes de alto nível
  // para carregar dados antes que o usuário navegue
}

/**
 * Invalida todo o cache quando necessário (ex: logout)
 */
export function clearAllCache() {
  queryClient.clear();
}

/**
 * Invalida queries específicas por prefixo
 */
export function invalidateQueriesByPrefix(prefix: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith(prefix);
    },
  });
}
