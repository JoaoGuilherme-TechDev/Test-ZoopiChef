import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { MarketingCampaign } from '../types';

export function useMarketingCampaigns() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(c => ({
        id: c.id,
        company_id: c.company_id,
        name: c.type,
        type: c.channel as MarketingCampaign['type'],
        status: c.status as MarketingCampaign['status'],
        audience_rule: c.audience_rule,
        audience_count: c.audience_count,
        message_template: c.message_template,
        scheduled_for: c.scheduled_for,
        completed_at: c.completed_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })) as MarketingCampaign[];
    },
    enabled: !!company?.id,
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Partial<MarketingCampaign>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          company_id: company.id,
          type: campaign.name || 'campaign',
          channel: campaign.type || 'whatsapp',
          status: 'draft',
          audience_rule: campaign.audience_rule || 'all',
          audience_count: campaign.audience_count || 0,
          message_template: campaign.message_template || '',
          confidence: 'high',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar campanha');
    },
  });

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Status atualizado!');
    },
  });

  const activeCampaigns = campaigns.filter(c => c.status === 'running');
  const draftCampaigns = campaigns.filter(c => c.status === 'draft');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  return {
    campaigns,
    activeCampaigns,
    draftCampaigns,
    completedCampaigns,
    isLoading,
    createCampaign,
    updateCampaignStatus,
  };
}
