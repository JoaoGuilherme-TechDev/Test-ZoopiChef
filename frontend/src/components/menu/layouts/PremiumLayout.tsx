import { useState, useCallback } from 'react';
import { MenuCategory, MenuProduct } from '@/hooks/useMenuByToken';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Minus, Star, Pizza } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { PublicProductOptionalsDialog } from '../PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '../PizzaConfiguratorDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface PremiumProductCardProps {
  product: MenuProduct;
  featured?: boolean;
  companyId: string;
}

function PremiumProductCard({ product, featured = false, companyId }: PremiumProductCardProps) {
  const { items, addItem, addPizzaItem, updateQuantity, removeItem } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);
  
  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);
  
  const cartItems = items.filter((i) => i.id === product.id);
  const qty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];

  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const handleAdd = useCallback(async () => {
    // PIZZA RULE: Pizzas ALWAYS open the pizza configurator - NEVER the optionals modal
    // The pizza flow handles optionals internally as step 5
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // For non-pizza products, check for optionals
    const hasOptionals = await checkProduct(product.id);
    
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    addItem({ id: product.id, name: product.name, price: effectivePrice });
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  }, [product, effectivePrice, checkProduct, addItem, isPizza]);

  const handleConfirmOptionals = (
    _selectedOptionals: any[],
    totalPrice: number,
    optionalsDescription: string
  ) => {
    const itemName = optionalsDescription 
      ? `${product.name} (${optionalsDescription})`
      : product.name;

    addItem(
      { id: product.id, name: itemName, price: totalPrice },
      undefined,
      optionalsDescription
    );
    trackingService.trackAddToCart({ ...product, price: totalPrice, quantity: 1 } as any);
  };

  const handleConfirmPizza = (selection: any) => {
    addPizzaItem({
      id: product.id,
      name: product.name,
      price: Number(selection.totalPrice) || 0,
      size: selection.size,
      parts_count: selection.flavors?.length || 1,
      pricing_model: selection.pricing_model || 'maior',
      selected_flavors: (selection.flavors || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        removedIngredients: Array.isArray(f.removedIngredients) ? f.removedIngredients : [],
        observation: f.observation || undefined,
      })),
      selected_border: selection.selectedBorder || null,
      selected_optionals: (selection.selectedOptionals || []) as any,
      optionals_total: Number(selection.optionalsTotal) || 0,
      border_total: Number(selection.borderTotal) || 0,
    });

    trackingService.trackAddToCart({ ...product, price: selection.totalPrice, quantity: 1 } as any);
    setPizzaOpen(false);
  };

  const decrease = () => {
    if (firstCartItem) {
      if (firstCartItem.quantity > 1) {
        updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
      } else {
        removeItem(firstCartItem.cartItemId);
      }
    }
  };

  const increase = async () => {
    // PIZZA RULE: Pizzas ALWAYS open the pizza configurator - NEVER the optionals modal
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // For non-pizza products, check for optionals
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    if (firstCartItem) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity + 1);
    } else {
      addItem({ id: product.id, name: product.name, price: effectivePrice });
    }
  };

  return (
    <>
      <Card className={cn(
        'overflow-hidden transition-all duration-300 group',
        'border-[hsla(265,90%,62%,0.15)] hover:border-[hsla(265,90%,62%,0.4)]',
        'shadow-[0_0_4px_hsla(265,90%,62%,0.3),0_6px_20px_rgba(0,0,0,0.4)]',
        'hover:shadow-[0_0_12px_hsla(265,90%,62%,0.5),0_12px_32px_rgba(0,0,0,0.5)]',
        featured ? 'col-span-2 md:col-span-1' : '',
        qty > 0 && 'ring-2 ring-primary shadow-[0_0_20px_hsla(265,90%,62%,0.6)]'
      )}>
        <div className={cn('relative overflow-hidden bg-muted', featured ? 'aspect-[16/9]' : 'aspect-video')}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              loading="lazy" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              {isPizza ? (
                <Pizza className="w-16 h-16 text-orange-500/50" />
              ) : (
                <Package className="w-16 h-16 text-primary/30" />
              )}
            </div>
          )}
          
          {/* Overlay badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.is_featured && (
              <Badge className="bg-amber-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Destaque
              </Badge>
            )}
            {product.is_on_sale && (
              <Badge variant="destructive">Promoção</Badge>
            )}
            {isPizza && (
              <Badge className="bg-orange-500 text-white">
                <Pizza className="w-3 h-3 mr-1" />
                Pizza
              </Badge>
            )}
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          
          {/* Title over image */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h4 className="font-bold text-lg line-clamp-1">{product.name}</h4>
            {product.description && (
              <p className="text-sm text-white/80 line-clamp-1 mt-1">{product.description}</p>
            )}
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              {product.is_on_sale && product.sale_price ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                  <span className="text-xl font-bold text-destructive">{formatCurrency(product.sale_price)}</span>
                </div>
              ) : Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0 ? (
                <span className="text-xl font-bold text-primary">A partir de {formatCurrency(product.min_optional_price)}</span>
              ) : Number(product.price) === 0 ? (
                <span className="text-xl font-bold text-primary">Escolha uma opção</span>
              ) : (
                <span className="text-xl font-bold text-primary">{formatCurrency(product.price)}</span>
              )}
            </div>

            {qty > 0 ? (
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" className="h-9 w-9" onClick={decrease}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-bold text-lg w-6 text-center">{qty}</span>
                <Button size="icon" className="h-9 w-9" onClick={() => void increase()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={() => void handleAdd()} className="px-6">
                <Plus className="h-4 w-4 mr-2" />
                {isPizza ? 'Escolher' : 'Adicionar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PublicProductOptionalsDialog
        open={optionalsOpen}
        onOpenChange={setOptionalsOpen}
        product={{ id: product.id, name: product.name, price: effectivePrice }}
        companyId={companyId}
        onConfirm={handleConfirmOptionals}
      />

      <PizzaConfiguratorDialog
        open={pizzaOpen}
        onClose={() => setPizzaOpen(false)}
        companyId={companyId}
        productId={product.id}
        productName={product.name}
        onConfirm={handleConfirmPizza}
      />
    </>
  );
}

interface PremiumLayoutProps {
  categories: MenuCategory[];
  companyId?: string;
}

export function PremiumLayout({ categories, companyId }: PremiumLayoutProps) {
  return (
    <div className="space-y-10">
      {categories.map((category) => (
        <section key={category.id} className="animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsla(265,90%,62%,0.5)] to-transparent shadow-[0_0_8px_hsla(265,90%,62%,0.4)]" />
            {category.image_url && (
              <img 
                src={category.image_url} 
                alt={category.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                loading="lazy"
              />
            )}
            <h2 className="text-2xl font-bold text-center text-gradient-primary">{category.name}</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[hsla(185,90%,50%,0.5)] to-transparent shadow-[0_0_8px_hsla(185,90%,50%,0.4)]" />
          </div>
          
          {category.subcategories.map((subcategory) => (
            <div key={subcategory.id} className="mb-8">
              {category.subcategories.length > 1 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  {subcategory.image_url && (
                    <img 
                      src={subcategory.image_url} 
                      alt={subcategory.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <h3 className="text-lg font-medium text-muted-foreground text-center">{subcategory.name}</h3>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subcategory.products.map((product) => (
                  <PremiumProductCard 
                    key={product.id} 
                    product={product} 
                    featured={product.is_featured}
                    companyId={companyId || ''}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}