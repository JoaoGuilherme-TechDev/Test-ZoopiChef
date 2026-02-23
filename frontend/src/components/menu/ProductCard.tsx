import { useState, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { PublicProductOptionalsDialog } from './PublicProductOptionalsDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PizzaConfiguratorDialog } from './PizzaConfiguratorDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { ProductPriceDisplay } from './ProductPriceDisplay';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    product_type?: string | null;
    has_flavors?: boolean;
    has_pizza_config?: boolean;
    is_on_sale?: boolean;
    sale_price?: number | null;
    min_optional_price?: number | null;
    // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
    subcategory?: {
      id?: string;
      name?: string;
      category?: {
        id?: string;
        name?: string | null;
      } | null;
    } | null;
  };
  variant?: 'compact' | 'large';
  companyId?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ProductCard({ product, variant = 'compact', companyId }: ProductCardProps) {
  const { items, addItem, addPizzaItem, updateQuantity, removeItem } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);

  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);
  const cartItems = items.filter(item => item.id === product.id);
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];

  const handleAdd = useCallback(async () => {
    // PIZZA RULE: Pizzas ALWAYS open the pizza configurator - NEVER the optionals modal
    // The pizza flow handles optionals internally as step 5
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // For non-pizza products, check for optionals
    if (companyId) {
      const hasOptionals = await checkProduct(product.id);
      if (hasOptionals) {
        setOptionalsOpen(true);
        return;
      }
    }

    addItem(product);
    trackingService.trackAddToCart({ ...product, quantity: 1 });
  }, [isPizza, product, companyId, checkProduct, addItem]);

  const handleConfirmOptionals = (
    selectedOptions: any[],
    totalPrice: number,
    _optionalsDescription: string
  ) => {
    // Pass selectedOptions structured - notes should only be for customer observations
    addItem(
      { id: product.id, name: product.name, price: product.price },
      selectedOptions
    );
    trackingService.trackAddToCart({ ...product, price: totalPrice, quantity: 1 });
  };

  const handleConfirmPizza = (selection: any) => {
    const pricingModel = selection?.pricing_model as any;

    addPizzaItem({
      id: product.id,
      name: product.name,
      price: Number(selection.totalPrice) || 0,
      size: selection.size,
      parts_count: selection.flavors?.length || 1,
      pricing_model: pricingModel,
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

    trackingService.trackAddToCart({ ...product, price: selection.totalPrice, quantity: 1 });
    setPizzaOpen(false);
  };

  const handleIncrement = async () => {
    // PIZZA RULE: Pizzas ALWAYS open the pizza configurator - NEVER the optionals modal
    // Each pizza addition requires full configuration (size, flavors, border, etc.)
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // For non-pizza products, check for optionals
    if (companyId) {
      const hasOptionals = await checkProduct(product.id);
      if (hasOptionals) {
        setOptionalsOpen(true);
        return;
      }
    }

    if (firstCartItem) {
      updateQuantity(firstCartItem.cartItemId, quantity + 1);
      trackingService.trackAddToCart({ ...product, quantity: 1 });
    } else {
      addItem(product);
      trackingService.trackAddToCart({ ...product, quantity: 1 });
    }
  };

  const handleDecrement = () => {
    if (firstCartItem) {
      if (firstCartItem.quantity > 1) {
        updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
      } else {
        removeItem(firstCartItem.cartItemId);
      }
    }
  };

  if (variant === 'large') {
    return (
      <>
        <Card
          className={cn(
            "cursor-pointer transition-all touch-manipulation",
            quantity > 0
              ? "ring-2 ring-primary shadow-lg"
              : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <CardContent className="p-6 flex flex-col justify-between h-full min-h-[160px]">
            <h3 className="text-xl font-semibold text-foreground leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center justify-between mt-4">
              <ProductPriceDisplay 
                product={product} 
                variant="bold"
              />
              {quantity > 0 ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 text-lg"
                    onClick={handleDecrement}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <span className="text-2xl font-bold w-10 text-center">{quantity}</span>
                  <Button
                    size="icon"
                    className="h-12 w-12 text-lg"
                    onClick={handleIncrement}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="h-12 px-6 text-lg"
                  onClick={handleAdd}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {companyId && (
          <>
            <PublicProductOptionalsDialog
              open={optionalsOpen}
              onOpenChange={setOptionalsOpen}
              product={product}
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
        )}
      </>
    );
  }

  // Compact variant for delivery/qrcode
  return (
    <>
      <div className="flex justify-between items-center py-3">
        <div className="flex-1">
          <h4 className="font-medium text-foreground">{product.name}</h4>
          <ProductPriceDisplay product={product} />
        </div>
        <div className="flex items-center gap-2 ml-4">
          {quantity > 0 ? (
            <>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={handleDecrement}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-bold w-6 text-center">{quantity}</span>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={handleIncrement}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {companyId && (
        <>
          <PublicProductOptionalsDialog
            open={optionalsOpen}
            onOpenChange={setOptionalsOpen}
            product={product}
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
      )}
    </>
  );
}
