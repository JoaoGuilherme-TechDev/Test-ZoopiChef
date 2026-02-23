import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useEffect, useMemo } from 'react';

export interface DashboardRealtimeData {
  // Pedidos
  orders: {
    total: number;
    novo: number;
    preparo: number;
    pronto: number;
    em_rota: number;
    entregue: number;
    cancelled: number;
    revenue: number;
    avgTicket: number;
  };
  // Mesas
  tables: {
    total: number;
    free: number;
    occupied: number;
    awaiting_payment: number;
    reserved: number;
  };
  // Comandas
  comandas: {
    total: number;
    open: number;
    awaiting_payment: number;
    closed: number;
    totalAmount: number;
    paidAmount: number;
  };
  // Caixa
  cashRegister: {
    isOpen: boolean;
    sessionId: string | null;
    businessDate: string | null;
    openingBalance: number;
    currentBalance: number;
    totalSales: number;
    totalDelivered: number;
    paymentBreakdown: Record<string, number>;
  };
  // Itens/Contas excluídas
  deletions: {
    cancelledOrders: number;
    cancelledItems: number;
    cancelledAmount: number;
  };
  // Contas a pagar/receber
  financials: {
    payablesToday: number;
    payablesTodayCount: number;
    receivablesToday: number;
    receivablesTodayCount: number;
    overduePayables: number;
    overduePayablesCount: number;
  };
  // Estoque
  inventory: {
    lowStockProducts: Array<{
      id: string;
      name: string;
      currentStock: number;
      minStock: number;
    }>;
    inactiveProducts: number;
    noSalesProducts: Array<{
      id: string;
      name: string;
      daysSinceLastSale: number;
      currentStock: number;
    }>;
  };
  // Métricas extras
  metrics: {
    avgPrepTime: number | null;
    avgDeliveryTime: number | null;
    onTimeRate: number | null;
    customersToday: number;
    newCustomersToday: number;
    activeDeliverers: number;
    delayedOrders: number;
  };
}

export function useDashboardRealtime() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-realtime', company?.id],
    queryFn: async (): Promise<DashboardRealtimeData | null> => {
      if (!company?.id) return null;

      // FIX: Usar fuso horário local para calcular a data de hoje
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Buscar caixa aberto
      const { data: cashSession } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .maybeSingle();

      // Executar consultas em paralelo
      // Query de pedidos baseada no caixa ou data
      let ordersQuery = supabase
        .from('orders')
        .select('id, status, total, payment_method, cancelled_at, cancel_reason, created_at, customer_id, accepted_at, ready_at, dispatched_at, delivered_at')
        .eq('company_id', company.id);

      // FIX: Priorizar business_date do caixa se disponível, depois cash_session_id, depois data local
      if (cashSession?.business_date) {
        ordersQuery = ordersQuery.gte('created_at', `${cashSession.business_date}T00:00:00`).lt('created_at', `${cashSession.business_date}T23:59:59.999`);
      } else if (cashSession?.id) {
        ordersQuery = ordersQuery.eq('cash_session_id', cashSession.id);
      } else {
        ordersQuery = ordersQuery.gte('created_at', `${todayStr}T00:00:00`).lt('created_at', `${todayStr}T23:59:59.999`);
      }

      const [
        ordersResult,
        tablesResult,
        comandasResult,
        comandasClosedResult,
        payablesResult,
        productsResult,
        erpItemsResult,
        deliverersResult,
        customerLedgerResult,
      ] = await Promise.all([
        // Pedidos do caixa/dia
        ordersQuery,
        
        // Mesas - todas para contagem correta
        supabase
          .from('tables')
          .select('id, number, status, active')
          .eq('company_id', company.id)
          .eq('active', true),
        
        // Comandas abertas e aguardando pagamento
        supabase
          .from('comandas')
          .select('id, command_number, status, total_amount, paid_amount, opened_at')
          .eq('company_id', company.id)
          .in('status', ['open', 'awaiting_payment']),
        
        // Comandas fechadas hoje para totais
        supabase
          .from('comandas')
          .select('id, status, total_amount, paid_amount')
          .eq('company_id', company.id)
          .eq('status', 'closed')
          .gte('closed_at', `${todayStr}T00:00:00`),
        
        // Contas a pagar - todas pendentes
        supabase
          .from('accounts_payable')
          .select('id, amount_cents, due_date, status, description')
          .eq('company_id', company.id)
          .in('status', ['pending', 'open']),
        
        // Produtos para verificar inativos
        supabase
          .from('products')
          .select('id, name, active')
          .eq('company_id', company.id),

        // ERP Items para estoque mínimo
        supabase
          .from('erp_items')
          .select('id, name, track_stock, current_stock, min_stock, active')
          .eq('company_id', company.id)
          .eq('active', true)
          .eq('track_stock', true),
        
        // Entregadores ativos
        supabase
          .from('deliverers')
          .select('id, active')
          .eq('company_id', company.id)
          .eq('active', true),
        
        // Customer ledger para fiado a receber (débitos não pagos)
        supabase
          .from('customer_ledger')
          .select('id, amount, transaction_type')
          .eq('company_id', company.id)
          .eq('transaction_type', 'debit'),
      ]);

      const orders = ordersResult.data || [];
      const tables = tablesResult.data || [];
      const comandas = (comandasResult.data || []) as Array<{id: string; command_number: number; status: string; total_amount: number; paid_amount: number; opened_at: string}>;
      const comandasClosed = (comandasClosedResult.data || []) as Array<{id: string; status: string; total_amount: number; paid_amount: number}>;
      const payables = payablesResult.data || [];
      const products = productsResult.data || [];
      const erpItems = (erpItemsResult.data || []) as Array<{id: string; name: string; track_stock: boolean; current_stock: number; min_stock: number; active: boolean}>;
      const deliverers = deliverersResult.data || [];
      const customerDebits = (customerLedgerResult.data || []) as Array<{id: string; amount: number; transaction_type: string}>;

      // Calcular métricas de pedidos
      const validOrders = orders.filter(o => !o.cancelled_at);
      const cancelledOrders = orders.filter(o => o.cancelled_at);
      const deliveredOrders = validOrders.filter(o => o.status === 'entregue');
      const revenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Calcular tempos médios
      let totalPrepTime = 0;
      let prepCount = 0;
      let totalDeliveryTime = 0;
      let deliveryCount = 0;

      deliveredOrders.forEach(o => {
        if (o.accepted_at && o.ready_at) {
          const prep = new Date(o.ready_at).getTime() - new Date(o.accepted_at).getTime();
          totalPrepTime += prep / 60000;
          prepCount++;
        }
        if (o.dispatched_at && o.delivered_at) {
          const delivery = new Date(o.delivered_at).getTime() - new Date(o.dispatched_at).getTime();
          totalDeliveryTime += delivery / 60000;
          deliveryCount++;
        }
      });

      // Pedidos atrasados (mais de 45min sem entregar)
      const nowTimestamp = Date.now();
      const delayedOrders = validOrders.filter(o => {
        if (o.status === 'entregue') return false;
        const created = new Date(o.created_at).getTime();
        return (nowTimestamp - created) > 45 * 60 * 1000;
      }).length;

      // Calcular mesas
      const tableStats = {
        total: tables.length,
        free: tables.filter(t => t.status === 'free').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        awaiting_payment: tables.filter(t => t.status === 'awaiting_payment').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
      };

      // Calcular comandas
      const comandaStats = {
        total: comandas.length,
        open: comandas.filter(c => c.status === 'open').length,
        awaiting_payment: comandas.filter(c => c.status === 'awaiting_payment').length,
        closed: comandasClosed.length,
        totalAmount: comandas.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
        paidAmount: comandas.reduce((sum, c) => sum + Number(c.paid_amount || 0), 0),
      };

      // Calcular contas a pagar
      const todayPayables = payables.filter(p => p.due_date === todayStr);
      const overduePayables = payables.filter(p => p.due_date && p.due_date < todayStr);

      // Calcular breakdown de pagamentos
      const paymentBreakdown: Record<string, number> = {};
      deliveredOrders.forEach(o => {
        const method = o.payment_method || 'outros';
        paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (o.total || 0);
      });

      // ERP items com estoque baixo
      const lowStockErpItems = erpItems
        .filter((i: any) => i.current_stock !== null && i.min_stock !== null && i.current_stock <= i.min_stock)
        .map((i: any) => ({
          id: i.id,
          name: i.name,
          currentStock: i.current_stock || 0,
          minStock: i.min_stock || 0,
        }));

      // Produtos inativos
      const inactiveProducts = products.filter((p: any) => !p.active).length;

      // Clientes únicos hoje
      const uniqueCustomers = new Set(validOrders.filter(o => o.customer_id).map(o => o.customer_id));

      return {
        orders: {
          total: validOrders.length,
          novo: validOrders.filter(o => o.status === 'novo').length,
          preparo: validOrders.filter(o => o.status === 'preparo').length,
          pronto: validOrders.filter(o => o.status === 'pronto').length,
          em_rota: validOrders.filter(o => o.status === 'em_rota').length,
          entregue: deliveredOrders.length,
          cancelled: cancelledOrders.length,
          revenue,
          avgTicket: deliveredOrders.length > 0 ? revenue / deliveredOrders.length : 0,
        },
        tables: tableStats,
        comandas: comandaStats,
        cashRegister: {
          isOpen: !!cashSession,
          sessionId: cashSession?.id || null,
          businessDate: cashSession?.business_date || null,
          openingBalance: cashSession?.opening_balance || 0,
          currentBalance: (cashSession?.opening_balance || 0) + revenue,
          totalSales: revenue,
          totalDelivered: deliveredOrders.length,
          paymentBreakdown,
        },
        deletions: {
          cancelledOrders: cancelledOrders.length,
          cancelledItems: 0, // Seria preciso outra query
          cancelledAmount: cancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        },
        financials: {
          payablesToday: todayPayables.reduce((sum, p) => sum + p.amount_cents, 0) / 100,
          payablesTodayCount: todayPayables.length,
          receivablesToday: customerDebits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          receivablesTodayCount: customerDebits.length,
          overduePayables: overduePayables.reduce((sum, p) => sum + p.amount_cents, 0) / 100,
          overduePayablesCount: overduePayables.length,
        },
        inventory: {
          lowStockProducts: lowStockErpItems,
          inactiveProducts,
          noSalesProducts: [], // Seria necessário implementar análise de vendas por produto
        },
        metrics: {
          avgPrepTime: prepCount > 0 ? Math.round(totalPrepTime / prepCount) : null,
          avgDeliveryTime: deliveryCount > 0 ? Math.round(totalDeliveryTime / deliveryCount) : null,
          onTimeRate: validOrders.length > 0 ? Math.round(((validOrders.length - delayedOrders) / validOrders.length) * 100) : null,
          customersToday: uniqueCustomers.size,
          newCustomersToday: 0, // Precisaria de outra query
          activeDeliverers: deliverers.length,
          delayedOrders,
        },
      };
    },
    enabled: !!company?.id,
    staleTime: 1000 * 30, // 30 segundos - OTIMIZAÇÃO
    gcTime: 1000 * 60 * 2, // 2 min cache
    refetchInterval: 1000 * 60, // OTIMIZAÇÃO: 60 segundos (era 15s) - realtime subscription já cuida de updates instantâneos
    refetchOnWindowFocus: false,
  });

  // Realtime subscription para atualizações instantâneas
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel(`dashboard-realtime-${company.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `company_id=eq.${company.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-realtime', company.id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tables',
        filter: `company_id=eq.${company.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-realtime', company.id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comandas',
        filter: `company_id=eq.${company.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-realtime', company.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  return {
    data,
    isLoading,
    refetch,
  };
}
