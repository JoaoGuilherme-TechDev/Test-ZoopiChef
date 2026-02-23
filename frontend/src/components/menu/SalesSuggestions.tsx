import { useMemo } from 'react';
import { Sparkles, RefreshCw, Coffee, Plus, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart, CartItem } from '@/contexts/CartContext';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface SalesSuggestion {
  id: string;
  type: 'repeat_order' | 'add_drink' | 'add_extra' | 'vip_upgrade';
  title: string;
  description: string;
  icon: typeof Sparkles;
  product?: Product;
  products?: Product[];
  isVip?: boolean;
}

interface SalesSuggestionsProps {
  allProducts: Product[];
  customerPhone?: string | null;
  lastOrderItems?: CartItem[];
  isVipCustomer?: boolean;
  onAddProduct: (product: Product) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Keywords that indicate drink products
const DRINK_KEYWORDS = ['refrigerante', 'suco', 'água', 'cerveja', 'coca', 'guaraná', 'bebida', 'drink', 'chá', 'café', 'milk', 'shake'];

// Keywords that indicate add-ons/extras
const ADDON_KEYWORDS = ['adicional', 'extra', 'porção', 'acompanhamento', 'batata', 'fritas', 'onion', 'molho', 'sobremesa', 'doce'];

export function SalesSuggestions({
  allProducts,
  customerPhone,
  lastOrderItems = [],
  isVipCustomer = false,
  onAddProduct,
}: SalesSuggestionsProps) {
  const { items, totalPrice } = useCart();

  const suggestions = useMemo(() => {
    const result: SalesSuggestion[] = [];

    // Identify drink and addon products
    const drinkProducts = allProducts.filter(p => 
      DRINK_KEYWORDS.some(keyword => p.name.toLowerCase().includes(keyword))
    );
    
    const addonProducts = allProducts.filter(p => 
      ADDON_KEYWORDS.some(keyword => p.name.toLowerCase().includes(keyword))
    );

    // Check if cart has drinks
    const hasDrink = items.some(item => 
      DRINK_KEYWORDS.some(keyword => item.name.toLowerCase().includes(keyword))
    );

    // 1) Repeat order for returning customer
    if (customerPhone && lastOrderItems.length > 0 && items.length === 0) {
      const repeatProducts = lastOrderItems.slice(0, 3);
      result.push({
        id: 'repeat-order',
        type: 'repeat_order',
        title: isVipCustomer ? '👑 Repetir seu pedido favorito?' : 'Repetir último pedido?',
        description: isVipCustomer 
          ? `Cliente especial! Que tal pedir novamente: ${repeatProducts.map(p => p.name).join(', ')}?`
          : `Você pediu: ${repeatProducts.map(p => p.name).join(', ')}`,
        icon: RefreshCw,
        products: repeatProducts,
        isVip: isVipCustomer,
      });
    }

    // 2) Suggest drink if no drink in cart
    if (items.length > 0 && !hasDrink && drinkProducts.length > 0) {
      const cheapestDrink = drinkProducts.sort((a, b) => a.price - b.price)[0];
      result.push({
        id: 'add-drink',
        type: 'add_drink',
        title: isVipCustomer ? '👑 Uma bebida para acompanhar?' : 'Que tal uma bebida?',
        description: isVipCustomer
          ? `Complemente seu pedido com ${cheapestDrink.name} por apenas ${formatCurrency(cheapestDrink.price)}`
          : `Adicione ${cheapestDrink.name} por ${formatCurrency(cheapestDrink.price)}`,
        icon: Coffee,
        product: cheapestDrink,
        isVip: isVipCustomer,
      });
    }

    // 3) Suggest addon for low ticket
    const avgTicket = 35; // Assumed average ticket
    if (items.length > 0 && totalPrice < avgTicket && addonProducts.length > 0) {
      const suggestedAddon = addonProducts.sort((a, b) => a.price - b.price)[0];
      result.push({
        id: 'add-extra',
        type: 'add_extra',
        title: isVipCustomer ? '👑 Um extra especial?' : 'Adicione um extra!',
        description: isVipCustomer
          ? `Exclusivo para você: ${suggestedAddon.name} por ${formatCurrency(suggestedAddon.price)}`
          : `Leve também: ${suggestedAddon.name} por ${formatCurrency(suggestedAddon.price)}`,
        icon: Plus,
        product: suggestedAddon,
        isVip: isVipCustomer,
      });
    }

    // 4) VIP upgrade suggestion
    if (isVipCustomer && items.length > 0) {
      const currentProductIds = items.map(i => i.id);
      const premiumProducts = allProducts
        .filter(p => !currentProductIds.includes(p.id) && p.price > avgTicket)
        .slice(0, 1);

      if (premiumProducts.length > 0) {
        result.push({
          id: 'vip-upgrade',
          type: 'vip_upgrade',
          title: '👑 Upgrade VIP disponível!',
          description: `Como cliente especial, experimente: ${premiumProducts[0].name}`,
          icon: Crown,
          product: premiumProducts[0],
          isVip: true,
        });
      }
    }

    return result.slice(0, 3); // Max 3 suggestions
  }, [allProducts, items, totalPrice, customerPhone, lastOrderItems, isVipCustomer]);

  if (suggestions.length === 0) return null;

  const handleAddSuggestion = (suggestion: SalesSuggestion) => {
    if (suggestion.products) {
      suggestion.products.forEach(product => onAddProduct(product));
    } else if (suggestion.product) {
      onAddProduct(suggestion.product);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Sugestões para você</span>
      </div>

      <div className="grid gap-2">
        {suggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            className={`p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${
              suggestion.isVip 
                ? 'border-primary/50 bg-primary/5' 
                : 'border-border/50'
            }`}
            onClick={() => handleAddSuggestion(suggestion)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                suggestion.isVip 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <suggestion.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${suggestion.isVip ? 'text-primary' : 'text-foreground'}`}>
                  {suggestion.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.description}
                </p>
              </div>
              <Button size="sm" variant={suggestion.isVip ? 'default' : 'outline'} className="shrink-0">
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
