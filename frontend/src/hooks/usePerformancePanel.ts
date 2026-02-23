import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { startOfDay, endOfDay } from 'date-fns';

export interface PerformancePanelFilters {
  startDate: Date;
  endDate: Date;
}

export function usePerformancePanel(filters: PerformancePanelFilters) {
  const { data: company } = useCompany();

  // Main stats
  const { data: mainStats, isLoading: loadingMain } = useQuery({
    queryKey: ['performance-main', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return null;
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('total, status')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      const totalOrders = validOrders.length;
      const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      const { data: newCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      return {
        totalOrders,
        totalRevenue,
        avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        newCustomers: newCustomers?.length || 0,
      };
    },
    enabled: !!company?.id,
  });

  // Delivery modality
  const { data: deliveryModality, isLoading: loadingModality } = useQuery({
    queryKey: ['performance-modality', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topModality: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('order_type, total, delivery_fee, status')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      const modalityMap: Record<string, { name: string; value: number; count: number }> = {
        'sem_frete': { name: 'Sem frete', value: 0, count: 0 },
        'retirada': { name: 'Retirada na Loja', value: 0, count: 0 },
        'delivery': { name: 'Delivery', value: 0, count: 0 },
      };

      validOrders.forEach(order => {
        const type = order.order_type?.toLowerCase() || '';
        if (['retirada', 'balcao', 'mesa'].includes(type)) {
          modalityMap['retirada'].value += order.total || 0;
          modalityMap['retirada'].count += 1;
        } else if ((order.delivery_fee || 0) === 0) {
          modalityMap['sem_frete'].value += order.total || 0;
          modalityMap['sem_frete'].count += 1;
        } else {
          modalityMap['delivery'].value += order.total || 0;
          modalityMap['delivery'].count += 1;
        }
      });

      const total = Object.values(modalityMap).reduce((sum, c) => sum + c.value, 0);
      const top = Object.values(modalityMap).reduce((max, curr) => curr.value > max.value ? curr : max, { name: '', value: 0, count: 0 });

      return {
        data: Object.values(modalityMap).map(c => ({ ...c, percentage: total > 0 ? Number(((c.value / total) * 100).toFixed(1)) : 0 })),
        topModality: top.name,
        topValue: top.value,
      };
    },
    enabled: !!company?.id,
  });

  // Sales by channel
  const { data: channelSales, isLoading: loadingChannel } = useQuery({
    queryKey: ['performance-channel', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topChannel: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('order_type, total, status')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      const channelLabels: Record<string, string> = { delivery: 'Delivery', balcao: 'Balcão', mesa: 'Mesa', totem: 'Totem', whatsapp: 'WhatsApp', telefone: 'Telefone', online: 'Online', retirada: 'Retirada' };
      const channelMap: Record<string, { name: string; value: number; count: number }> = {};

      validOrders.forEach(order => {
        const type = order.order_type?.toLowerCase() || 'outros';
        const label = channelLabels[type] || type || 'Outros';
        if (!channelMap[label]) channelMap[label] = { name: label, value: 0, count: 0 };
        channelMap[label].value += order.total || 0;
        channelMap[label].count += 1;
      });

      const total = Object.values(channelMap).reduce((sum, c) => sum + c.value, 0);
      const top = Object.values(channelMap).reduce((max, curr) => curr.value > max.value ? curr : max, { name: '', value: 0, count: 0 });

      return {
        data: Object.values(channelMap).map(c => ({ ...c, percentage: total > 0 ? Number(((c.value / total) * 100).toFixed(1)) : 0 })),
        topChannel: top.name,
        topValue: top.value,
      };
    },
    enabled: !!company?.id,
  });

  // Top neighborhoods - using delivery_address_id or destination_address
  const { data: topNeighborhoods, isLoading: loadingNeighborhoods } = useQuery({
    queryKey: ['performance-neighborhoods', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topNeighborhood: 'N/A', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      // First, get orders with their address info
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status, delivery_address_id, destination_address, customer_id')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      
      // Get unique customer_ids for address lookup
      const customerIds = [...new Set(validOrders.map(o => o.customer_id).filter(Boolean))];
      
      // Fetch customer addresses
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('customer_id, neighborhood, city')
        .in('customer_id', customerIds.length > 0 ? customerIds : ['00000000-0000-0000-0000-000000000000']);

      const addressMap = new Map<string, { neighborhood: string; city: string }>();
      (addresses || []).forEach(addr => {
        if (!addressMap.has(addr.customer_id)) {
          addressMap.set(addr.customer_id, { neighborhood: addr.neighborhood, city: addr.city });
        }
      });

      const neighborhoodMap: Record<string, { name: string; value: number; customerCount: number }> = {};

      validOrders.forEach(order => {
        // Try to get neighborhood from destination_address (jsonb) first
        let neighborhood = 'Não informado';
        
        const destAddr = order.destination_address as any;
        if (destAddr?.neighborhood) {
          neighborhood = destAddr.neighborhood;
        } else if (order.customer_id && addressMap.has(order.customer_id)) {
          neighborhood = addressMap.get(order.customer_id)!.neighborhood;
        }

        if (!neighborhoodMap[neighborhood]) {
          neighborhoodMap[neighborhood] = { name: neighborhood, value: 0, customerCount: 0 };
        }
        neighborhoodMap[neighborhood].value += order.total || 0;
        neighborhoodMap[neighborhood].customerCount += 1;
      });

      const data = Object.values(neighborhoodMap)
        .filter(n => n.name !== 'Não informado')
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      const top = data[0] || { name: 'N/A', value: 0 };
      return { data, topNeighborhood: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  // Top cities - using delivery_address_id or destination_address
  const { data: topCities, isLoading: loadingCities } = useQuery({
    queryKey: ['performance-cities', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topCity: 'N/A', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      // First, get orders with their address info
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status, delivery_address_id, destination_address, customer_id')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      
      // Get unique customer_ids for address lookup
      const customerIds = [...new Set(validOrders.map(o => o.customer_id).filter(Boolean))];
      
      // Fetch customer addresses
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('customer_id, neighborhood, city')
        .in('customer_id', customerIds.length > 0 ? customerIds : ['00000000-0000-0000-0000-000000000000']);

      const addressMap = new Map<string, { neighborhood: string; city: string }>();
      (addresses || []).forEach(addr => {
        if (!addressMap.has(addr.customer_id)) {
          addressMap.set(addr.customer_id, { neighborhood: addr.neighborhood, city: addr.city });
        }
      });

      const cityMap: Record<string, { name: string; value: number; customerCount: number }> = {};

      validOrders.forEach(order => {
        // Try to get city from destination_address (jsonb) first
        let city = 'Não informado';
        
        const destAddr = order.destination_address as any;
        if (destAddr?.city) {
          city = destAddr.city;
        } else if (order.customer_id && addressMap.has(order.customer_id)) {
          city = addressMap.get(order.customer_id)!.city;
        }

        if (!cityMap[city]) {
          cityMap[city] = { name: city, value: 0, customerCount: 0 };
        }
        cityMap[city].value += order.total || 0;
        cityMap[city].customerCount += 1;
      });

      const data = Object.values(cityMap)
        .filter(c => c.name !== 'Não informado')
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
      const top = data[0] || { name: 'N/A', value: 0 };
      return { data, topCity: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  // Payment methods
  const { data: paymentMethods, isLoading: loadingPayments } = useQuery({
    queryKey: ['performance-payments', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topPayment: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('payment_method, total, status')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      const paymentMap: Record<string, { name: string; value: number; count: number }> = {};

      validOrders.forEach(order => {
        const payment = order.payment_method || 'Não informado';
        if (!paymentMap[payment]) paymentMap[payment] = { name: payment, value: 0, count: 0 };
        paymentMap[payment].value += order.total || 0;
        paymentMap[payment].count += 1;
      });

      const data = Object.values(paymentMap).sort((a, b) => b.value - a.value);
      const top = data[0] || { name: '', value: 0 };
      return { data, topPayment: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  // Top customers
  const { data: topCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['performance-customers', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topCustomer: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: orders } = await supabase
        .from('orders')
        .select('customer_name, total, status')
        .eq('company_id', company.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      const validOrders = (orders || []).filter(o => (o.status as string) !== 'cancelado');
      const customerMap: Record<string, { name: string; value: number; count: number }> = {};

      validOrders.forEach(order => {
        const name = order.customer_name || 'Não identificado';
        if (!customerMap[name]) customerMap[name] = { name, value: 0, count: 0 };
        customerMap[name].value += order.total || 0;
        customerMap[name].count += 1;
      });

      const data = Object.values(customerMap).sort((a, b) => b.value - a.value).slice(0, 10);
      const top = data[0] || { name: '', value: 0 };
      return { data, topCustomer: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  // Top categories
  const { data: topCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ['performance-categories', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topCategory: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: items } = await (supabase
        .from('order_items') as any)
        .select('quantity, unit_price, product:products(category:categories(name)), order:orders!inner(company_id, created_at, status)')
        .eq('order.company_id', company.id)
        .gte('order.created_at', startIso)
        .lte('order.created_at', endIso);

      const validItems = (items as any[] || []).filter(i => (i.order?.status as string) !== 'cancelado');
      const categoryMap: Record<string, { name: string; value: number; count: number }> = {};

      validItems.forEach((item: any) => {
        const name = item.product?.category?.name || 'Sem categoria';
        if (!categoryMap[name]) categoryMap[name] = { name, value: 0, count: 0 };
        categoryMap[name].value += item.quantity * item.unit_price;
        categoryMap[name].count += item.quantity;
      });

      const data = Object.values(categoryMap).sort((a, b) => b.value - a.value).slice(0, 15);
      const top = data[0] || { name: '', value: 0 };
      return { data, topCategory: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  // Top products
  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['performance-products', company?.id, filters.startDate, filters.endDate],
    queryFn: async () => {
      if (!company?.id) return { data: [], topProduct: '', topValue: 0 };
      const startIso = startOfDay(filters.startDate).toISOString();
      const endIso = endOfDay(filters.endDate).toISOString();

      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price, order:orders!inner(company_id, created_at, status)')
        .eq('order.company_id', company.id)
        .gte('order.created_at', startIso)
        .lte('order.created_at', endIso);

      const validItems = (items as any[] || []).filter(i => (i.order?.status as string) !== 'cancelado');
      const productMap: Record<string, { name: string; value: number; count: number }> = {};

      validItems.forEach((item: any) => {
        const name = item.product_name;
        if (!productMap[name]) productMap[name] = { name, value: 0, count: 0 };
        productMap[name].value += item.quantity * item.unit_price;
        productMap[name].count += item.quantity;
      });

      const data = Object.values(productMap).sort((a, b) => b.value - a.value).slice(0, 15);
      const top = data[0] || { name: '', value: 0 };
      return { data, topProduct: top.name, topValue: top.value };
    },
    enabled: !!company?.id,
  });

  return {
    mainStats,
    deliveryModality,
    channelSales,
    topNeighborhoods,
    topCities,
    paymentMethods,
    topCustomers,
    topCategories,
    topProducts,
    isLoading: loadingMain || loadingModality || loadingChannel || loadingNeighborhoods || loadingCities || loadingPayments || loadingCustomers || loadingCategories || loadingProducts,
  };
}
