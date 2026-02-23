import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ERPOrderCogs, ERPCMVReport } from '../types';

export function useERPCOGS() {
  const { data: company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cogsQuery = useQuery({
    queryKey: ['erp-order-cogs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_order_cogs')
        .select('*')
        .eq('company_id', company.id)
        .order('computed_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as ERPOrderCogs[];
    },
    enabled: !!company?.id,
  });

  // Compute COGS for a single order
  const computeOrderCOGS = useMutation({
    mutationFn: async (orderId: string) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get order items (READ ONLY from orders/order_items)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, product_name')
        .eq('order_id', orderId);
      if (itemsError) throw itemsError;

      // Get product mappings
      const { data: mappings } = await (supabase as any)
        .from('erp_product_map')
        .select('product_id, erp_item_id')
        .eq('company_id', company.id);

      // Get active recipes
      const { data: recipes } = await (supabase as any)
        .from('erp_recipes')
        .select(`
          sale_item_id,
          yield_qty,
          lines:erp_recipe_lines(
            component_item_id,
            qty,
            waste_percent
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true);

      // Get all ERP items for costs
      const { data: erpItems } = await (supabase as any)
        .from('erp_items')
        .select('id, avg_cost, current_stock')
        .eq('company_id', company.id);

      let totalCOGS = 0;
      const details: any[] = [];

      for (const orderItem of orderItems || []) {
        const mapping = mappings?.find((m: any) => m.product_id === orderItem.product_id);
        if (!mapping) {
          details.push({
            product_id: orderItem.product_id,
            product_name: orderItem.product_name,
            quantity: orderItem.quantity,
            cogs: 0,
            reason: 'no_mapping',
          });
          continue;
        }

        const recipe = recipes?.find((r: any) => r.sale_item_id === mapping.erp_item_id);
        if (!recipe) {
          // No recipe - check if item has direct cost
          const directItem = erpItems?.find((i: any) => i.id === mapping.erp_item_id);
          const directCost = directItem?.avg_cost || 0;
          const lineCogs = directCost * orderItem.quantity;
          totalCOGS += lineCogs;
          details.push({
            product_id: orderItem.product_id,
            product_name: orderItem.product_name,
            quantity: orderItem.quantity,
            cogs: lineCogs,
            reason: 'direct_cost',
          });
          continue;
        }

        // Calculate COGS from recipe
        let recipeCost = 0;
        for (const line of recipe.lines || []) {
          const component = erpItems?.find((i: any) => i.id === line.component_item_id);
          const componentCost = component?.avg_cost || 0;
          const wasteFactor = 1 + (line.waste_percent || 0) / 100;
          recipeCost += line.qty * componentCost * wasteFactor;
        }
        const costPerUnit = recipeCost / (recipe.yield_qty || 1);
        const lineCogs = costPerUnit * orderItem.quantity;
        totalCOGS += lineCogs;
        details.push({
          product_id: orderItem.product_id,
          product_name: orderItem.product_name,
          quantity: orderItem.quantity,
          unit_cost: costPerUnit,
          cogs: lineCogs,
          reason: 'recipe',
        });
      }

      // Upsert COGS record
      const { error: cogsError } = await (supabase as any)
        .from('erp_order_cogs')
        .upsert({
          company_id: company.id,
          order_id: orderId,
          cogs_total: totalCOGS,
          computed_at: new Date().toISOString(),
          compute_source: 'manual',
          details_json: details,
        }, {
          onConflict: 'company_id,order_id',
        });
      if (cogsError) throw cogsError;

      return { orderId, totalCOGS, details };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-order-cogs'] });
      toast.success(`CMV calculado: R$ ${data.totalCOGS.toFixed(2)}`);
    },
    onError: (error: any) => {
      toast.error('Erro ao calcular CMV: ' + error.message);
    },
  });

  // Compute COGS for period (batch)
  const computePeriodCOGS = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get delivered orders in period (READ ONLY)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      if (ordersError) throw ordersError;

      let processed = 0;
      for (const order of orders || []) {
        try {
          await computeOrderCOGS.mutateAsync(order.id);
          processed++;
        } catch (e) {
          console.error('Error computing COGS for order', order.id, e);
        }
      }

      return { processed, total: orders?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['erp-order-cogs'] });
      toast.success(`CMV recalculado para ${data.processed}/${data.total} pedidos`);
    },
    onError: (error: any) => {
      toast.error('Erro ao recalcular CMV: ' + error.message);
    },
  });

  // Get CMV report for period
  const getCMVReport = async (startDate: string, endDate: string): Promise<ERPCMVReport> => {
    if (!company?.id) throw new Error('Empresa não selecionada');

    // Get orders with COGS in period
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, created_at')
      .eq('company_id', company.id)
      .eq('status', 'entregue')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');
    if (ordersError) throw ordersError;

    const orderIds = (orders || []).map(o => o.id);
    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total || 0), 0);

    // Get COGS for these orders
    const { data: cogsData } = await (supabase as any)
      .from('erp_order_cogs')
      .select('order_id, cogs_total, details_json')
      .eq('company_id', company.id)
      .in('order_id', orderIds);

    const totalCogs = (cogsData || []).reduce((sum: number, c: any) => sum + (c.cogs_total || 0), 0);
    const grossMargin = totalRevenue - totalCogs;
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    // Aggregate by product
    const productMap = new Map<string, { name: string; qty: number; revenue: number; cogs: number }>();
    for (const cog of cogsData || []) {
      const details = cog.details_json || [];
      for (const d of details) {
        const existing = productMap.get(d.product_id) || {
          name: d.product_name,
          qty: 0,
          revenue: 0,
          cogs: 0,
        };
        existing.qty += d.quantity || 0;
        existing.cogs += d.cogs || 0;
        productMap.set(d.product_id, existing);
      }
    }

    // Get revenues per product from order_items
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price')
      .in('order_id', orderIds);
    for (const item of orderItems || []) {
      const existing = productMap.get(item.product_id);
      if (existing) {
        const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
        existing.revenue += itemTotal;
      }
    }

    const byProduct = Array.from(productMap.entries()).map(([productId, data]) => ({
      product_id: productId,
      product_name: data.name,
      qty_sold: data.qty,
      revenue: data.revenue,
      cogs: data.cogs,
      margin: data.revenue - data.cogs,
      margin_percent: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
    }));

    return {
      period_start: startDate,
      period_end: endDate,
      total_revenue: totalRevenue,
      total_cogs: totalCogs,
      gross_margin: grossMargin,
      gross_margin_percent: grossMarginPercent,
      by_product: byProduct.sort((a, b) => b.cogs - a.cogs),
    };
  };

  return {
    cogs: cogsQuery.data || [],
    isLoading: cogsQuery.isLoading,
    computeOrderCOGS,
    computePeriodCOGS,
    getCMVReport,
  };
}
