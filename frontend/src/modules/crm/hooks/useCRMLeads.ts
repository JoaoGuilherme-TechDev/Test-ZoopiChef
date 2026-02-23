import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { CRMLead, LeadStatus, LeadSource } from '../types';

export function useCRMLeads(filters?: { status?: LeadStatus; source?: LeadSource }) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ['crm-leads', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('ai_leads')
        .select(`
          id,
          company_id,
          customer_id,
          name,
          email,
          phone,
          source,
          cart_total,
          converted,
          converted_at,
          created_at,
          updated_at,
          pipeline_stage_id,
          score,
          assigned_to
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (filters?.source) {
        query = query.eq('source', filters.source);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }

      // Map ai_leads to CRMLead format
      return (data || []).map(lead => ({
        id: lead.id,
        company_id: lead.company_id,
        customer_id: lead.customer_id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.converted ? 'won' : 'new' as LeadStatus,
        source: (lead.source || 'other') as LeadSource,
        estimated_value: lead.cart_total,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        won_at: lead.converted_at,
        pipeline_stage_id: lead.pipeline_stage_id,
        score: lead.score,
        assigned_to: lead.assigned_to,
      })) as CRMLead[];
    },
    enabled: !!company?.id,
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMLead> & { id: string }) => {
      const { error } = await supabase
        .from('ai_leads')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          source: updates.source,
          cart_total: updates.estimated_value,
          converted: updates.status === 'won',
          converted_at: updates.status === 'won' ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('Lead atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating lead:', error);
      toast.error('Erro ao atualizar lead');
    },
  });

  return {
    leads: leads || [],
    isLoading,
    refetch,
    updateLead: updateLeadMutation.mutate,
    isUpdating: updateLeadMutation.isPending,
  };
}
