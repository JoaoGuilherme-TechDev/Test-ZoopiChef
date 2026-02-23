import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

interface DateFilters {
  startDate: string;
  endDate: string;
}

// Vendas de Produto por Operador
export interface ProductByOperatorData {
  employee_id: string;
  employee_name: string;
  product_id: string;
  product_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
}

// Vendas de Categoria por Operador
export interface CategoryByOperatorData {
  employee_id: string;
  employee_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  percentage: number;
}

// Análise por Mesa
export interface SalesByTableData {
  table_number: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  avg_time_minutes: number;
  total_guests: number;
}

// Ticket Médio por Pessoa
export interface TicketMedioData {
  table_number: number;
  opened_at: string;
  closed_at: string;
  total_amount: number;
  people_count: number;
  ticket_por_pessoa: number;
  tempo_permanencia_min: number;
}

// Análise por Setor - Produto
export interface SalesBySectorProductData {
  sector_name: string;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

// Análise por Setor - Categoria
export interface SalesBySectorCategoryData {
  sector_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  percentage: number;
}

export function useProductByOperatorReport(filters: DateFilters, productId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-product-by-operator', company?.id, filters, productId],
    queryFn: async (): Promise<ProductByOperatorData[]> => {
      if (!company?.id) return [];

      // Buscar pedidos com operador através de cash_session
      const { data: orders } = await supabase
        .from('orders')
        .select('id, cash_session_id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      // Buscar sessões de caixa com operador
      const sessionIds = [...new Set(orders.map(o => o.cash_session_id).filter(Boolean))];
      
      const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('id, opened_by')
        .in('id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar nomes dos operadores
      const operatorIds = [...new Set((sessions || []).map(s => s.opened_by).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', operatorIds.length > 0 ? operatorIds : ['00000000-0000-0000-0000-000000000000']);

      const orderIds = orders.map(o => o.id);

      let itemsQuery = supabase
        .from('order_items')
        .select('order_id, product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      if (productId) {
        itemsQuery = itemsQuery.eq('product_id', productId);
      }

      const { data: items } = await itemsQuery;

      const { data: products } = await supabase
        .from('products')
        .select(`id, subcategory:subcategories(category:categories(name))`)
        .eq('company_id', company.id);

      const operatorProductMap: Record<string, ProductByOperatorData> = {};

      (items || []).forEach(item => {
        const order = orders.find(o => o.id === item.order_id);
        const session = sessions?.find(s => s.id === order?.cash_session_id);
        if (!session?.opened_by) return;

        const key = `${session.opened_by}-${item.product_id}`;
        const product = products?.find(p => p.id === item.product_id);
        const categoryName = (product?.subcategory as any)?.category?.name || 'Sem Categoria';
        const profile = profiles?.find(p => p.id === session.opened_by);

        if (!operatorProductMap[key]) {
          operatorProductMap[key] = {
            employee_id: session.opened_by,
            employee_name: profile?.full_name || 'Operador',
            product_id: item.product_id,
            product_name: item.product_name,
            category_name: categoryName,
            quantity_sold: 0,
            total_revenue: 0,
          };
        }

        operatorProductMap[key].quantity_sold += item.quantity || 0;
        operatorProductMap[key].total_revenue += (item.unit_price || 0) * (item.quantity || 0);
      });

      return Object.values(operatorProductMap).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useCategoryByOperatorReport(filters: DateFilters, categoryId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-category-by-operator', company?.id, filters, categoryId],
    queryFn: async (): Promise<CategoryByOperatorData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id, cash_session_id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const sessionIds = [...new Set(orders.map(o => o.cash_session_id).filter(Boolean))];
      
      const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('id, opened_by')
        .in('id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      const operatorIds = [...new Set((sessions || []).map(s => s.opened_by).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', operatorIds.length > 0 ? operatorIds : ['00000000-0000-0000-0000-000000000000']);

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select(`id, subcategory:subcategories(category:categories(id, name))`)
        .eq('company_id', company.id);

      const operatorCategoryMap: Record<string, CategoryByOperatorData> = {};

      (items || []).forEach(item => {
        const order = orders.find(o => o.id === item.order_id);
        const session = sessions?.find(s => s.id === order?.cash_session_id);
        if (!session?.opened_by) return;

        const product = products?.find(p => p.id === item.product_id);
        const category = (product?.subcategory as any)?.category;
        if (!category) return;
        if (categoryId && category.id !== categoryId) return;

        const key = `${session.opened_by}-${category.id}`;
        const profile = profiles?.find(p => p.id === session.opened_by);

        if (!operatorCategoryMap[key]) {
          operatorCategoryMap[key] = {
            employee_id: session.opened_by,
            employee_name: profile?.full_name || 'Operador',
            category_name: category.name,
            quantity_sold: 0,
            total_revenue: 0,
            percentage: 0,
          };
        }

        operatorCategoryMap[key].quantity_sold += item.quantity || 0;
        operatorCategoryMap[key].total_revenue += (item.unit_price || 0) * (item.quantity || 0);
      });

      const totalRevenue = Object.values(operatorCategoryMap).reduce((sum, w) => sum + w.total_revenue, 0);

      return Object.values(operatorCategoryMap).map(w => ({
        ...w,
        percentage: totalRevenue > 0 ? (w.total_revenue / totalRevenue) * 100 : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useSalesByTableReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sales-by-table', company?.id, filters],
    queryFn: async (): Promise<SalesByTableData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id, table_number, total, created_at, ready_at')
        .eq('company_id', company.id)
        .eq('order_type', 'table')
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      const tableMap: Record<string, SalesByTableData> = {};

      (orders || []).forEach(order => {
        const tableNumber = order.table_number || 'Sem Mesa';
        
        if (!tableMap[tableNumber]) {
          tableMap[tableNumber] = {
            table_number: tableNumber,
            total_orders: 0,
            total_revenue: 0,
            avg_ticket: 0,
            avg_time_minutes: 0,
            total_guests: 0,
          };
        }

        tableMap[tableNumber].total_orders += 1;
        tableMap[tableNumber].total_revenue += Number(order.total || 0);
      });

      return Object.values(tableMap).map(t => ({
        ...t,
        avg_ticket: t.total_orders > 0 ? t.total_revenue / t.total_orders : 0,
      })).sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useSalesBySectorProductReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sector-product', company?.id, filters],
    queryFn: async (): Promise<SalesBySectorProductData[]> => {
      if (!company?.id) return [];

      const { data: sectors } = await supabase
        .from('print_sectors')
        .select('id, name')
        .eq('company_id', company.id);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select('id, print_sector_id')
        .eq('company_id', company.id);

      const sectorProductMap: Record<string, SalesBySectorProductData> = {};

      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        const sector = sectors?.find(s => s.id === product?.print_sector_id);
        const sectorName = sector?.name || 'Sem Setor';

        const key = `${sectorName}-${item.product_id}`;

        if (!sectorProductMap[key]) {
          sectorProductMap[key] = {
            sector_name: sectorName,
            product_name: item.product_name,
            quantity_sold: 0,
            total_revenue: 0,
          };
        }

        sectorProductMap[key].quantity_sold += item.quantity || 0;
        sectorProductMap[key].total_revenue += (item.unit_price || 0) * (item.quantity || 0);
      });

      return Object.values(sectorProductMap).sort((a, b) => {
        if (a.sector_name !== b.sector_name) return a.sector_name.localeCompare(b.sector_name);
        return b.total_revenue - a.total_revenue;
      });
    },
    enabled: !!company?.id,
  });
}

export function useSalesBySectorCategoryReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sector-category', company?.id, filters],
    queryFn: async (): Promise<SalesBySectorCategoryData[]> => {
      if (!company?.id) return [];

      const { data: sectors } = await supabase
        .from('print_sectors')
        .select('id, name')
        .eq('company_id', company.id);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return [];

      const orderIds = orders.map(o => o.id);

      const { data: items } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select(`id, print_sector_id, subcategory:subcategories(category:categories(name))`)
        .eq('company_id', company.id);

      const sectorCategoryMap: Record<string, SalesBySectorCategoryData> = {};

      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        const sector = sectors?.find(s => s.id === product?.print_sector_id);
        const sectorName = sector?.name || 'Sem Setor';
        const categoryName = (product?.subcategory as any)?.category?.name || 'Sem Categoria';

        const key = `${sectorName}-${categoryName}`;

        if (!sectorCategoryMap[key]) {
          sectorCategoryMap[key] = {
            sector_name: sectorName,
            category_name: categoryName,
            quantity_sold: 0,
            total_revenue: 0,
            percentage: 0,
          };
        }

        sectorCategoryMap[key].quantity_sold += item.quantity || 0;
        sectorCategoryMap[key].total_revenue += (item.unit_price || 0) * (item.quantity || 0);
      });

      const totalRevenue = Object.values(sectorCategoryMap).reduce((sum, s) => sum + s.total_revenue, 0);

      return Object.values(sectorCategoryMap).map(s => ({
        ...s,
        percentage: totalRevenue > 0 ? (s.total_revenue / totalRevenue) * 100 : 0,
      })).sort((a, b) => {
        if (a.sector_name !== b.sector_name) return a.sector_name.localeCompare(b.sector_name);
        return b.total_revenue - a.total_revenue;
      });
    },
    enabled: !!company?.id,
  });
}

// Relatório de Ticket Médio por Pessoa
export function useTicketMedioReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-ticket-medio', company?.id, filters],
    queryFn: async (): Promise<{
      details: TicketMedioData[];
      summary: {
        total_sessions: number;
        total_pessoas: number;
        total_faturamento: number;
        ticket_medio_geral: number;
        ticket_medio_por_pessoa: number;
        media_pessoas_por_mesa: number;
        media_tempo_permanencia_min: number;
      };
    }> => {
      if (!company?.id) return { 
        details: [], 
        summary: { 
          total_sessions: 0, 
          total_pessoas: 0, 
          total_faturamento: 0, 
          ticket_medio_geral: 0, 
          ticket_medio_por_pessoa: 0, 
          media_pessoas_por_mesa: 0, 
          media_tempo_permanencia_min: 0 
        } 
      };

      // Buscar sessões fechadas com people_count
      const { data: sessions } = await supabase
        .from('table_sessions')
        .select('id, table_id, opened_at, closed_at, total_amount_cents, people_count, table:tables(number)')
        .eq('company_id', company.id)
        .eq('status', 'closed')
        .gte('closed_at', filters.startDate)
        .lte('closed_at', `${filters.endDate}T23:59:59`)
        .gt('people_count', 0)
        .order('closed_at', { ascending: false });

      const details: TicketMedioData[] = (sessions || []).map(session => {
        const openedAt = new Date(session.opened_at);
        const closedAt = new Date(session.closed_at || session.opened_at);
        const tempoMin = Math.round((closedAt.getTime() - openedAt.getTime()) / 60000);
        const tableNumber = (session.table as any)?.number || 0;
        const totalAmount = session.total_amount_cents / 100;
        const peopleCount = session.people_count || 1;

        return {
          table_number: tableNumber,
          opened_at: session.opened_at,
          closed_at: session.closed_at || '',
          total_amount: totalAmount,
          people_count: peopleCount,
          ticket_por_pessoa: totalAmount / peopleCount,
          tempo_permanencia_min: tempoMin,
        };
      });

      // Calcular sumário
      const totalSessions = details.length;
      const totalPessoas = details.reduce((sum, d) => sum + d.people_count, 0);
      const totalFaturamento = details.reduce((sum, d) => sum + d.total_amount, 0);
      const totalTempoMin = details.reduce((sum, d) => sum + d.tempo_permanencia_min, 0);

      return {
        details,
        summary: {
          total_sessions: totalSessions,
          total_pessoas: totalPessoas,
          total_faturamento: totalFaturamento,
          ticket_medio_geral: totalSessions > 0 ? totalFaturamento / totalSessions : 0,
          ticket_medio_por_pessoa: totalPessoas > 0 ? totalFaturamento / totalPessoas : 0,
          media_pessoas_por_mesa: totalSessions > 0 ? totalPessoas / totalSessions : 0,
          media_tempo_permanencia_min: totalSessions > 0 ? totalTempoMin / totalSessions : 0,
        }
      };
    },
    enabled: !!company?.id,
  });
}

// Relatório de Vendas por Garçom/Vendedor (usando cash_session.opened_by)
export interface SalesByWaiterData {
  waiter_id: string;
  waiter_name: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  total_items: number;
  total_tables: number;
}

export function useSalesByWaiterReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-sales-by-waiter', company?.id, filters],
    queryFn: async (): Promise<{
      details: SalesByWaiterData[];
      summary: {
        total_waiters: number;
        total_revenue: number;
        total_orders: number;
        avg_per_waiter: number;
      };
    }> => {
      if (!company?.id) return { 
        details: [], 
        summary: { total_waiters: 0, total_revenue: 0, total_orders: 0, avg_per_waiter: 0 } 
      };

      // Buscar pedidos
      const { data: orders } = await supabase
        .from('orders')
        .select('id, cash_session_id, total, table_number')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      if (!orders?.length) return { 
        details: [], 
        summary: { total_waiters: 0, total_revenue: 0, total_orders: 0, avg_per_waiter: 0 } 
      };

      // Buscar sessões de caixa com operador
      const sessionIds = [...new Set(orders.map(o => o.cash_session_id).filter(Boolean))];
      const { data: sessions } = await supabase
        .from('cash_sessions')
        .select('id, opened_by')
        .in('id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar nomes dos operadores
      const operatorIds = [...new Set((sessions || []).map(s => s.opened_by).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', operatorIds.length > 0 ? operatorIds : ['00000000-0000-0000-0000-000000000000']);

      // Buscar itens dos pedidos
      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, quantity')
        .in('order_id', orderIds);

      const waiterMap: Record<string, SalesByWaiterData> = {};

      orders.forEach(order => {
        const session = sessions?.find(s => s.id === order.cash_session_id);
        const waiterId = session?.opened_by || 'unknown';
        const profile = profiles?.find(p => p.id === waiterId);
        
        if (!waiterMap[waiterId]) {
          waiterMap[waiterId] = {
            waiter_id: waiterId,
            waiter_name: profile?.full_name || 'Sem Operador',
            total_orders: 0,
            total_revenue: 0,
            avg_ticket: 0,
            total_items: 0,
            total_tables: 0,
          };
        }

        waiterMap[waiterId].total_orders += 1;
        waiterMap[waiterId].total_revenue += Number(order.total || 0);
        
        // Contar itens do pedido
        const orderItems = items?.filter(i => i.order_id === order.id) || [];
        waiterMap[waiterId].total_items += orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
      });

      // Calcular mesas únicas por garçom
      Object.keys(waiterMap).forEach(waiterId => {
        const waiterOrders = orders.filter(o => {
          const session = sessions?.find(s => s.id === o.cash_session_id);
          return (session?.opened_by || 'unknown') === waiterId;
        });
        const uniqueTables = new Set(waiterOrders.map(o => o.table_number).filter(Boolean));
        waiterMap[waiterId].total_tables = uniqueTables.size;
        waiterMap[waiterId].avg_ticket = waiterMap[waiterId].total_orders > 0 
          ? waiterMap[waiterId].total_revenue / waiterMap[waiterId].total_orders 
          : 0;
      });

      const details = Object.values(waiterMap)
        .filter(w => w.waiter_id !== 'unknown' || w.total_orders > 0)
        .sort((a, b) => b.total_revenue - a.total_revenue);

      const totalRevenue = details.reduce((sum, d) => sum + d.total_revenue, 0);
      const totalOrders = details.reduce((sum, d) => sum + d.total_orders, 0);

      return {
        details,
        summary: {
          total_waiters: details.length,
          total_revenue: totalRevenue,
          total_orders: totalOrders,
          avg_per_waiter: details.length > 0 ? totalRevenue / details.length : 0,
        },
      };
    },
    enabled: !!company?.id,
  });
}

// Relatório de Lucro por Produto
export interface ProductProfitData {
  product_id: string;
  product_name: string;
  category_name: string;
  quantity_sold: number;
  sale_price: number;
  unit_cost: number;
  total_revenue: number;
  total_cost: number;
  tax_estimate: number;
  gross_profit: number;
  net_profit: number;
  margin_percent: number;
  current_stock: number;
  stock_value: number;
}

export function useProductProfitReport(filters: DateFilters) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['report-product-profit', company?.id, filters],
    queryFn: async (): Promise<{
      details: ProductProfitData[];
      summary: {
        total_revenue: number;
        total_cost: number;
        total_tax: number;
        gross_profit: number;
        net_profit: number;
        avg_margin: number;
        total_stock_value: number;
      };
    }> => {
      if (!company?.id) return { 
        details: [], 
        summary: { 
          total_revenue: 0, total_cost: 0, total_tax: 0, 
          gross_profit: 0, net_profit: 0, avg_margin: 0, total_stock_value: 0 
        } 
      };

      // Buscar pedidos finalizados
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', filters.startDate)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .in('status', ['entregue', 'pronto']);

      // Buscar itens dos pedidos
      const orderIds = (orders || []).map(o => o.id);
      const { data: items } = orderIds.length > 0 
        ? await supabase
            .from('order_items')
            .select('product_id, product_name, quantity, unit_price')
            .in('order_id', orderIds)
        : { data: [] };

      // Buscar produtos com categoria
      const { data: products } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          subcategory:subcategories(category:categories(name))
        `)
        .eq('company_id', company.id);

      const productMap: Record<string, ProductProfitData> = {};

      // Agregar vendas
      (items || []).forEach(item => {
        const product = products?.find(p => p.id === item.product_id);
        const categoryName = (product?.subcategory as any)?.category?.name || 'Sem Categoria';
        
        // Assumir 30% do preço como custo estimado (sem ficha técnica disponível na query)
        const salePrice = item.unit_price || product?.price || 0;
        const unitCost = salePrice * 0.30;

        if (!productMap[item.product_id]) {
          productMap[item.product_id] = {
            product_id: item.product_id,
            product_name: item.product_name || product?.name || 'Produto',
            category_name: categoryName,
            quantity_sold: 0,
            sale_price: salePrice,
            unit_cost: unitCost,
            total_revenue: 0,
            total_cost: 0,
            tax_estimate: 0,
            gross_profit: 0,
            net_profit: 0,
            margin_percent: 0,
            current_stock: 0,
            stock_value: 0,
          };
        }

        productMap[item.product_id].quantity_sold += item.quantity || 0;
        productMap[item.product_id].total_revenue += (item.unit_price || 0) * (item.quantity || 0);
        productMap[item.product_id].total_cost += unitCost * (item.quantity || 0);
      });

      // Calcular lucros e margens
      Object.values(productMap).forEach(product => {
        // Estimativa de imposto: ~15% sobre receita (simplificado - Simples Nacional)
        product.tax_estimate = product.total_revenue * 0.15;
        product.gross_profit = product.total_revenue - product.total_cost;
        product.net_profit = product.gross_profit - product.tax_estimate;
        product.margin_percent = product.total_revenue > 0 
          ? (product.net_profit / product.total_revenue) * 100 
          : 0;
      });

      const details = Object.values(productMap).sort((a, b) => b.net_profit - a.net_profit);

      const totalRevenue = details.reduce((sum, d) => sum + d.total_revenue, 0);
      const totalCost = details.reduce((sum, d) => sum + d.total_cost, 0);
      const totalTax = details.reduce((sum, d) => sum + d.tax_estimate, 0);
      const grossProfit = details.reduce((sum, d) => sum + d.gross_profit, 0);
      const netProfit = details.reduce((sum, d) => sum + d.net_profit, 0);
      const totalStockValue = details.reduce((sum, d) => sum + d.stock_value, 0);

      return {
        details,
        summary: {
          total_revenue: totalRevenue,
          total_cost: totalCost,
          total_tax: totalTax,
          gross_profit: grossProfit,
          net_profit: netProfit,
          avg_margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          total_stock_value: totalStockValue,
        },
      };
    },
    enabled: !!company?.id,
  });
}
