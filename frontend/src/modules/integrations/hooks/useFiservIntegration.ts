import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export function useFiservIntegration() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Check if Fiserv is configured (using tef_integrations table)
  const configQuery = useQuery({
    queryKey: ['fiserv-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('tef_integrations')
        .select('*')
        .eq('company_id', company.id)
        .eq('provider', 'fiserv')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Get recent transactions (via integration_id)
  const transactionsQuery = useQuery({
    queryKey: ['fiserv-transactions', company?.id, configQuery.data?.id],
    queryFn: async () => {
      if (!company?.id || !configQuery.data?.id) return [];

      const { data, error } = await supabase
        .from('tef_transactions')
        .select('*')
        .eq('company_id', company.id)
        .eq('integration_id', configQuery.data.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id && !!configQuery.data?.id,
  });

  // Get transaction stats
  const statsQuery = useQuery({
    queryKey: ['fiserv-stats', company?.id, configQuery.data?.id],
    queryFn: async () => {
      if (!company?.id || !configQuery.data?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tef_transactions')
        .select('status, amount_cents')
        .eq('company_id', company.id)
        .eq('integration_id', configQuery.data.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const stats = {
        total_transactions: data.length,
        approved: data.filter(t => t.status === 'approved' || t.status === 'APPROVED').length,
        declined: data.filter(t => t.status === 'declined' || t.status === 'DECLINED').length,
        pending: data.filter(t => t.status === 'pending' || t.status === 'PENDING').length,
        total_amount_cents: data
          .filter(t => t.status === 'approved' || t.status === 'APPROVED')
          .reduce((sum, t) => sum + (t.amount_cents || 0), 0),
      };

      return stats;
    },
    enabled: !!company?.id && !!configQuery.data?.id,
  });

  // Enable/disable Fiserv
  const toggleFiserv = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!company?.id) throw new Error('No company');

      const { data: existing } = await supabase
        .from('tef_integrations')
        .select('id')
        .eq('company_id', company.id)
        .eq('provider', 'fiserv')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tef_integrations')
          .update({ is_active: enabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tef_integrations')
          .insert({
            company_id: company.id,
            provider: 'fiserv',
            is_active: enabled,
            environment: 'sandbox',
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Fiserv ativado' : 'Fiserv desativado');
      queryClient.invalidateQueries({ queryKey: ['fiserv-config'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar configuração: ' + error.message);
    },
  });

  // Toggle production mode
  const toggleProduction = useMutation({
    mutationFn: async (isProduction: boolean) => {
      if (!company?.id) throw new Error('No company');

      const { data: existing } = await supabase
        .from('tef_integrations')
        .select('id')
        .eq('company_id', company.id)
        .eq('provider', 'fiserv')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tef_integrations')
          .update({ 
            environment: isProduction ? 'production' : 'sandbox',
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, isProduction) => {
      toast.success(isProduction ? 'Modo produção ativado' : 'Modo sandbox ativado');
      queryClient.invalidateQueries({ queryKey: ['fiserv-config'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar modo: ' + error.message);
    },
  });

  return {
    config: configQuery.data,
    isConfigLoading: configQuery.isLoading,
    transactions: transactionsQuery.data || [],
    isTransactionsLoading: transactionsQuery.isLoading,
    stats: statsQuery.data,
    isStatsLoading: statsQuery.isLoading,
    toggleFiserv,
    toggleProduction,
  };
}
