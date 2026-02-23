/**
 * PromotionsTicker - Horizontal scrolling promotions bar with add-to-cart buttons
 * 
 * Displays active promotions in a ticker format for kiosk/totem.
 * Each promotion has a button to add directly to cart or open configurator.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { kioskActions, KioskCartItem } from '@/stores/kioskStore';
import { cn } from '@/lib/utils';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import type { SelectedOption } from '@/contexts/CartContext';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  buy_quantity: number | null;
  pay_quantity: number | null;
  discount_type: string | null;
  discount_value: number | null;
  start_time: string | null;
  end_time: string | null;
  product_ids: string[] | null;
  category_ids: string[] | null;
  banner_image_url: string | null;
  highlight_color: string;
  applies_to_totem: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  product_type: string | null;
  // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
  subcategory?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface PromotionsTickerProps {
  companyId: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  height?: number;
}

function getPromoText(promo: Promotion): string {
  switch (promo.promotion_type) {
    case 'buy_x_pay_y':
      return `COMPRE ${promo.buy_quantity} PAGUE ${promo.pay_quantity}`;
    case 'buy_x_pay_quantity':
      return `LEVE ${promo.buy_quantity} PAGUE ${promo.pay_quantity}`;
    case 'happy_hour':
      const discountText = promo.discount_type === 'percentage' 
        ? `${promo.discount_value}% OFF`
        : promo.discount_type === 'fixed_value'
        ? `R$ ${promo.discount_value} OFF`
        : `POR R$ ${promo.discount_value}`;
      return `HAPPY HOUR ${discountText}`;
    case 'quantity_tiers':
      return 'DESCONTO POR QUANTIDADE';
    default:
      return promo.name;
  }
}

export function PromotionsTicker({ 
  companyId, 
  primaryColor = '#ea580c',
  accentColor = '#ea580c',
  textColor = '#ffffff',
  height = 60
}: PromotionsTickerProps) {
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsProduct, setOptionalsProduct] = useState<Product | null>(null);
  
  // Fetch active promotions for totem
  const { data: promotions = [] } = useQuery({
    queryKey: ['kiosk-promotions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);
      
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('applies_to_totem', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`);
      
      if (error) throw error;
      
      // Filter by time for happy hour
      return (data || []).filter((promo: Promotion) => {
        if (promo.promotion_type === 'happy_hour' && promo.start_time && promo.end_time) {
          return currentTime >= promo.start_time && currentTime <= promo.end_time;
        }
        return true;
      }) as Promotion[];
    },
    enabled: !!companyId,
    staleTime: 60 * 1000,
  });
  
  // Fetch first product from each promotion's product list
  const { data: promoProducts = {} } = useQuery({
    queryKey: ['kiosk-promo-products', companyId, promotions.map(p => p.id).join(',')],
    queryFn: async () => {
      const productIds = promotions
        .filter(p => p.product_ids && p.product_ids.length > 0)
        .flatMap(p => p.product_ids!)
        .filter((id, i, arr) => arr.indexOf(id) === i); // unique
      
      if (productIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, image_url, product_type,
          subcategory:subcategories(
            id, name,
            category:categories(id, name)
          )
        `)
        .in('id', productIds)
        .eq('active', true);
      
      if (error) throw error;
      
      const map: Record<string, Product> = {};
      (data || []).forEach(p => {
        map[p.id] = p as Product;
      });
      return map;
    },
    enabled: !!companyId && promotions.length > 0,
  });
  
  const handleAddPromotion = async (promo: Promotion) => {
    // If promotion has specific products, add the first one
    if (promo.product_ids && promo.product_ids.length > 0) {
      const productId = promo.product_ids[0];
      const product = promoProducts[productId];
      
      if (product) {
        // STRICT: Only category name === "Pizza" enables pizza behavior
        if (isPizzaCategory(product)) {
          // For pizza, we'd need to open configurator - for now just notify
          kioskActions.touchActivity();
          return;
        }
        
        const hasOptionals = await checkProduct(product.id);
        if (hasOptionals) {
          setOptionalsProduct(product);
          return;
        }
        
        // Apply discount if applicable
        let price = product.price;
        if (promo.discount_type === 'percentage' && promo.discount_value) {
          price = price * (1 - promo.discount_value / 100);
        } else if (promo.discount_type === 'fixed_value' && promo.discount_value) {
          price = Math.max(0, price - promo.discount_value);
        } else if (promo.discount_type === 'fixed_price' && promo.discount_value) {
          price = promo.discount_value;
        }
        
        // Add to cart
        const item: KioskCartItem = {
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price_cents: Math.round(price * 100),
          total_cents: Math.round(price * 100),
          image_url: product.image_url || undefined,
          notes: `Promoção: ${promo.name}`,
        };
        kioskActions.addToCart(item);
      }
    }
  };
  
  const handleOptionalsConfirm = (selectedOptions: SelectedOption[], totalPrice: number, description: string) => {
    if (!optionalsProduct) return;
    
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: optionalsProduct.id,
      product_name: optionalsProduct.name,
      quantity: 1,
      unit_price_cents: Math.round(totalPrice * 100),
      total_cents: Math.round(totalPrice * 100),
      image_url: optionalsProduct.image_url || undefined,
      notes: description,
    };
    kioskActions.addToCart(item);
    setOptionalsProduct(null);
  };
  
  if (promotions.length === 0) return null;
  
  return (
    <>
      <div 
        className="w-full overflow-hidden shrink-0"
        style={{ 
          height: `${height}px`,
          background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
        }}
      >
        <div className="h-full flex items-center px-4">
          <div className="flex items-center gap-2 mr-6 shrink-0">
            <Sparkles className="w-5 h-5" style={{ color: textColor }} />
            <span className="font-bold text-sm" style={{ color: textColor }}>
              OFERTAS
            </span>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div 
              className={cn(
                'flex items-center gap-4',
                promotions.length > 2 && 'animate-marquee'
              )}
            >
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {promo.banner_image_url && (
                    <img 
                      src={promo.banner_image_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold text-sm" style={{ color: textColor }}>
                      {promo.name}
                    </p>
                    <p className="text-xs opacity-80" style={{ color: textColor }}>
                      {getPromoText(promo)}
                    </p>
                  </div>
                  
                  {promo.product_ids && promo.product_ids.length > 0 && (
                    <Button
                      size="sm"
                      className="ml-2 h-8 px-3 gap-1"
                      style={{ 
                        backgroundColor: textColor,
                        color: primaryColor,
                      }}
                      onClick={() => handleAddPromotion(promo)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  )}
                </div>
              ))}
              
              {/* Duplicate for continuous scroll effect */}
              {promotions.length > 2 && promotions.map((promo) => (
                <div
                  key={`dup-${promo.id}`}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg shrink-0"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {promo.banner_image_url && (
                    <img 
                      src={promo.banner_image_url} 
                      alt="" 
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="font-bold text-sm" style={{ color: textColor }}>
                      {promo.name}
                    </p>
                    <p className="text-xs opacity-80" style={{ color: textColor }}>
                      {getPromoText(promo)}
                    </p>
                  </div>
                  
                  {promo.product_ids && promo.product_ids.length > 0 && (
                    <Button
                      size="sm"
                      className="ml-2 h-8 px-3 gap-1"
                      style={{ 
                        backgroundColor: textColor,
                        color: primaryColor,
                      }}
                      onClick={() => handleAddPromotion(promo)}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Optionals Dialog */}
      {optionalsProduct && (
        <PublicProductOptionalsDialog
          open={!!optionalsProduct}
          onOpenChange={(open) => !open && setOptionalsProduct(null)}
          product={{ id: optionalsProduct.id, name: optionalsProduct.name, price: optionalsProduct.price } as any}
          companyId={companyId}
          onConfirm={handleOptionalsConfirm}
        />
      )}
    </>
  );
}
