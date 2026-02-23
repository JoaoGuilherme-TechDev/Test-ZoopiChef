import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface CRMAutomation {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_type: 'lead_created' | 'lead_status_changed' | 'customer_inactive' | 'birthday' | 'order_completed' | 'review_received' | 'manual';
  trigger_config: Record<string, unknown>;
  action_type: 'send_whatsapp' | 'send_email' | 'create_task' | 'update_lead_status' | 'assign_to_user' | 'add_tag' | 'webhook';
  action_config: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  run_count: number;
  created_at: string;
}

export interface CRMTag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CRMPipelineStage {
  id: string;
  company_id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
}

export const AUTOMATION_TRIGGERS = [
  { value: 'lead_created', label: 'Novo Lead Criado', icon: '👤' },
  { value: 'lead_status_changed', label: 'Status do Lead Alterado', icon: '🔄' },
  { value: 'customer_inactive', label: 'Cliente Inativo', icon: '😴' },
  { value: 'birthday', label: 'Aniversário', icon: '🎂' },
  { value: 'order_completed', label: 'Pedido Concluído', icon: '✅' },
  { value: 'review_received', label: 'Avaliação Recebida', icon: '⭐' },
  { value: 'manual', label: 'Execução Manual', icon: '👆' },
];

export const AUTOMATION_ACTIONS = [
  { value: 'send_whatsapp', label: 'Enviar WhatsApp', icon: '📱' },
  { value: 'send_email', label: 'Enviar Email', icon: '📧' },
  { value: 'create_task', label: 'Criar Tarefa', icon: '📋' },
  { value: 'update_lead_status', label: 'Atualizar Status', icon: '🏷️' },
  { value: 'assign_to_user', label: 'Atribuir a Usuário', icon: '👤' },
  { value: 'add_tag', label: 'Adicionar Tag', icon: '🔖' },
  { value: 'webhook', label: 'Webhook Externo', icon: '🔗' },
];

// Automations
export function useCRMAutomations() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['crm-automations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('crm_automations')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CRMAutomation[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateCRMAutomation() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (automation: Partial<CRMAutomation>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      if (!automation.trigger_type) throw new Error('Tipo de gatilho é obrigatório');
      if (!automation.action_type) throw new Error('Tipo de ação é obrigatório');
      if (!automation.name) throw new Error('Nome é obrigatório');
      
      const { data, error } = await supabase
        .from('crm_automations')
        .insert([{ 
          name: automation.name,
          description: automation.description,
          trigger_type: automation.trigger_type,
          action_type: automation.action_type,
          is_active: automation.is_active ?? true,
          company_id: company.id,
          action_config: (automation.action_config || {}) as any,
          trigger_config: (automation.trigger_config || {}) as any,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success('Automação criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar automação: ' + error.message);
    },
  });
}

export function useUpdateCRMAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMAutomation> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_automations')
        .update({
          ...updates,
          action_config: updates.action_config as any,
          trigger_config: updates.trigger_config as any,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success('Automação atualizada');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useDeleteCRMAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_automations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success('Automação removida');
    },
  });
}

// Tags
export function useCRMTags() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['crm-tags', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;
      return data as CRMTag[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateCRMTag() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (tag: { name: string; color?: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase
        .from('crm_tags')
        .insert([{ ...tag, company_id: company.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tags'] });
      toast.success('Tag criada');
    },
  });
}

export function useDeleteCRMTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tags'] });
      toast.success('Tag removida');
    },
  });
}

// Pipeline Stages
export function useCRMPipelineStages() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['crm-pipeline-stages', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('company_id', company.id)
        .order('position');
      if (error) throw error;
      return data as CRMPipelineStage[];
    },
    enabled: !!company?.id,
  });
}

export function useUpdateCRMPipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMPipelineStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-pipeline-stages'] });
    },
  });
}

// Lead Scoring
export function useLeadScoring() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['lead-scoring', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('ai_leads')
        .select('*, ai_customer_segments(segment_type, engagement_score)')
        .eq('company_id', company.id)
        .order('score', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });
}

export function useUpdateLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, score }: { leadId: string; score: number }) => {
      const { data, error } = await supabase
        .from('ai_leads')
        .update({ score })
        .eq('id', leadId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    },
  });
}
