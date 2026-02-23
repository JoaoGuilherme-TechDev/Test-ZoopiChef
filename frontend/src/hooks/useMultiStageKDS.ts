import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { useEffect } from 'react';

// Types
export type StageStatus = 'waiting' | 'pending' | 'in_progress' | 'done' | 'skipped';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface KDSStageDefinition {
  id: string;
  company_id: string;
  stage_key: string;
  stage_name: string;
  stage_order: number;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KDSUserRole {
  id: string;
  company_id: string;
  user_id: string;
  stage_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderStageProgress {
  id: string;
  order_id: string;
  company_id: string;
  stage_key: string;
  stage_order: number;
  status: StageStatus;
  started_at: string | null;
  started_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithStages {
  id: string;
  order_number?: number;
  customer_name: string | null;
  status: string;
  urgency: UrgencyLevel;
  created_at: string;
  stages: OrderStageProgress[];
  current_stage: OrderStageProgress | null;
  items?: any[];
}

// Urgency configuration
export const urgencyConfig: Record<UrgencyLevel, { label: string; color: string; bgColor: string; priority: number }> = {
  low: { label: 'Baixa', color: 'text-slate-400', bgColor: 'bg-slate-600', priority: 0 },
  normal: { label: 'Normal', color: 'text-blue-400', bgColor: 'bg-blue-600', priority: 1 },
  high: { label: 'Alta', color: 'text-orange-400', bgColor: 'bg-orange-600', priority: 2 },
  critical: { label: 'Crítica', color: 'text-red-400', bgColor: 'bg-red-600', priority: 3 },
};

/**
 * Hook to check if multi-stage KDS is enabled for the company
 */
export function useMultiStageEnabled() {
  const { data: company } = useCompany();

  const { data: kdsSettings, isLoading } = useQuery({
    queryKey: ['kds-multi-stage-enabled', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('company_kds_settings')
        .select('kds_multi_stage_enabled')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
  
  return {
    isEnabled: kdsSettings?.kds_multi_stage_enabled ?? false,
    isLoading,
  };
}

/**
 * Hook to fetch and manage KDS stage definitions
 */
export function useKDSStageDefinitions() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['kds-stage-definitions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kds_stage_definitions')
        .select('*')
        .eq('company_id', company.id)
        .order('stage_order');
      if (error) throw error;
      return data as KDSStageDefinition[];
    },
    enabled: !!company?.id,
  });

  const createStage = useMutation({
    mutationFn: async (stage: Omit<KDSStageDefinition, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase
        .from('kds_stage_definitions')
        .insert({ ...stage, company_id: company.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-stage-definitions'] });
      toast.success('Etapa criada!');
    },
    onError: () => toast.error('Erro ao criar etapa'),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KDSStageDefinition> & { id: string }) => {
      const { error } = await supabase
        .from('kds_stage_definitions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-stage-definitions'] });
      toast.success('Etapa atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar etapa'),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kds_stage_definitions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-stage-definitions'] });
      toast.success('Etapa removida!');
    },
    onError: () => toast.error('Erro ao remover etapa'),
  });

  const setupDefaultStages = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase.rpc('setup_default_kds_stages', { p_company_id: company.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-stage-definitions'] });
      toast.success('Etapas padrão criadas!');
    },
    onError: () => toast.error('Erro ao criar etapas padrão'),
  });

  return {
    stages,
    activeStages: stages.filter(s => s.is_active),
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    setupDefaultStages,
  };
}

/**
 * Hook to manage KDS user roles (which stages a user can work on)
 */
export function useKDSUserRoles() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['kds-user-roles', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('kds_user_roles')
        .select('*')
        .eq('company_id', company.id);
      if (error) throw error;
      return data as KDSUserRole[];
    },
    enabled: !!company?.id,
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, stageKey }: { userId: string; stageKey: string }) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase
        .from('kds_user_roles')
        .upsert({ 
          company_id: company.id, 
          user_id: userId, 
          stage_key: stageKey,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-user-roles'] });
      toast.success('Função atribuída!');
    },
    onError: () => toast.error('Erro ao atribuir função'),
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, stageKey }: { userId: string; stageKey: string }) => {
      if (!company?.id) throw new Error('No company');
      const { error } = await supabase
        .from('kds_user_roles')
        .delete()
        .eq('company_id', company.id)
        .eq('user_id', userId)
        .eq('stage_key', stageKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-user-roles'] });
      toast.success('Função removida!');
    },
    onError: () => toast.error('Erro ao remover função'),
  });

  return {
    roles,
    isLoading,
    assignRole,
    removeRole,
    getUserRoles: (userId: string) => roles.filter(r => r.user_id === userId && r.is_active),
    getUsersForStage: (stageKey: string) => roles.filter(r => r.stage_key === stageKey && r.is_active),
  };
}

/**
 * Hook to get current user's KDS roles
 */
export function useCurrentUserKDSRoles() {
  const { data: company } = useCompany();

  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['current-user-kds-roles', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('kds_user_roles')
        .select('stage_key')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data.map(r => r.stage_key);
    },
    enabled: !!company?.id,
  });

  return {
    userRoles,
    isLoading,
    canWorkOnStage: (stageKey: string) => userRoles.length === 0 || userRoles.includes(stageKey),
  };
}

/**
 * Hook to fetch orders with their stage progress for multi-stage KDS
 */
export function useMultiStageOrders() {
  const { data: company } = useCompany();
  const { isEnabled } = useMultiStageEnabled();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['multi-stage-kds-orders', company?.id],
    queryFn: async () => {
      if (!company?.id || !isEnabled) return [];

      // Fetch orders that are in production
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, urgency, created_at')
        .eq('company_id', company.id)
        .in('status', ['novo', 'preparo', 'pronto'])
        .order('created_at', { ascending: true });

      if (ordersError) throw ordersError;
      if (!ordersData?.length) return [];

      // Fetch stage progress for all orders
      const orderIds = ordersData.map(o => o.id);
      const { data: stagesData, error: stagesError } = await supabase
        .from('order_stage_progress')
        .select('*')
        .in('order_id', orderIds)
        .order('stage_order');

      if (stagesError) throw stagesError;

      // Group stages by order with proper typing
      const stagesByOrder = (stagesData || []).reduce((acc, stage) => {
        if (!acc[stage.order_id]) acc[stage.order_id] = [];
        // Cast status to StageStatus type
        const typedStage: OrderStageProgress = {
          ...stage,
          status: stage.status as StageStatus,
        };
        acc[stage.order_id].push(typedStage);
        return acc;
      }, {} as Record<string, OrderStageProgress[]>);

      // Combine orders with stages
      const ordersWithStages: OrderWithStages[] = ordersData.map(order => {
        const stages = stagesByOrder[order.id] || [];
        const currentStage = stages.find(s => s.status === 'pending' || s.status === 'in_progress') || null;
        
        return {
          ...order,
          urgency: (order.urgency || 'normal') as UrgencyLevel,
          stages,
          current_stage: currentStage,
        };
      });

      // Sort by urgency (higher first) then by creation time
      return ordersWithStages.sort((a, b) => {
        const urgencyDiff = urgencyConfig[b.urgency].priority - urgencyConfig[a.urgency].priority;
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
    enabled: !!company?.id && isEnabled,
    refetchInterval: 5000,
  });

  // Real-time subscription for stage progress updates
  useEffect(() => {
    if (!company?.id || !isEnabled) return;

    const channel = supabase
      .channel('order-stage-progress-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_stage_progress',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['multi-stage-kds-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, isEnabled, queryClient]);

  return {
    orders,
    isLoading,
    refetch,
  };
}

/**
 * Hook to advance order stages (start/complete)
 */
export function useAdvanceStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, stageKey }: { orderId: string; stageKey: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('advance_order_stage', {
        p_order_id: orderId,
        p_stage_key: stageKey,
        p_user_id: user.id,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; action?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to advance stage');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['multi-stage-kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      if (data.action === 'started') {
        toast.success('Etapa iniciada!');
      } else if (data.action === 'completed') {
        toast.success('Etapa concluída!');
      } else if (data.action === 'order_complete') {
        toast.success('Pedido pronto!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao avançar etapa');
    },
  });
}

/**
 * Hook to update order urgency
 */
export function useUpdateUrgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, urgency }: { orderId: string; urgency: UrgencyLevel }) => {
      const { error } = await supabase
        .from('orders')
        .update({ urgency, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-stage-kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Urgência atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar urgência'),
  });
}
