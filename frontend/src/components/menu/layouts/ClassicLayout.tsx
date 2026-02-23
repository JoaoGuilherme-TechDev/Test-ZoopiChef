import { useState, useCallback } from 'react';
import { MenuCategory, MenuProduct } from '@/hooks/useMenuByToken';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Package, Plus, Minus, Pizza } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { PublicProductOptionalsDialog } from '../PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '../PizzaConfiguratorDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { toast } from 'sonner';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ClassicProductItemProps {
  product: MenuProduct;
  companyId: string;
}

function ClassicProductItem({ product, companyId }: ClassicProductItemProps) {
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
      <div className={cn(
        'flex gap-3 p-3 border-b border-border last:border-b-0 transition-all',
        qty > 0 && 'bg-primary/5'
      )}>
        {/* Image */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isPizza ? (
                <Pizza className="w-6 h-6 text-orange-500/50" />
              ) : (
                <Package className="w-6 h-6 text-muted-foreground/30" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h4 className="font-medium text-foreground line-clamp-1">{product.name}</h4>
                {isPizza && <Pizza className="w-4 h-4 text-orange-500 shrink-0" />}
              </div>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
              )}
            </div>
            
            {product.is_on_sale && (
              <Badge variant="destructive" className="shrink-0 text-xs">Promo</Badge>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {product.is_on_sale && product.sale_price ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                  <span className="font-bold text-destructive">{formatCurrency(product.sale_price)}</span>
                </>
              ) : Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0 ? (
                <span className="font-bold text-foreground">A partir de {formatCurrency(product.min_optional_price)}</span>
              ) : Number(product.price) === 0 ? (
                <span className="font-bold text-foreground">Escolha uma opção</span>
              ) : (
                <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
              )}
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
              <Button size="sm" variant="outline" onClick={() => void handleAdd()}>
                <Plus className="h-3 w-3 mr-1" />
                {isPizza ? 'Escolher' : 'Adicionar'}
              </Button>
            )}
          </div>
        </div>
      </div>

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

interface ClassicLayoutProps {
  categories: MenuCategory[];
  companyId?: string;
}

export function ClassicLayout({ categories, companyId }: ClassicLayoutProps) {
  return (
    <Accordion type="multiple" defaultValue={categories.map(c => c.id)} className="space-y-3">
      {categories.map((category) => (
        <AccordionItem 
          key={category.id} 
          value={category.id} 
          className="border border-[hsla(265,90%,62%,0.2)] rounded-xl overflow-hidden bg-card/50 backdrop-blur shadow-[0_0_4px_hsla(265,90%,62%,0.2),0_4px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-[hsla(265,90%,62%,0.35)] hover:shadow-[0_0_8px_hsla(265,90%,62%,0.3),0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/5">
            <div className="flex items-center gap-3">
              {category.image_url && (
                <img 
                  src={category.image_url} 
                  alt={category.name}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              )}
              <span className="text-lg font-bold text-gradient-primary">{category.name}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            {category.subcategories.map((subcategory) => (
              <div key={subcategory.id}>
                {category.subcategories.length > 1 && (
                  <div className="px-4 py-2 bg-muted/30 border-y border-border flex items-center gap-2">
                    {subcategory.image_url && (
                      <img 
                        src={subcategory.image_url} 
                        alt={subcategory.name}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <h3 className="text-sm font-medium text-muted-foreground">{subcategory.name}</h3>
                  </div>
                )}
                <div>
                  {subcategory.products.map((product) => (
                    <ClassicProductItem key={product.id} product={product} companyId={companyId || ''} />
                  ))}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}