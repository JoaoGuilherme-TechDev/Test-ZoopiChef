import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface OverheadConfig {
  id: string;
  company_id: string;
  // Despesas Fixas (%)
  rent_percent: number;
  utilities_percent: number;
  insurance_percent: number;
  depreciation_percent: number;
  // Despesas Operacionais (%)
  labor_percent: number;
  administrative_percent: number;
  marketing_percent: number;
  maintenance_percent: number;
  // Impostos e Encargos (%)
  taxes_percent: number;
  card_fees_percent: number;
  delivery_fees_percent: number;
  // Margem desejada
  target_profit_percent: number;
  // Cálculo automático
  auto_calculate_enabled: boolean;
  monthly_fixed_expenses: number;
  monthly_variable_expenses: number;
  monthly_revenue_avg: number;
  last_calculated_at: string | null;
}

export interface RealCostCalculation {
  cmv: number;                    // Custo Matéria-Prima
  overhead_fixed_percent: number; // Total % despesas fixas
  overhead_ops_percent: number;   // Total % despesas operacionais
  taxes_percent: number;          // Total % impostos
  total_overhead_percent: number; // Total overhead %
  overhead_value: number;         // Valor do overhead em R$
  real_cost: number;              // Custo real do prato
  target_profit_percent: number;  // Margem de lucro desejada
  suggested_price: number;        // Preço sugerido
  breakdown: {
    label: string;
    percent: number;
    value: number;
  }[];
}

const DEFAULT_CONFIG: Partial<OverheadConfig> = {
  rent_percent: 8,
  utilities_percent: 3,
  insurance_percent: 1,
  depreciation_percent: 2,
  labor_percent: 25,
  administrative_percent: 5,
  marketing_percent: 3,
  maintenance_percent: 2,
  taxes_percent: 10,
  card_fees_percent: 3,
  delivery_fees_percent: 0,
  target_profit_percent: 15,
  auto_calculate_enabled: false,
  monthly_fixed_expenses: 0,
  monthly_variable_expenses: 0,
  monthly_revenue_avg: 0,
};

export function useOverheadConfig() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['overhead-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('company_overhead_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as OverheadConfig | null;
    },
    enabled: !!company?.id,
  });

  const upsertConfig = useMutation({
    mutationFn: async (config: Partial<OverheadConfig>) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data: existing } = await (supabase as any)
        .from('company_overhead_config')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('company_overhead_config')
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('company_overhead_config')
          .insert({ ...DEFAULT_CONFIG, ...config, company_id: company.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overhead-config'] });
      toast.success('Configuração de custos salva');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    },
  });

  // Calcular automaticamente com base nas despesas do sistema
  const calculateFromExpenses = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Buscar despesas dos últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: expenses } = await (supabase as any)
        .from('accounts_payable')
        .select('amount_cents, category_id, paid_at')
        .eq('company_id', company.id)
        .eq('status', 'paid')
        .gte('paid_at', threeMonthsAgo.toISOString());

      // Buscar faturamento dos últimos 3 meses
      const { data: orders } = await supabase
        .from('orders')
        .select('total')
        .eq('company_id', company.id)
        .gte('created_at', threeMonthsAgo.toISOString())
        .in('status', ['entregue', 'pronto']);

      const totalExpenses = (expenses || []).reduce((acc: number, e: any) => acc + (e.amount_cents || 0), 0) / 100;
      const totalRevenue = (orders || []).reduce((acc: number, o: any) => acc + (o.total || 0), 0);

      const monthlyExpenses = totalExpenses / 3;
      const monthlyRevenue = totalRevenue / 3;

      // Estimar percentuais baseados no faturamento
      const overheadPercent = monthlyRevenue > 0 ? (monthlyExpenses / monthlyRevenue) * 100 : 40;

      return {
        monthly_fixed_expenses: monthlyExpenses * 0.4, // 40% são fixas (estimativa)
        monthly_variable_expenses: monthlyExpenses * 0.6,
        monthly_revenue_avg: monthlyRevenue,
        // Distribuir proporcionalmente
        rent_percent: Math.min(overheadPercent * 0.15, 15),
        utilities_percent: Math.min(overheadPercent * 0.06, 8),
        labor_percent: Math.min(overheadPercent * 0.5, 35),
        administrative_percent: Math.min(overheadPercent * 0.1, 10),
        taxes_percent: 10, // Fixo conforme regime fiscal
        card_fees_percent: 3,
        auto_calculate_enabled: true,
        last_calculated_at: new Date().toISOString(),
      };
    },
    onSuccess: async (calculatedConfig) => {
      await upsertConfig.mutateAsync(calculatedConfig);
    },
  });

  // Calcular custo real de um prato
  const calculateRealCost = (cmv: number, overrideOverhead?: number, overrideProfit?: number): RealCostCalculation => {
    const config = configQuery.data || (DEFAULT_CONFIG as OverheadConfig);

    // Despesas Fixas
    const fixedPercent = 
      (config.rent_percent || 0) +
      (config.utilities_percent || 0) +
      (config.insurance_percent || 0) +
      (config.depreciation_percent || 0);

    // Despesas Operacionais
    const opsPercent = 
      (config.labor_percent || 0) +
      (config.administrative_percent || 0) +
      (config.marketing_percent || 0) +
      (config.maintenance_percent || 0);

    // Impostos e Taxas
    const taxesPercent = 
      (config.taxes_percent || 0) +
      (config.card_fees_percent || 0) +
      (config.delivery_fees_percent || 0);

    // Se houver override, usar ele
    const totalOverhead = overrideOverhead ?? (fixedPercent + opsPercent + taxesPercent);
    const profitPercent = overrideProfit ?? (config.target_profit_percent || 15);

    // Cálculo do custo real
    // Custo Real = CMV / (1 - Overhead% - Lucro%)
    const totalDeductionPercent = totalOverhead + profitPercent;
    const factor = 1 - (totalDeductionPercent / 100);
    
    // Evitar divisão por zero ou fator negativo
    const safeFactor = Math.max(factor, 0.1);
    const suggestedPrice = cmv / safeFactor;

    const overheadValue = suggestedPrice * (totalOverhead / 100);
    const realCost = cmv + overheadValue;

    const breakdown = [
      { label: 'CMV (Ingredientes)', percent: (cmv / suggestedPrice) * 100, value: cmv },
      { label: 'Aluguel', percent: config.rent_percent || 0, value: suggestedPrice * ((config.rent_percent || 0) / 100) },
      { label: 'Água/Luz/Gás', percent: config.utilities_percent || 0, value: suggestedPrice * ((config.utilities_percent || 0) / 100) },
      { label: 'Mão de Obra', percent: config.labor_percent || 0, value: suggestedPrice * ((config.labor_percent || 0) / 100) },
      { label: 'Administrativo', percent: config.administrative_percent || 0, value: suggestedPrice * ((config.administrative_percent || 0) / 100) },
      { label: 'Marketing', percent: config.marketing_percent || 0, value: suggestedPrice * ((config.marketing_percent || 0) / 100) },
      { label: 'Impostos', percent: config.taxes_percent || 0, value: suggestedPrice * ((config.taxes_percent || 0) / 100) },
      { label: 'Taxas Cartão', percent: config.card_fees_percent || 0, value: suggestedPrice * ((config.card_fees_percent || 0) / 100) },
      { label: 'Lucro Desejado', percent: profitPercent, value: suggestedPrice * (profitPercent / 100) },
    ].filter(b => b.percent > 0);

    return {
      cmv,
      overhead_fixed_percent: fixedPercent,
      overhead_ops_percent: opsPercent,
      taxes_percent: taxesPercent,
      total_overhead_percent: totalOverhead,
      overhead_value: overheadValue,
      real_cost: realCost,
      target_profit_percent: profitPercent,
      suggested_price: suggestedPrice,
      breakdown,
    };
  };

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    upsertConfig,
    calculateFromExpenses,
    calculateRealCost,
    defaultConfig: DEFAULT_CONFIG,
  };
}
