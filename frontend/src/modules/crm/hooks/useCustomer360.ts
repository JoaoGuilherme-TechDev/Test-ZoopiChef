import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Customer360 } from '../types';
import { differenceInDays } from 'date-fns';

export function useCustomer360(customerId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['customer-360', company?.id, customerId],
    queryFn: async (): Promise<Customer360 | null> => {
      if (!company?.id || !customerId) return null;

      // Fetch customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, whatsapp, created_at')
        .eq('id', customerId)
        .single();

      if (customerError || !customer) {
        console.error('Error fetching customer:', customerError);
        return null;
      }

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, total, status, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }

      // Fetch AI segment data if available
      const { data: segment } = await supabase
        .from('ai_customer_segments')
        .select('segment_type, is_vip, is_frequent')
        .eq('customer_id', customerId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch churn prediction if available
      const { data: churnPrediction } = await supabase
        .from('ai_churn_predictions')
        .select('churn_score')
        .eq('customer_id', customerId)
        .order('predicted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate stats
      const ordersList = orders || [];
      const totalSpent = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
      const lastOrderDate = ordersList[0]?.created_at;
      const daysSinceLastOrder = lastOrderDate 
        ? differenceInDays(new Date(), new Date(lastOrderDate))
        : undefined;

      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email || undefined,
          whatsapp: customer.whatsapp || undefined,
          created_at: customer.created_at,
        },
        stats: {
          total_orders: ordersList.length,
          total_spent: totalSpent,
          avg_ticket: ordersList.length > 0 ? totalSpent / ordersList.length : 0,
          last_order_date: lastOrderDate,
          days_since_last_order: daysSinceLastOrder,
        },
        orders: ordersList.map(o => ({
          id: o.id,
          order_number: o.order_number,
          total: o.total,
          status: o.status,
          created_at: o.created_at,
        })),
        activities: [], // Will be populated by useCRMActivities
        segment: segment ? {
          type: segment.segment_type,
          is_vip: segment.is_vip || false,
          is_frequent: segment.is_frequent || false,
          churn_risk: churnPrediction?.churn_score,
        } : undefined,
      };
    },
    enabled: !!company?.id && !!customerId,
  });
}
