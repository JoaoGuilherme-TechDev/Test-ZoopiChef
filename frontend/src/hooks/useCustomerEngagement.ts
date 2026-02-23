import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from "./useProfile";

export type EngagementLevel = 'cold' | 'warm' | 'hot' | 'vip';

export interface CustomerEngagement {
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Metrics
  totalOrders: number;
  totalSpent: number;
  avgTicket: number;
  daysSinceLastOrder: number | null;
  orderFrequencyDays: number | null;
  
  // Derived scores (0-100)
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  engagementScore: number;
  
  // Level
  level: EngagementLevel;
  
  // Segments
  isVip: boolean;
  isInactive: boolean;
  isHighTicket: boolean;
  isLowTicket: boolean;
  isFrequent: boolean;
  
  // Prize related
  hasUnredeemedPrize: boolean;
}

// Calculate engagement level from score
const getEngagementLevel = (score: number): EngagementLevel => {
  if (score >= 80) return 'vip';
  if (score >= 50) return 'hot';
  if (score >= 25) return 'warm';
  return 'cold';
};

// Get label for engagement level
export const getEngagementLevelLabel = (level: EngagementLevel): string => {
  switch (level) {
    case 'vip': return 'VIP';
    case 'hot': return 'Engajado';
    case 'warm': return 'Morno';
    case 'cold': return 'Frio';
  }
};

// Get color for engagement level
export const getEngagementLevelColor = (level: EngagementLevel): string => {
  switch (level) {
    case 'vip': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
    case 'hot': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'warm': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'cold': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  }
};

// Hook to calculate engagement for all customers
export const useCustomerEngagement = () => {
  const { data: profile } = useProfile();
  
  return useQuery({
    queryKey: ['customer-engagement', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      // Get all customers
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, whatsapp')
        .eq('company_id', profile.company_id);
      
      if (custError) throw custError;
      if (!customers || customers.length === 0) return [];
      
      // Get all orders
      const { data: orders, error: ordError } = await supabase
        .from('orders')
        .select('customer_id, total, created_at')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      
      if (ordError) throw ordError;
      
      // Get unredeemed prizes
      const { data: prizes } = await supabase
        .from('prize_wins')
        .select('customer_id')
        .eq('company_id', profile.company_id)
        .eq('redeemed', false);
      
      const unredeemedPrizeCustomers = new Set((prizes || []).map(p => p.customer_id));
      
      // Calculate metrics for each customer
      const now = new Date();
      const ordersByCustomer = new Map<string, { total: number; created_at: string }[]>();
      
      (orders || []).forEach(order => {
        if (order.customer_id) {
          if (!ordersByCustomer.has(order.customer_id)) {
            ordersByCustomer.set(order.customer_id, []);
          }
          ordersByCustomer.get(order.customer_id)!.push(order);
        }
      });
      
      // Get max values for normalization
      let maxTotalSpent = 0;
      let maxOrderCount = 0;
      
      customers.forEach(customer => {
        const custOrders = ordersByCustomer.get(customer.id) || [];
        const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total), 0);
        if (totalSpent > maxTotalSpent) maxTotalSpent = totalSpent;
        if (custOrders.length > maxOrderCount) maxOrderCount = custOrders.length;
      });
      
      // Avoid division by zero
      if (maxTotalSpent === 0) maxTotalSpent = 1;
      if (maxOrderCount === 0) maxOrderCount = 1;
      
      const engagements: CustomerEngagement[] = customers.map(customer => {
        const custOrders = ordersByCustomer.get(customer.id) || [];
        const totalOrders = custOrders.length;
        const totalSpent = custOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const avgTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        // Recency
        let daysSinceLastOrder: number | null = null;
        if (custOrders.length > 0) {
          const lastOrderDate = new Date(custOrders[0].created_at);
          daysSinceLastOrder = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Frequency (avg days between orders)
        let orderFrequencyDays: number | null = null;
        if (custOrders.length >= 2) {
          const firstOrder = new Date(custOrders[custOrders.length - 1].created_at);
          const lastOrder = new Date(custOrders[0].created_at);
          const totalDays = (lastOrder.getTime() - firstOrder.getTime()) / (1000 * 60 * 60 * 24);
          orderFrequencyDays = Math.round(totalDays / (custOrders.length - 1));
        }
        
        // Calculate scores (0-100)
        // Recency: 0-30 days = 100, 30-90 days linear decay, 90+ = 0
        let recencyScore = 0;
        if (daysSinceLastOrder !== null) {
          if (daysSinceLastOrder <= 7) recencyScore = 100;
          else if (daysSinceLastOrder <= 30) recencyScore = 100 - ((daysSinceLastOrder - 7) * (50 / 23));
          else if (daysSinceLastOrder <= 90) recencyScore = 50 - ((daysSinceLastOrder - 30) * (50 / 60));
          else recencyScore = 0;
        }
        
        // Frequency: normalized by max
        const frequencyScore = Math.round((totalOrders / maxOrderCount) * 100);
        
        // Monetary: normalized by max
        const monetaryScore = Math.round((totalSpent / maxTotalSpent) * 100);
        
        // Combined engagement score (weighted average)
        const engagementScore = Math.round(
          (recencyScore * 0.4) + (frequencyScore * 0.3) + (monetaryScore * 0.3)
        );
        
        // Determine segments
        const isVip = engagementScore >= 80 || (avgTicket >= 100 && totalOrders >= 5);
        const isInactive = daysSinceLastOrder !== null && daysSinceLastOrder > 30;
        const isHighTicket = avgTicket >= 80;
        const isLowTicket = avgTicket > 0 && avgTicket < 30;
        const isFrequent = orderFrequencyDays !== null && orderFrequencyDays < 14;
        const hasUnredeemedPrize = unredeemedPrizeCustomers.has(customer.id);
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.whatsapp,
          totalOrders,
          totalSpent,
          avgTicket,
          daysSinceLastOrder,
          orderFrequencyDays,
          recencyScore,
          frequencyScore,
          monetaryScore,
          engagementScore,
          level: getEngagementLevel(engagementScore),
          isVip,
          isInactive,
          isHighTicket,
          isLowTicket,
          isFrequent,
          hasUnredeemedPrize,
        };
      });
      
      // Sort by engagement score descending
      return engagements.sort((a, b) => b.engagementScore - a.engagementScore);
    },
    enabled: !!profile?.company_id,
  });
};

// Hook to get engagement summary stats
export const useEngagementStats = () => {
  const { data: engagements, isLoading } = useCustomerEngagement();
  
  const stats = {
    total: engagements?.length || 0,
    vip: engagements?.filter(e => e.level === 'vip').length || 0,
    hot: engagements?.filter(e => e.level === 'hot').length || 0,
    warm: engagements?.filter(e => e.level === 'warm').length || 0,
    cold: engagements?.filter(e => e.level === 'cold').length || 0,
    inactive: engagements?.filter(e => e.isInactive).length || 0,
    withPrize: engagements?.filter(e => e.hasUnredeemedPrize).length || 0,
    avgEngagement: engagements && engagements.length > 0
      ? Math.round(engagements.reduce((sum, e) => sum + e.engagementScore, 0) / engagements.length)
      : 0,
  };
  
  return { stats, isLoading };
};

// Hook to get customers by segment
export const useCustomersBySegment = (segment: 'vip' | 'inactive' | 'high_ticket' | 'low_ticket' | 'frequent' | 'with_prize') => {
  const { data: engagements } = useCustomerEngagement();
  
  if (!engagements) return [];
  
  switch (segment) {
    case 'vip':
      return engagements.filter(e => e.isVip);
    case 'inactive':
      return engagements.filter(e => e.isInactive);
    case 'high_ticket':
      return engagements.filter(e => e.isHighTicket);
    case 'low_ticket':
      return engagements.filter(e => e.isLowTicket);
    case 'frequent':
      return engagements.filter(e => e.isFrequent);
    case 'with_prize':
      return engagements.filter(e => e.hasUnredeemedPrize);
    default:
      return engagements;
  }
};
