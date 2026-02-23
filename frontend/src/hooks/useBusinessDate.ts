import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useCashSession } from './useCashSession';
import { format } from 'date-fns';

/**
 * Hook para trabalhar com a data de negócio (business_date) do caixa.
 * 
 * REGRA IMPORTANTE:
 * - A data de negócio é SEMPRE a data de ABERTURA do caixa
 * - Se o caixa abriu dia 20 às 16h e fechou dia 21 às 02h, é do dia 20
 * - Todos os pedidos do caixa pertencem à data de negócio do caixa
 * - Relatórios e dashboards devem usar business_date, não created_at
 */
export function useBusinessDate() {
  const { data: company } = useCompany();
  const { openSession } = useCashSession();

  /**
   * Retorna a data de negócio atual (do caixa aberto ou do dia atual)
   */
  const getCurrentBusinessDate = (): string => {
    if (openSession?.business_date) {
      return openSession.business_date;
    }
    // Se não há caixa aberto, usa a data atual
    return format(new Date(), 'yyyy-MM-dd');
  };

  /**
   * Busca dados de vendas por data de negócio
   */
  const { data: salesByBusinessDate, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales-by-business-date', company?.id, openSession?.id],
    queryFn: async () => {
      if (!company?.id || !openSession?.id) return null;

      // Buscar pedidos vinculados ao caixa atual
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total, payment_method, created_at, cancelled_at')
        .eq('company_id', company.id)
        .eq('cash_session_id', openSession.id);

      if (error) throw error;

      const validOrders = orders?.filter(o => !o.cancelled_at) || [];
      const cancelledOrders = orders?.filter(o => o.cancelled_at) || [];

      return {
        businessDate: openSession.business_date || getCurrentBusinessDate(),
        totalOrders: validOrders.length,
        totalRevenue: validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        avgTicket: validOrders.length > 0 
          ? validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) / validOrders.length 
          : 0,
        cancelledOrders: cancelledOrders.length,
        byStatus: {
          novo: validOrders.filter(o => o.status === 'novo').length,
          preparo: validOrders.filter(o => o.status === 'preparo').length,
          pronto: validOrders.filter(o => o.status === 'pronto').length,
          em_rota: validOrders.filter(o => o.status === 'em_rota').length,
          entregue: validOrders.filter(o => o.status === 'entregue').length,
        },
      };
    },
    enabled: !!company?.id && !!openSession?.id,
    refetchInterval: 30000,
  });

  /**
   * Busca histórico de vendas por business_date
   */
  const getSalesByDateRange = async (startDate: Date, endDate: Date) => {
    if (!company?.id) return [];

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data: sessions, error } = await supabase
      .from('cash_sessions')
      .select(`
        id,
        business_date,
        total_orders,
        total_revenue,
        avg_ticket,
        status,
        opened_at,
        closed_at
      `)
      .eq('company_id', company.id)
      .gte('business_date', startStr)
      .lte('business_date', endStr)
      .order('business_date', { ascending: false });

    if (error) throw error;

    // Agrupar por data de negócio
    const grouped = (sessions || []).reduce((acc, session) => {
      const date = session.business_date;
      if (!acc[date]) {
        acc[date] = {
          businessDate: date,
          totalOrders: 0,
          totalRevenue: 0,
          sessions: [],
        };
      }
      acc[date].totalOrders += session.total_orders || 0;
      acc[date].totalRevenue += session.total_revenue || 0;
      acc[date].sessions.push(session);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  };

  return {
    currentBusinessDate: getCurrentBusinessDate(),
    openSession,
    salesByBusinessDate,
    isLoadingSales,
    getSalesByDateRange,
  };
}

/**
 * Função utilitária para extrair business_date de um timestamp
 * Considera timezone de São Paulo
 */
export function getBusinessDateFromTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  // Ajusta para timezone de São Paulo (UTC-3)
  const saoPauloDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return format(saoPauloDate, 'yyyy-MM-dd');
}

/**
 * Formata business_date para exibição
 */
export function formatBusinessDate(businessDate: string): string {
  const [year, month, day] = businessDate.split('-');
  return `${day}/${month}/${year}`;
}
