/**
 * useKioskCustomer - Hook for customer identification and analysis in kiosk
 * 
 * Features:
 * - Customer lookup by phone
 * - Order history analysis
 * - Favorite products detection
 * - Available discounts/rewards
 * - Smart product recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

// Dietary info for customer
export interface KioskCustomerDietaryInfo {
  hasGlutenIntolerance: boolean;
  hasLactoseIntolerance: boolean;
  dietaryRestrictions: string[];
  allergyNotes: string | null;
}

export interface KioskCustomerData {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  averageTicket: number;
  favoriteProducts: FavoriteProduct[];
  availableDiscount: AvailableDiscount | null;
  isVIP: boolean;
  memberSince: string;
  // Dietary restrictions
  dietaryInfo: KioskCustomerDietaryInfo;
}

export interface FavoriteProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  timesOrdered: number;
  lastOrdered: string;
}

export interface AvailableDiscount {
  type: 'percentage' | 'fixed_value' | 'free_item';
  value: number;
  prizeName: string;
  rewardId: string;
  expiresAt: string | null;
}

export interface ProductRecommendation {
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  reason: 'favorite' | 'frequently_together' | 'popular' | 'new';
  reasonText: string;
}

/**
 * Look up customer by phone number
 */
export function useKioskCustomerLookup(phone: string | null, companyId: string | null) {
  return useQuery({
    queryKey: ['kiosk-customer-lookup', phone, companyId],
    queryFn: async () => {
      if (!phone || !companyId) return null;
      
      // Normalize phone (remove formatting)
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length < 10) return null;

      // First, find the customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .or(`phone.ilike.%${normalizedPhone}%,whatsapp.ilike.%${normalizedPhone}%`)
        .limit(1)
        .maybeSingle();

      if (customerError || !customer) {
        return null;
      }

      // Get order history for this customer
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, created_at, order_items(product_id, product_name, quantity)')
        .eq('company_id', companyId)
        .eq('customer_phone', customer.phone)
        .order('created_at', { ascending: false })
        .limit(50);

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const totalSpent = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const averageTicket = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders?.[0]?.created_at || null;

      // Analyze favorite products
      const productCounts: Record<string, { 
        name: string; 
        count: number; 
        lastOrdered: string;
        productId: string;
      }> = {};

      orders?.forEach(order => {
        const items = order.order_items as any[];
        if (!Array.isArray(items)) return;
        
        items.forEach((item: any) => {
          if (!item.product_id) return;
          const key = item.product_id;
          if (!productCounts[key]) {
            productCounts[key] = {
              name: item.product_name || 'Produto',
              count: 0,
              lastOrdered: order.created_at,
              productId: item.product_id,
            };
          }
          productCounts[key].count += item.quantity || 1;
        });
      });

      // Get top 5 favorite products with their current data
      const topProductIds = Object.entries(productCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id]) => id);

      let favoriteProducts: FavoriteProduct[] = [];
      if (topProductIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, image_url')
          .in('id', topProductIds)
          .eq('active', true)
          .eq('aparece_totem', true);

        favoriteProducts = (products || []).map(p => ({
          productId: p.id,
          productName: p.name,
          productImage: p.image_url,
          price: p.price,
          timesOrdered: productCounts[p.id]?.count || 0,
          lastOrdered: productCounts[p.id]?.lastOrdered || '',
        })).sort((a, b) => b.timesOrdered - a.timesOrdered);
      }

      // Check for available rewards (pending)
      let availableDiscount: AvailableDiscount | null = null;
      const { data: pendingReward } = await supabase
        .from('customer_rewards')
        .select('id, reward_type, reward_value, prize_name, expires_at, status')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingReward) {
        availableDiscount = {
          type: (pendingReward.reward_type as 'percentage' | 'fixed_value' | 'free_item') || 'percentage',
          value: pendingReward.reward_value || 10,
          prizeName: pendingReward.prize_name || 'Desconto',
          rewardId: pendingReward.id,
          expiresAt: pendingReward.expires_at,
        };
      }

      // Determine VIP status (more than 10 orders or spent more than R$500)
      const isVIP = totalOrders >= 10 || totalSpent >= 500;

      // Build dietary info from customer data
      const dietaryInfo: KioskCustomerDietaryInfo = {
        hasGlutenIntolerance: customer.has_gluten_intolerance || false,
        hasLactoseIntolerance: customer.has_lactose_intolerance || false,
        dietaryRestrictions: Array.isArray(customer.dietary_restrictions) 
          ? customer.dietary_restrictions 
          : [],
        allergyNotes: customer.allergy_notes || null,
      };

      const result: KioskCustomerData = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email,
        totalOrders,
        totalSpent,
        lastOrderDate,
        averageTicket,
        favoriteProducts,
        availableDiscount,
        isVIP,
        memberSince: customer.created_at,
        dietaryInfo,
      };

      return result;
    },
    enabled: !!phone && !!companyId && phone.replace(/\D/g, '').length >= 10,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Get smart product recommendations based on customer history and cart
 */
export function useKioskRecommendations(
  companyId: string | null,
  customerId: string | null,
  cartProductIds: string[]
) {
  return useQuery({
    queryKey: ['kiosk-recommendations', companyId, customerId, cartProductIds.join(',')],
    queryFn: async () => {
      if (!companyId) return [];

      const recommendations: ProductRecommendation[] = [];

      // Get popular products
      const { data: popularProducts } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('aparece_totem', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Add popular products as recommendations (excluding cart items)
      popularProducts?.forEach(p => {
        if (!cartProductIds.includes(p.id) && recommendations.length < 4) {
          recommendations.push({
            productId: p.id,
            productName: p.name,
            productImage: p.image_url,
            price: p.price,
            reason: 'popular',
            reasonText: 'Muito pedido!',
          });
        }
      });

      return recommendations;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

/**
 * Get greeting message based on customer data
 */
export function getCustomerGreeting(customer: KioskCustomerData | null, timeOfDay: 'morning' | 'afternoon' | 'evening'): string {
  const greetings = {
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    evening: 'Boa noite',
  };

  const greeting = greetings[timeOfDay];

  if (!customer) {
    return `${greeting}! Seja bem-vindo!`;
  }

  const firstName = customer.name.split(' ')[0];

  if (customer.isVIP) {
    return `${greeting}, ${firstName}! 🌟 Que bom ter você de volta, cliente VIP!`;
  }

  if (customer.totalOrders > 0) {
    return `${greeting}, ${firstName}! Que bom ver você novamente!`;
  }

  return `${greeting}, ${firstName}! Seja bem-vindo!`;
}

/**
 * Get AI suggestion message based on context
 */
export function getAISuggestionMessage(
  customer: KioskCustomerData | null,
  cartProductIds: string[],
  favoriteProducts: FavoriteProduct[]
): string | null {
  if (!customer) return null;

  // If cart is empty and has favorites, suggest them
  if (cartProductIds.length === 0 && favoriteProducts.length > 0) {
    const topFavorite = favoriteProducts[0];
    return `Vi que você costuma pedir "${topFavorite.productName}". Quer adicionar ao pedido?`;
  }

  // If has discount available
  if (customer.availableDiscount) {
    const discountText = customer.availableDiscount.type === 'percentage' 
      ? `${customer.availableDiscount.value}% de desconto`
      : `R$ ${customer.availableDiscount.value.toFixed(2)} de desconto`;
    return `🎉 Você tem ${discountText} disponível! Será aplicado automaticamente.`;
  }

  // VIP message
  if (customer.isVIP && cartProductIds.length === 0) {
    return `Como cliente VIP, você tem acesso a ofertas exclusivas. Confira nossos destaques!`;
  }

  return null;
}
