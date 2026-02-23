import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { CRMDashboardData, LeadStatus } from '../types';
import { startOfDay, subDays } from 'date-fns';

export function useCRMDashboard() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['crm-dashboard', company?.id],
    queryFn: async (): Promise<CRMDashboardData> => {
      if (!company?.id) {
        return getEmptyDashboard();
      }

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('ai_leads')
        .select('id, source, cart_total, converted, converted_at, created_at')
        .eq('company_id', company.id);

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
      }

      const leadsList = leads || [];
      
      // Calculate metrics
      const totalLeads = leadsList.length;
      const convertedLeads = leadsList.filter(l => l.converted).length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
      
      const totalValue = leadsList.reduce((sum, l) => sum + (l.cart_total || 0), 0);
      const avgDealSize = convertedLeads > 0 
        ? leadsList.filter(l => l.converted).reduce((sum, l) => sum + (l.cart_total || 0), 0) / convertedLeads
        : 0;

      // Count leads by status (simplified)
      const leadsByStatus: Record<LeadStatus, number> = {
        new: leadsList.filter(l => !l.converted).length,
        contacted: 0,
        qualified: 0,
        proposal: 0,
        negotiation: 0,
        won: convertedLeads,
        lost: 0,
      };

      // Fetch today's activities
      const today = startOfDay(new Date()).toISOString();
      const { data: todayEvents } = await supabase
        .from('ai_lead_events')
        .select('id')
        .eq('company_id', company.id)
        .gte('created_at', today);

      return {
        total_leads: totalLeads,
        leads_by_status: leadsByStatus,
        pipeline_value: totalValue,
        conversion_rate: conversionRate,
        avg_deal_size: avgDealSize,
        activities_today: todayEvents?.length || 0,
        overdue_activities: 0, // Would need a proper activities table
      };
    },
    enabled: !!company?.id,
  });
}

function getEmptyDashboard(): CRMDashboardData {
  return {
    total_leads: 0,
    leads_by_status: {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    },
    pipeline_value: 0,
    conversion_rate: 0,
    avg_deal_size: 0,
    activities_today: 0,
    overdue_activities: 0,
  };
}
