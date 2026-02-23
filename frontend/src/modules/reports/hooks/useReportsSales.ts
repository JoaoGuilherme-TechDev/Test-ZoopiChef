import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface SalesReportFilters {
  startDate: string;
  endDate: string;
}

export interface ProductSalesData {
  product_id: string;
  product_name: string;
  category_name: string;
  subcategory_name: string;
  quantity_sold: number;
  total_revenue: number;
  avg_price: number;
}

export interface CancelledItemData {
  id: string;
  product_name: string;
  quantity: number;
  cancelled_at: string;
  reason: string;
  cancelled_by_name: string;
}

export interface SalesByHourData {
  hour: number;
  orders_count: number;
  total_revenue: number;
  avg_ticket: number;
}

export interface SalesByCategoryData {
  category_id: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  percentage: number;
}

export interface SalesBySubcategoryData {
  subcategory_id: string;
  subcategory_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  percentage: number;
}

export interface ProductWithoutSalesData {
  product_id: string;
  product_name: string;
  category_name: string;
  last_sale_date: string | null;
  days_without_sale: number;
}

export function useProductsSoldReport(filters: SalesReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-products-sold', company?.id, filters],
    queryFn: async (): Promise<ProductSalesData[]> => {
      if (!company?.id) return [];

      // Buscar pedidos entregues no período
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (!orders?.length) return [];

      const orderIds = orders.map((o) => o.id);

      // Buscar itens dos pedidos
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity, unit_price')
        .in('order_id', orderIds);

      // Buscar produtos com categorias
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          name,
          subcategory:subcategories(
            name,
            category:categories(name)
          )
        `)
        .eq('company_id', company.id);

      // Agregar por produto
      const productMap = new Map<string, ProductSalesData>();

      for (const item of orderItems || []) {
        const existing = productMap.get(item.product_id) || {
          product_id: item.product_id,
          product_name: item.product_name,
          category_name: '',
          subcategory_name: '',
          quantity_sold: 0,
          total_revenue: 0,
          avg_price: 0,
        };

        existing.quantity_sold += item.quantity || 0;
        existing.total_revenue += (item.unit_price || 0) * (item.quantity || 0);

        const product = products?.find((p) => p.id === item.product_id);
        if (product?.subcategory) {
          existing.subcategory_name = (product.subcategory as any)?.name || '';
          existing.category_name = (product.subcategory as any)?.category?.name || '';
        }

        productMap.set(item.product_id, existing);
      }

      // Calcular média
      const result = Array.from(productMap.values()).map((p) => ({
        ...p,
        avg_price: p.quantity_sold > 0 ? p.total_revenue / p.quantity_sold : 0,
      }));

      return result.sort((a, b) => b.quantity_sold - a.quantity_sold);
    },
    enabled: !!company?.id,
  });
}

export function useCancelledItemsReport(filters: SalesReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-cancelled-items', company?.id, filters],
    queryFn: async (): Promise<CancelledItemData[]> => {
      if (!company?.id) return [];

      // Buscar itens de comanda cancelados
      const { data: cancelledItems } = await (supabase as any)
        .from('comanda_items')
        .select(`
          id,
          product_name,
          quantity,
          cancelled_at,
          cancel_reason,
          cancelled_by_profile:cancelled_by(full_name)
        `)
        .eq('company_id', company.id)
        .not('cancelled_at', 'is', null)
        .gte('cancelled_at', `${filters.startDate}T00:00:00`)
        .lte('cancelled_at', `${filters.endDate}T23:59:59`)
        .order('cancelled_at', { ascending: false });

      return (cancelledItems || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        cancelled_at: item.cancelled_at,
        reason: item.cancel_reason || 'Não informado',
        cancelled_by_name: item.cancelled_by_profile?.full_name || 'Sistema',
      }));
    },
    enabled: !!company?.id,
  });
}

export function useSalesByHourReport(filters: SalesReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-sales-by-hour', company?.id, filters],
    queryFn: async (): Promise<SalesByHourData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      // Agregar por hora
      const hourMap = new Map<number, { count: number; total: number }>();

      for (let h = 0; h < 24; h++) {
        hourMap.set(h, { count: 0, total: 0 });
      }

      for (const order of orders || []) {
        const hour = new Date(order.created_at).getHours();
        const existing = hourMap.get(hour)!;
        existing.count += 1;
        existing.total += order.total || 0;
      }

      return Array.from(hourMap.entries()).map(([hour, data]) => ({
        hour,
        orders_count: data.count,
        total_revenue: data.total,
        avg_ticket: data.count > 0 ? data.total / data.count : 0,
      }));
    },
    enabled: !!company?.id,
  });
}

export function useSalesByCategoryReport(filters: SalesReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-sales-by-category', company?.id, filters],
    queryFn: async (): Promise<SalesByCategoryData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (!orders?.length) return [];

      const orderIds = orders.map((o) => o.id);

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          subcategory:subcategories(
            category:categories(id, name)
          )
        `)
        .eq('company_id', company.id);

      const categoryMap = new Map<string, { name: string; qty: number; revenue: number }>();

      for (const item of orderItems || []) {
        const product = products?.find((p) => p.id === item.product_id);
        const category = (product?.subcategory as any)?.category;
        if (!category) continue;

        const existing = categoryMap.get(category.id) || {
          name: category.name,
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity || 0;
        existing.revenue += (item.unit_price || 0) * (item.quantity || 0);
        categoryMap.set(category.id, existing);
      }

      const totalRevenue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0);

      return Array.from(categoryMap.entries())
        .map(([id, data]) => ({
          category_id: id,
          category_name: data.name,
          quantity_sold: data.qty,
          total_revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useSalesBySubcategoryReport(filters: SalesReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-sales-by-subcategory', company?.id, filters],
    queryFn: async (): Promise<SalesBySubcategoryData[]> => {
      if (!company?.id) return [];

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`);

      if (!orders?.length) return [];

      const orderIds = orders.map((o) => o.id);

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          subcategory:subcategories(
            id,
            name,
            category:categories(name)
          )
        `)
        .eq('company_id', company.id);

      const subcategoryMap = new Map<string, { name: string; categoryName: string; qty: number; revenue: number }>();

      for (const item of orderItems || []) {
        const product = products?.find((p) => p.id === item.product_id);
        const subcategory = product?.subcategory as any;
        if (!subcategory) continue;

        const existing = subcategoryMap.get(subcategory.id) || {
          name: subcategory.name,
          categoryName: subcategory.category?.name || '',
          qty: 0,
          revenue: 0,
        };
        existing.qty += item.quantity || 0;
        existing.revenue += (item.unit_price || 0) * (item.quantity || 0);
        subcategoryMap.set(subcategory.id, existing);
      }

      const totalRevenue = Array.from(subcategoryMap.values()).reduce((sum, s) => sum + s.revenue, 0);

      return Array.from(subcategoryMap.entries())
        .map(([id, data]) => ({
          subcategory_id: id,
          subcategory_name: data.name,
          category_name: data.categoryName,
          quantity_sold: data.qty,
          total_revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);
    },
    enabled: !!company?.id,
  });
}

export function useProductsWithoutSalesReport(daysThreshold: number = 30) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['reports-products-without-sales', company?.id, daysThreshold],
    queryFn: async (): Promise<ProductWithoutSalesData[]> => {
      if (!company?.id) return [];

      // Buscar todos os produtos ativos
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          name,
          subcategory:subcategories(
            category:categories(name)
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true);

      // Buscar última venda de cada produto
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const { data: recentItems } = await (supabase as any)
        .from('order_items')
        .select('product_id, created_at')
        .eq('company_id', company.id)
        .gte('created_at', thresholdDate.toISOString());

      const recentProductIds = new Set((recentItems || []).map((i) => i.product_id));

      // Buscar última venda para produtos sem vendas recentes
      const result: ProductWithoutSalesData[] = [];

      for (const product of products || []) {
        if (recentProductIds.has(product.id)) continue;

        // Buscar última venda
        const { data: lastSale } = await (supabase as any)
          .from('order_items')
          .select('created_at')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastSaleDate = lastSale?.created_at || null;
        const daysWithoutSale = lastSaleDate
          ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        result.push({
          product_id: product.id,
          product_name: product.name,
          category_name: (product.subcategory as any)?.category?.name || '',
          last_sale_date: lastSaleDate,
          days_without_sale: daysWithoutSale,
        });
      }

      return result.sort((a, b) => b.days_without_sale - a.days_without_sale);
    },
    enabled: !!company?.id,
  });
}
