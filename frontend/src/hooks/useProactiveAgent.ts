import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface ProactiveAgentSettings {
  company_id: string;
  is_enabled: boolean;
  trigger_low_revenue: boolean;
  trigger_peak_no_movement: boolean;
  trigger_inactive_customers: boolean;
  trigger_stale_inventory: boolean;
  revenue_threshold_percent: number;
  peak_hours_start: number;
  peak_hours_end: number;
  inactive_days_threshold: number;
  stale_inventory_days: number;
  max_alerts_per_day: number;
  max_campaigns_per_week: number;
  cooldown_hours: number;
  auto_whatsapp: boolean;
  auto_instagram: boolean;
  require_approval: boolean;
  target_audience: string;
  max_customers_per_blast: number;
}

export interface SuggestedCampaign {
  id: string;
  title: string;
  message: string;
  target_count: number;
  channel: 'whatsapp' | 'instagram' | 'both';
  discount_percent?: number;
  product_name?: string;
}

export interface ProactiveAlert {
  id: string;
  company_id: string;
  trigger_type: 'low_revenue' | 'peak_no_movement' | 'inactive_customers' | 'stale_inventory';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  analysis_data: {
    current_value?: number;
    expected_value?: number;
    variation_percent?: number;
    affected_count?: number;
    period?: string;
  };
  suggested_campaigns: SuggestedCampaign[];
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
  accepted_campaign_index?: number;
  executed_at?: string;
  campaign_id?: string;
  whatsapp_sent_count?: number;
  instagram_posted?: boolean;
  expires_at: string;
  created_at: string;
}

// Hook para configurações do agente
export function useProactiveAgentSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['proactive-agent-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('ai_proactive_agent_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ProactiveAgentSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<ProactiveAgentSettings>) => {
      if (!company?.id) throw new Error('Company não encontrada');
      
      const { data, error } = await supabase
        .from('ai_proactive_agent_settings')
        .upsert({
          company_id: company.id,
          ...newSettings,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactive-agent-settings'] });
      toast.success('Configurações salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}

// Hook para alertas pendentes
export function useProactiveAlerts() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['proactive-alerts', company?.id],
    queryFn: async (): Promise<ProactiveAlert[]> => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('ai_proactive_alerts')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map database response to typed interface
      return (data || []).map((item: any) => ({
        ...item,
        trigger_type: item.trigger_type as ProactiveAlert['trigger_type'],
        severity: item.severity as ProactiveAlert['severity'],
        status: item.status as ProactiveAlert['status'],
        analysis_data: item.analysis_data as ProactiveAlert['analysis_data'],
        suggested_campaigns: (item.suggested_campaigns || []) as SuggestedCampaign[],
      }));
    },
    enabled: !!company?.id,
    refetchInterval: 5 * 60 * 1000, // Verifica a cada 5 minutos
  });

  // Aceitar campanha e executar
  const acceptCampaign = useMutation({
    mutationFn: async ({ alertId, campaignIndex }: { alertId: string; campaignIndex: number }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não encontrados');
      
      const { data, error } = await supabase.functions.invoke('ai-proactive-agent', {
        body: {
          company_id: company.id,
          action: 'execute_campaign',
          alert_id: alertId,
          campaign_index: campaignIndex,
          user_id: profile.id,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proactive-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ai-marketing-posts'] });
      
      if (data?.success) {
        toast.success(data.message || 'Campanha executada com sucesso!');
      } else {
        toast.warning(data?.message || 'Campanha aceita mas houve problemas na execução');
      }
    },
    onError: () => {
      toast.error('Erro ao executar campanha');
    },
  });

  // Dispensar alerta
  const dismissAlert = useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason?: string }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não encontrados');
      
      const { error } = await supabase
        .from('ai_proactive_alerts')
        .update({
          status: 'dismissed',
          dismissed_at: new Date().toISOString(),
          dismissed_by: profile.id,
          dismiss_reason: reason || 'Dispensado pelo usuário',
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactive-alerts'] });
      toast.success('Alerta dispensado');
    },
    onError: () => {
      toast.error('Erro ao dispensar alerta');
    },
  });

  // Gerar novas sugestões para um alerta
  const regenerateSuggestions = useMutation({
    mutationFn: async (alertId: string) => {
      if (!company?.id) throw new Error('Company não encontrada');
      
      const { data, error } = await supabase.functions.invoke('ai-proactive-agent', {
        body: {
          company_id: company.id,
          action: 'regenerate_suggestions',
          alert_id: alertId,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proactive-alerts'] });
      toast.success('Novas sugestões geradas!');
    },
    onError: () => {
      toast.error('Erro ao gerar novas sugestões');
    },
  });

  // Disparar verificação manual
  const triggerCheck = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company não encontrada');
      
      const { data, error } = await supabase.functions.invoke('ai-proactive-agent', {
        body: {
          company_id: company.id,
          action: 'check_all_triggers',
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proactive-alerts'] });
      if (data?.alerts_created > 0) {
        toast.success(`${data.alerts_created} alerta(s) criado(s)!`);
      } else {
        toast.info('Nenhuma anomalia detectada no momento');
      }
    },
    onError: () => {
      toast.error('Erro ao verificar gatilhos');
    },
  });

  return {
    alerts,
    isLoading,
    refetch,
    acceptCampaign: acceptCampaign.mutate,
    isAccepting: acceptCampaign.isPending,
    dismissAlert: dismissAlert.mutate,
    isDismissing: dismissAlert.isPending,
    regenerateSuggestions: regenerateSuggestions.mutate,
    isRegenerating: regenerateSuggestions.isPending,
    triggerCheck: triggerCheck.mutate,
    isChecking: triggerCheck.isPending,
  };
}
