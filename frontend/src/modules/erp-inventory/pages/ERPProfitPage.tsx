import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { useERPCOGS } from '../hooks/useERPCOGS';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

export default function ERPProfitPage() {
  const { data: company } = useCompany();
  const { cogs } = useERPCOGS();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Fetch orders in period (READ ONLY)
  const ordersQuery = useQuery({
    queryKey: ['erp-profit-orders', company?.id, startDate, endDate],
    queryFn: async () => {
      if (!company?.id) return { orders: [], totals: { revenue: 0, deliveryFees: 0 } };

      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, status')
        .eq('company_id', company.id)
        .eq('status', 'entregue')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (error) throw error;

      const totals = (orders || []).reduce(
        (acc, order) => ({
          revenue: acc.revenue + (order.total || 0),
          deliveryFees: acc.deliveryFees + (order.delivery_fee || 0),
        }),
        { revenue: 0, deliveryFees: 0 }
      );

      return { orders: orders || [], totals };
    },
    enabled: !!company?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate COGS for the period
  const orderIds = ordersQuery.data?.orders.map((o) => o.id) || [];
  const periodCogs = cogs
    .filter((c) => orderIds.includes(c.order_id))
    .reduce((sum, c) => sum + (c.cogs_total || 0), 0);

  const { totals } = ordersQuery.data || { totals: { revenue: 0, deliveryFees: 0 } };
  const grossProfit = totals.revenue - periodCogs;
  const grossMarginPercent = totals.revenue > 0 ? (grossProfit / totals.revenue) * 100 : 0;
  
  // Net profit
  const netRevenue = totals.revenue;
  const netProfit = netRevenue - periodCogs;
  const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

  const isLoading = ordersQuery.isLoading;

  return (
    <ERPInventoryLayout title="Lucro Bruto">
      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Receita Bruta</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {ordersQuery.data?.orders.length || 0} pedidos entregues
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">CMV (Custo)</p>
              <p className="text-2xl font-bold text-red-600">-{formatCurrency(periodCogs)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Taxa de Entrega</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.deliveryFees)}</p>
            </Card>
          </div>

          {/* Profit Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Bruto</p>
                  <p className="text-xs text-muted-foreground">(Receita - CMV)</p>
                </div>
                {grossProfit >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
              <p className={`text-3xl font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(grossProfit)}
              </p>
              <p className={`text-lg ${grossMarginPercent >= 30 ? 'text-green-600' : grossMarginPercent >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                Margem: {formatPercent(grossMarginPercent)}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                  <p className="text-xs text-muted-foreground">(Receita - Descontos - CMV)</p>
                </div>
                {netProfit >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </p>
              <p className={`text-lg ${netMarginPercent >= 30 ? 'text-green-600' : netMarginPercent >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                Margem: {formatPercent(netMarginPercent)}
              </p>
            </Card>
          </div>

          {/* DRE Simplified */}
          <Card className="mt-6">
            <div className="p-4 border-b">
              <h3 className="font-medium">DRE Simplificado</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span>Receita Bruta</span>
                <span className="font-medium">{formatCurrency(totals.revenue)}</span>
              </div>
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>(-) CMV</span>
                <span>-{formatCurrency(periodCogs)}</span>
              </div>
              <div className={`flex justify-between py-2 font-bold text-lg ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>= Lucro Bruto</span>
                <span>{formatCurrency(grossProfit)}</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </ERPInventoryLayout>
  );
}
