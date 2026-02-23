import { useState, useCallback } from 'react';
import { MenuCategory, MenuProduct } from '@/hooks/useMenuByToken';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Minus, Pizza } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { PublicProductOptionalsDialog } from '../PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '../PizzaConfiguratorDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { ProductPriceDisplay } from '../ProductPriceDisplay';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface GridProductCardProps {
  product: MenuProduct;
  companyId: string;
}

function GridProductCard({ product, companyId }: GridProductCardProps) {
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
        'overflow-hidden transition-all duration-300',
        'border-[hsla(265,90%,62%,0.15)] hover:border-[hsla(265,90%,62%,0.35)]',
        'shadow-[0_0_2px_hsla(265,90%,62%,0.3),0_4px_12px_rgba(0,0,0,0.3)]',
        'hover:shadow-[0_0_8px_hsla(265,90%,62%,0.4),0_8px_20px_rgba(0,0,0,0.4)]',
        qty > 0 && 'ring-2 ring-primary shadow-[0_0_15px_hsla(265,90%,62%,0.5)]'
      )}>
        <div className="aspect-square bg-muted overflow-hidden relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              {isPizza ? (
                <Pizza className="w-12 h-12 text-orange-500/50" />
              ) : (
                <Package className="w-12 h-12 text-primary/30" />
              )}
            </div>
          )}
          {isPizza && (
            <div className="absolute top-2 right-2">
              <Pizza className="w-5 h-5 text-orange-500" />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <div>
              <ProductPriceDisplay 
                product={product} 
                variant="compact"
              />
            </div>

            {qty > 0 ? (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={decrease}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-5 text-center">{qty}</span>
                <Button size="icon" className="h-7 w-7" onClick={() => void increase()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => void handleAdd()}>
                <Plus className="h-4 w-4 mr-1" />
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

interface GridLayoutProps {
  categories: MenuCategory[];
  companyId?: string;
}

export function GridLayout({ categories, companyId }: GridLayoutProps) {
  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <section key={category.id} className="animate-fade-in">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[hsla(265,90%,62%,0.25)]">
            {category.image_url && (
              <img 
                src={category.image_url} 
                alt={category.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
              />
            )}
            <h2 className="text-xl font-bold text-gradient-primary">{category.name}</h2>
          </div>
          {category.subcategories.map((subcategory) => (
            <div key={subcategory.id} className="mb-6">
              {category.subcategories.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  {subcategory.image_url && (
                    <img 
                      src={subcategory.image_url} 
                      alt={subcategory.name}
                      className="w-7 h-7 rounded object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  )}
                  <h3 className="text-lg font-medium text-muted-foreground">{subcategory.name}</h3>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {subcategory.products.map((product) => (
                  <GridProductCard key={product.id} product={product} companyId={companyId || ''} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}