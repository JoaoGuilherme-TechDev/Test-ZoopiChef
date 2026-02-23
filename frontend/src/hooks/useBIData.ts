import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useEffect } from 'react';
import { startOfDay, endOfDay, format, isSameDay } from 'date-fns';

export interface BIFilters {
  startDate: Date;
  endDate: Date;
  delivererId?: string;
  paymentMethod?: string;
  channel?: string;
}

export function useBIData(filters: BIFilters) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Realtime subscription for orders
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('bi-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`
        },
        () => {
          // Invalidate all BI queries on any order change
          queryClient.invalidateQueries({ queryKey: ['bi-'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  // Main overview stats
  const { data: overviewStats, isLoading: loadingOverview } = useQuery({
    queryKey: ['bi-overview', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return null;

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const base = supabase
        .from('orders')
        .select('*')
        .eq('company_id', company.id);

      // For "Hoje": include orders delivered today even if created yesterday
      const query = isSameDay(filters.startDate, new Date())
        ? base.or(`and(status.eq.entregue,delivered_at.gte.${startIso},delivered_at.lte.${endIso}),and(status.neq.entregue,created_at.gte.${startIso},created_at.lte.${endIso})`)
        : base.gte('created_at', startIso).lte('created_at', endIso);

      const { data: orders, error } = await query;

      if (error) throw error;

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Count by status
      const statusCounts = {
        novo: orders?.filter(o => o.status === 'novo').length || 0,
        preparo: orders?.filter(o => o.status === 'preparo').length || 0,
        pronto: orders?.filter(o => o.status === 'pronto').length || 0,
        em_rota: orders?.filter(o => o.status === 'em_rota').length || 0,
        entregue: orders?.filter(o => o.status === 'entregue').length || 0,
        cancelado: orders?.filter(o => (o.status as string) === 'cancelado').length || 0,
      };

      // Calculate delayed orders (more than 15 min in novo or preparo)
      const now = new Date();
      const delayedOrders = orders?.filter(o => {
        if (!['novo', 'preparo'].includes(o.status || '')) return false;
        const createdAt = new Date(o.created_at);
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return diffMinutes > 15;
      }).length || 0;

      // Payment method totals
      const paymentTotals = {
        dinheiro: orders?.filter(o => o.payment_method?.toLowerCase().includes('dinheiro')).reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        pix: orders?.filter(o => o.payment_method?.toLowerCase().includes('pix')).reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        cartao: orders?.filter(o => o.payment_method?.toLowerCase().includes('cart') || o.payment_method?.toLowerCase().includes('débito') || o.payment_method?.toLowerCase().includes('crédito')).reduce((sum, o) => sum + (o.total || 0), 0) || 0,
        fiado: orders?.filter(o => o.payment_method?.toLowerCase().includes('fiado')).reduce((sum, o) => sum + (o.total || 0), 0) || 0,
      };

      const paymentCounts = {
        dinheiro: orders?.filter(o => o.payment_method?.toLowerCase().includes('dinheiro')).length || 0,
        pix: orders?.filter(o => o.payment_method?.toLowerCase().includes('pix')).length || 0,
        cartao: orders?.filter(o => o.payment_method?.toLowerCase().includes('cart') || o.payment_method?.toLowerCase().includes('débito') || o.payment_method?.toLowerCase().includes('crédito')).length || 0,
        fiado: orders?.filter(o => o.payment_method?.toLowerCase().includes('fiado')).length || 0,
      };

      return {
        totalRevenue,
        totalOrders,
        avgTicket,
        statusCounts,
        delayedOrders,
        paymentTotals,
        paymentCounts,
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000, // Auto refresh every 30 seconds
  });

  // Sales by channel
  const { data: channelData, isLoading: loadingChannel } = useQuery({
    queryKey: ['bi-channel', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const base = supabase
        .from('orders')
        .select('order_type, total, status, created_at, delivered_at')
        .eq('company_id', company.id);

      const query = isSameDay(filters.startDate, new Date())
        ? base.or(`and(status.eq.entregue,delivered_at.gte.${startIso},delivered_at.lte.${endIso}),and(status.neq.entregue,created_at.gte.${startIso},created_at.lte.${endIso})`)
        : base.gte('created_at', startIso).lte('created_at', endIso);

      const { data: orders, error } = await query;

      if (error) throw error;

      const channelMap: Record<string, { name: string; value: number; count: number }> = {};
      
      const channelLabels: Record<string, string> = {
        delivery: 'Delivery',
        balcao: 'Balcão',
        mesa: 'Mesa/Consumo Local',
        totem: 'Totem',
        whatsapp: 'WhatsApp',
        telefone: 'Telefone',
        online: 'Online',
        retirada: 'Retirada',
      };

      orders?.forEach(order => {
        const type = order.order_type?.toLowerCase() || 'outros';
        const label = channelLabels[type] || type;
        if (!channelMap[label]) {
          channelMap[label] = { name: label, value: 0, count: 0 };
        }
        channelMap[label].value += order.total || 0;
        channelMap[label].count += 1;
      });

      const total = Object.values(channelMap).reduce((sum, c) => sum + c.value, 0);
      
      return Object.values(channelMap).map(c => ({
        ...c,
        percentage: total > 0 ? ((c.value / total) * 100).toFixed(1) : '0',
      }));
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  // Deliverer performance
  const { data: delivererStats, isLoading: loadingDeliverers } = useQuery({
    queryKey: ['bi-deliverers', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return [];

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const base = supabase
        .from('orders')
        .select(`
          *,
          deliverer:deliverers(id, name)
        `)
        .eq('company_id', company.id)
        .not('deliverer_id', 'is', null);

      const query = isSameDay(filters.startDate, new Date())
        ? base.or(`and(status.eq.entregue,delivered_at.gte.${startIso},delivered_at.lte.${endIso}),and(status.neq.entregue,created_at.gte.${startIso},created_at.lte.${endIso})`)
        : base.gte('created_at', startIso).lte('created_at', endIso);

      const { data: orders, error } = await query;

      if (error) throw error;

      const delivererMap: Record<string, {
        id: string;
        name: string;
        deliveries: number;
        totalValue: number;
        avgDeliveryTime: number;
        inRoute: number;
        delayed: number;
        deliveryTimes: number[];
      }> = {};

      const now = new Date();

      orders?.forEach((order: any) => {
        const deliverer = order.deliverer;
        if (!deliverer) return;

        if (!delivererMap[deliverer.id]) {
          delivererMap[deliverer.id] = {
            id: deliverer.id,
            name: deliverer.name,
            deliveries: 0,
            totalValue: 0,
            avgDeliveryTime: 0,
            inRoute: 0,
            delayed: 0,
            deliveryTimes: [],
          };
        }

        delivererMap[deliverer.id].deliveries += 1;
        delivererMap[deliverer.id].totalValue += order.total || 0;

        if (order.status === 'em_rota') {
          delivererMap[deliverer.id].inRoute += 1;
        }

        // Calculate delivery time if delivered
        if (order.status === 'entregue' && order.dispatched_at && order.delivered_at) {
          const dispatchedAt = new Date(order.dispatched_at);
          const deliveredAt = new Date(order.delivered_at);
          const deliveryTime = (deliveredAt.getTime() - dispatchedAt.getTime()) / (1000 * 60);
          delivererMap[deliverer.id].deliveryTimes.push(deliveryTime);
        }

        // Check if delayed
        if (order.status === 'em_rota' && order.dispatched_at) {
          const dispatchedAt = new Date(order.dispatched_at);
          const diffMinutes = (now.getTime() - dispatchedAt.getTime()) / (1000 * 60);
          if (diffMinutes > 45) {
            delivererMap[deliverer.id].delayed += 1;
          }
        }
      });

      // Calculate averages
      return Object.values(delivererMap).map(d => ({
        ...d,
        avgDeliveryTime: d.deliveryTimes.length > 0 
          ? Math.round(d.deliveryTimes.reduce((a, b) => a + b, 0) / d.deliveryTimes.length)
          : 0,
      })).sort((a, b) => b.deliveries - a.deliveries);
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  // Operational times
  const { data: operationalTimes, isLoading: loadingTimes } = useQuery({
    queryKey: ['bi-times', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return null;

      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, accepted_at, ready_at, dispatched_at, delivered_at, status')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('delivered_at', startIso)
        .lte('delivered_at', endIso);

      if (error) throw error;

      const times = {
        waitTimes: [] as number[],
        prepTimes: [] as number[],
        readyTimes: [] as number[],
        deliveryTimes: [] as number[],
        totalTimes: [] as number[],
      };

      orders?.forEach(order => {
        const created = new Date(order.created_at);
        const accepted = order.accepted_at ? new Date(order.accepted_at) : null;
        const ready = order.ready_at ? new Date(order.ready_at) : null;
        const dispatched = order.dispatched_at ? new Date(order.dispatched_at) : null;
        const delivered = order.delivered_at ? new Date(order.delivered_at) : null;

        if (accepted) {
          times.waitTimes.push((accepted.getTime() - created.getTime()) / (1000 * 60));
        }
        if (accepted && ready) {
          times.prepTimes.push((ready.getTime() - accepted.getTime()) / (1000 * 60));
        }
        if (ready && dispatched) {
          times.readyTimes.push((dispatched.getTime() - ready.getTime()) / (1000 * 60));
        }
        if (dispatched && delivered) {
          times.deliveryTimes.push((delivered.getTime() - dispatched.getTime()) / (1000 * 60));
        }
        if (delivered) {
          times.totalTimes.push((delivered.getTime() - created.getTime()) / (1000 * 60));
        }
      });

      const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

      return {
        avgWait: avg(times.waitTimes),
        avgPrep: avg(times.prepTimes),
        avgReady: avg(times.readyTimes),
        avgDelivery: avg(times.deliveryTimes),
        avgTotal: avg(times.totalTimes),
        bottleneck: (() => {
          const avgs = [
            { name: 'Espera', value: avg(times.waitTimes) },
            { name: 'Preparo', value: avg(times.prepTimes) },
            { name: 'Aguardando saída', value: avg(times.readyTimes) },
            { name: 'Entrega', value: avg(times.deliveryTimes) },
          ];
          return avgs.reduce((max, curr) => curr.value > max.value ? curr : max, avgs[0]);
        })(),
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  // Top products
  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['bi-products', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { byQuantity: [], byRevenue: [] };

      const { data: items, error } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          unit_price,
          order:orders!inner(company_id, created_at, status)
        `)
        .eq('order.company_id', company.id)
        .neq('order.status', 'cancelado')
        .gte('order.created_at', startOfDay(filters.startDate).toISOString())
        .lte('order.created_at', endOfDay(filters.endDate).toISOString());

      if (error) throw error;

      const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

      items?.forEach((item: any) => {
        const name = item.product_name;
        if (!productMap[name]) {
          productMap[name] = { name, quantity: 0, revenue: 0 };
        }
        productMap[name].quantity += item.quantity;
        productMap[name].revenue += item.quantity * item.unit_price;
      });

      const products = Object.values(productMap);

      return {
        byQuantity: [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 10),
        byRevenue: [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  // Financial summary
  const { data: financialData, isLoading: loadingFinancial } = useQuery({
    queryKey: ['bi-financial', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return null;

      // Get current cash session
      const { data: cashSession } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .maybeSingle();

      // Get accounts payable
      const { data: accountsPayable } = await supabase
        .from('accounts_payable')
        .select('amount_cents, paid_at')
        .eq('company_id', company.id);

      const pendingPayable = accountsPayable?.filter(a => !a.paid_at).reduce((sum, a) => sum + a.amount_cents, 0) || 0;
      const paidPayable = accountsPayable?.filter(a => a.paid_at).reduce((sum, a) => sum + a.amount_cents, 0) || 0;

      // Get customer credits (fiado)
      const { data: customers } = await supabase
        .from('customers')
        .select('credit_balance')
        .eq('company_id', company.id);

      const totalFiadoOpen = customers?.reduce((sum, c) => sum + (c.credit_balance || 0), 0) || 0;

      // Get credit transactions for period
      const { data: creditTransactions } = await supabase
        .from('customer_credit_transactions')
        .select('amount, transaction_type')
        .eq('company_id', company.id)
        .gte('created_at', startOfDay(filters.startDate).toISOString())
        .lte('created_at', endOfDay(filters.endDate).toISOString());

      const fiadoReceived = creditTransactions
        ?.filter(t => t.transaction_type === 'credit' || t.transaction_type === 'payment')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      return {
        cashOpen: !!cashSession,
        cashBalance: cashSession?.opening_balance || 0,
        pendingPayable: pendingPayable / 100,
        paidPayable: paidPayable / 100,
        totalFiadoOpen,
        fiadoReceived,
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  return {
    overviewStats,
    channelData,
    delivererStats,
    operationalTimes,
    topProducts,
    financialData,
    isLoading: loadingOverview || loadingChannel || loadingDeliverers || loadingTimes || loadingProducts || loadingFinancial,
  };
}
