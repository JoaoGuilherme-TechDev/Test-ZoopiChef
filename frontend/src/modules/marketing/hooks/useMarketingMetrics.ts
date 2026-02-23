import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import type { MarketingMetrics, CampaignPerformance } from '../types';

export function useMarketingMetrics() {
  const { data: company } = useCompany();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['marketing-metrics', company?.id],
    queryFn: async (): Promise<MarketingMetrics> => {
      if (!company?.id) {
        return {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalReach: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          avgConversionRate: 0,
          revenueGenerated: 0,
          roiPercent: 0,
        };
      }

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', company.id);

      const { data: messages } = await supabase
        .from('campaign_messages')
        .select('*, campaigns!inner(company_id)')
        .eq('campaigns.company_id', company.id);

      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'running').length || 0;
      const totalReach = messages?.length || 0;
      
      const deliveredMessages = messages?.filter(m => m.status === 'delivered') || [];
      const readMessages = messages?.filter(m => m.read_at) || [];
      
      const avgOpenRate = totalReach > 0 ? (readMessages.length / totalReach) * 100 : 0;
      const avgClickRate = avgOpenRate * 0.3; // Estimativa
      const avgConversionRate = avgClickRate * 0.1; // Estimativa

      return {
        totalCampaigns,
        activeCampaigns,
        totalReach,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
        avgConversionRate: Math.round(avgConversionRate * 10) / 10,
        revenueGenerated: 0, // Calcular baseado em conversões
        roiPercent: 0,
      };
    },
    enabled: !!company?.id,
  });

  const { data: performance = [], isLoading: performanceLoading } = useQuery({
    queryKey: ['marketing-performance', company?.id],
    queryFn: async (): Promise<CampaignPerformance[]> => {
      if (!company?.id) return [];

      // Simular dados de performance dos últimos 7 dias
      const days = 7;
      const result: CampaignPerformance[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        result.push({
          date: date.toISOString().split('T')[0],
          sent: Math.floor(Math.random() * 100) + 50,
          delivered: Math.floor(Math.random() * 90) + 40,
          opened: Math.floor(Math.random() * 60) + 20,
          clicked: Math.floor(Math.random() * 30) + 5,
        });
      }
      
      return result;
    },
    enabled: !!company?.id,
  });

  return {
    metrics: metrics || {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalReach: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      avgConversionRate: 0,
      revenueGenerated: 0,
      roiPercent: 0,
    },
    performance,
    isLoading: metricsLoading || performanceLoading,
  };
}
