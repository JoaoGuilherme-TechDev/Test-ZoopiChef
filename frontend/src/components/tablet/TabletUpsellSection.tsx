/**
 * TabletUpsellSection - Suggests complementary products when adding to cart
 * Similar to competitor's "acompanhamento" suggestions
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Plus } from 'lucide-react';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface UpsellProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
}

interface TabletUpsellSectionProps {
  companyId: string;
  primaryColor: string;
  cartItems: CartItem[];
  onAddProduct: (product: UpsellProduct) => void;
}

// Keywords that indicate complementary products
const UPSELL_KEYWORDS = [
  'acompanhamento', 'guarnição', 'extra', 'adicional', 'porção',
  'bebida', 'refrigerante', 'suco', 'água',
  'sobremesa', 'doce', 'sorvete',
  'batata', 'fritas', 'onion', 'molho'
];

export function TabletUpsellSection({
  companyId,
  primaryColor,
  cartItems,
  onAddProduct,
}: TabletUpsellSectionProps) {
  // Fetch potential upsell products
  const { data: upsellProducts = [] } = useQuery({
    queryKey: ['tablet-upsell-products', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, image_url, price')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('aparece_tablet', true)
        .order('name');

      if (error) throw error;
      return (data || []) as UpsellProduct[];
    },
    enabled: !!companyId,
  });

  // Filter to show only complementary products not already in cart
  const suggestions = useMemo(() => {
    const cartProductIds = cartItems.map(item => item.product_id);
    
    // Find products that match upsell keywords and are not in cart
    const complementary = upsellProducts.filter(product => {
      // Skip if already in cart
      if (cartProductIds.includes(product.id)) return false;
      
      // Check if product name matches upsell keywords
      const name = product.name.toLowerCase();
      return UPSELL_KEYWORDS.some(keyword => name.includes(keyword));
    });

    // Sort by price (suggest cheaper items first) and limit to 4
    return complementary
      .sort((a, b) => a.price - b.price)
      .slice(0, 4);
  }, [upsellProducts, cartItems]);

  if (suggestions.length === 0) return null;

  const formatPrice = (value: number) => {
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
        <span>Que tal adicionar?</span>
      </div>

      <ScrollArea className="max-h-[180px]">
        <div className="grid grid-cols-2 gap-2">
          {suggestions.map((product) => (
            <Card
              key={product.id}
              className="p-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] overflow-hidden"
              onClick={() => onAddProduct(product)}
            >
              <div className="flex items-center gap-2">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs line-clamp-2">{product.name}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>
                    {formatPrice(product.price)}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 flex-shrink-0"
                  style={{ color: primaryColor }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
