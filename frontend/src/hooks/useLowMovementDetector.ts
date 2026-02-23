import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface MovementStatus {
  success: boolean;
  status: 'normal' | 'low_movement_detected' | 'alert_exists' | 'no_data';
  message: string;
  current_revenue?: number;
  expected_revenue?: number;
  variation_percent?: number;
  current_orders?: number;
  available_customers?: number;
  suggestion_id?: string;
  alert_created?: boolean;
}

export interface EmergencyCampaignResult {
  success: boolean;
  message: string;
  campaign_id?: string;
  total_customers?: number;
  emergency_message?: string;
}

export function useCheckMovement() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['movement-check', profile?.company_id],
    queryFn: async (): Promise<MovementStatus | null> => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase.functions.invoke('ai-low-movement-detector', {
        body: {
          company_id: profile.company_id,
          action: 'check',
          threshold_percent: 30,
        },
      });

      if (error) throw error;
      return data as MovementStatus;
    },
    enabled: !!profile?.company_id,
    refetchInterval: 15 * 60 * 1000, // Verifica a cada 15 minutos
    staleTime: 10 * 60 * 1000, // Considera stale após 10 minutos
  });
}

export function useLaunchEmergencyCampaign() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (): Promise<EmergencyCampaignResult> => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-low-movement-detector', {
        body: {
          company_id: profile.company_id,
          action: 'launch_emergency_campaign',
        },
      });

      if (error) throw error;
      return data as EmergencyCampaignResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['movement-check'] });
      queryClient.invalidateQueries({ queryKey: ['ai-operational-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      if (data.success) {
        toast.success(data.message || 'Campanha de emergência lançada!');
      } else {
        toast.warning(data.message || 'Não foi possível criar a campanha');
      }
    },
    onError: (error) => {
      console.error('Erro ao lançar campanha de emergência:', error);
      toast.error('Erro ao lançar campanha de emergência');
    },
  });
}
