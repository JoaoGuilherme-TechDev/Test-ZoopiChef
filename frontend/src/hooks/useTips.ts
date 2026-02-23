import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Tip {
  id: string;
  company_id: string;
  order_id: string | null;
  comanda_id: string | null;
  amount_cents: number;
  tip_percentage: number | null;
  payment_method: string | null;
  distributed: boolean;
  distributed_at: string | null;
  distributed_by: string | null;
  notes: string | null;
  created_at: string;
  distributions?: TipDistribution[];
}

export interface TipDistribution {
  id: string;
  company_id: string;
  tip_id: string;
  employee_id: string;
  employee_name: string;
  share_percentage: number;
  amount_cents: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export interface CreateTipParams {
  orderId?: string;
  comandaId?: string;
  amountCents: number;
  tipPercentage?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface DistributeTipParams {
  tipId: string;
  distributions: {
    employeeId: string;
    employeeName: string;
    sharePercentage: number;
    amountCents: number;
  }[];
}

export function useTips(dateFilter?: { start: Date; end: Date }) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['tips', company?.id, dateFilter?.start, dateFilter?.end],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('tips')
        .select(`
          *,
          distributions:tip_distributions(*)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (dateFilter) {
        query = query
          .gte('created_at', dateFilter.start.toISOString())
          .lte('created_at', dateFilter.end.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Tip[];
    },
    enabled: !!company?.id,
  });

  const createTip = useMutation({
    mutationFn: async (params: CreateTipParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase
        .from('tips')
        .insert({
          company_id: company.id,
          order_id: params.orderId,
          comanda_id: params.comandaId,
          amount_cents: params.amountCents,
          tip_percentage: params.tipPercentage,
          payment_method: params.paymentMethod,
          notes: params.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('Gorjeta registrada!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar gorjeta: ' + error.message);
    },
  });

  const distributeTip = useMutation({
    mutationFn: async (params: DistributeTipParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Insert distributions
      const distributionsToInsert = params.distributions.map((d) => ({
        company_id: company.id,
        tip_id: params.tipId,
        employee_id: d.employeeId,
        employee_name: d.employeeName,
        share_percentage: d.sharePercentage,
        amount_cents: d.amountCents,
      }));

      const { error: distError } = await supabase
        .from('tip_distributions')
        .insert(distributionsToInsert);

      if (distError) throw distError;

      // Mark tip as distributed
      const { error: tipError } = await supabase
        .from('tips')
        .update({
          distributed: true,
          distributed_at: new Date().toISOString(),
        })
        .eq('id', params.tipId);

      if (tipError) throw tipError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('Gorjeta distribuída!');
    },
    onError: (error) => {
      toast.error('Erro ao distribuir gorjeta: ' + error.message);
    },
  });

  const markDistributionPaid = useMutation({
    mutationFn: async (distributionId: string) => {
      const { error } = await supabase
        .from('tip_distributions')
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq('id', distributionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      toast.success('Pagamento marcado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });

  // Statistics
  const totalTips = tips.reduce((sum, t) => sum + t.amount_cents, 0);
  const distributedTips = tips.filter((t) => t.distributed).reduce((sum, t) => sum + t.amount_cents, 0);
  const pendingTips = totalTips - distributedTips;

  return {
    tips,
    isLoading,
    createTip,
    distributeTip,
    markDistributionPaid,
    stats: {
      totalTips,
      distributedTips,
      pendingTips,
      count: tips.length,
    },
  };
}
