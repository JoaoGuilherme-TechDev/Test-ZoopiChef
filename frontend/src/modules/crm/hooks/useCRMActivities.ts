import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { CRMActivity, ActivityType } from '../types';

export function useCRMActivities(filters?: { customerId?: string; leadId?: string }) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: activities, isLoading, refetch } = useQuery({
    queryKey: ['crm-activities', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      // Since we don't have a dedicated activities table, we'll use ai_lead_events
      let query = supabase
        .from('ai_lead_events')
        .select(`
          id,
          company_id,
          lead_id,
          customer_id,
          event_type,
          event_data,
          created_at
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.leadId) {
        query = query.eq('lead_id', filters.leadId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching activities:', error);
        throw error;
      }

      // Map events to activity format
      return (data || []).map(event => {
        const eventData = event.event_data as Record<string, unknown> | null;
        return {
          id: event.id,
          company_id: event.company_id,
          lead_id: event.lead_id,
          customer_id: event.customer_id,
          type: mapEventToActivityType(event.event_type),
          subject: getEventSubject(event.event_type, eventData),
          description: eventData?.description as string || undefined,
          created_by: 'system',
          created_at: event.created_at,
        };
      }) as CRMActivity[];
    },
    enabled: !!company?.id,
  });

  return {
    activities: activities || [],
    isLoading,
    refetch,
  };
}

function mapEventToActivityType(eventType: string): ActivityType {
  const mapping: Record<string, ActivityType> = {
    'page_view': 'note',
    'cart_add': 'note',
    'cart_update': 'note',
    'checkout_start': 'note',
    'order_complete': 'note',
    'whatsapp_click': 'whatsapp',
    'phone_click': 'call',
  };
  return mapping[eventType] || 'note';
}

function getEventSubject(eventType: string, eventData: Record<string, unknown> | null): string {
  const subjects: Record<string, string> = {
    'page_view': 'Visualizou página',
    'cart_add': 'Adicionou ao carrinho',
    'cart_update': 'Atualizou carrinho',
    'checkout_start': 'Iniciou checkout',
    'order_complete': 'Completou pedido',
    'whatsapp_click': 'Clicou no WhatsApp',
    'phone_click': 'Clicou no telefone',
  };
  
  let subject = subjects[eventType] || eventType;
  
  if (eventData?.product_name) {
    subject += `: ${eventData.product_name}`;
  }
  
  return subject;
}
