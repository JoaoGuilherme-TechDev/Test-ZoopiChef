/**
 * ProductPriceDisplay Component
 * 
 * A reusable component for displaying product prices consistently across the app.
 * Handles pizza products specially: always shows "A partir de R$ X" with lowest flavor price.
 * 
 * GLOBAL RULE: Pizza products NEVER show fixed price, always "A partir de R$ X"
 */

import { usePizzaLowestPrice } from '@/hooks/usePizzaLowestPrice';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ProductPriceDisplayProps {
  product: {
    id: string;
    price: number;
    is_on_sale?: boolean;
    sale_price?: number | null;
    min_optional_price?: number | null;
    subcategory?: {
      category?: {
        name?: string | null;
      } | null;
    } | null;
    subcategories?: {
      categories?: {
        name?: string | null;
      } | null;
    } | null;
  };
  className?: string;
  showOriginalPriceOnSale?: boolean;
  variant?: 'default' | 'compact' | 'bold';
}

export function ProductPriceDisplay({ 
  product, 
  className,
  showOriginalPriceOnSale = true,
  variant = 'default'
}: ProductPriceDisplayProps) {
  const isPizza = isPizzaCategory(product);
  
  // Only fetch pizza lowest price if this is a pizza product
  const { data: lowestPizzaPrice, isLoading: pizzaPriceLoading } = usePizzaLowestPrice(
    isPizza ? product.id : undefined,
    { enabled: isPizza }
  );

  // Determine the effective price for non-pizza products
  const effectivePrice = product.is_on_sale && product.sale_price 
    ? product.sale_price 
    : product.price;

  const baseClasses = cn(
    'font-bold',
    variant === 'compact' && 'text-sm',
    variant === 'bold' && 'text-lg',
    className
  );

  // PIZZA PRODUCTS: Always show "A partir de R$ X"
  if (isPizza) {
    // Show loading state briefly while fetching
    if (pizzaPriceLoading) {
      return (
        <span className={cn(baseClasses, 'text-primary')}>
          Carregando...
        </span>
      );
    }

    // Show "A partir de" with lowest price
    if (lowestPizzaPrice !== null && lowestPizzaPrice !== undefined && lowestPizzaPrice > 0) {
      return (
        <span className={cn(baseClasses, 'text-primary')}>
          A partir de {formatCurrency(lowestPizzaPrice)}
        </span>
      );
    }

    // Fallback if no flavors configured
    return (
      <span className={cn(baseClasses, 'text-primary')}>
        Escolha uma opção
      </span>
    );
  }

  // NON-PIZZA PRODUCTS: Regular price display logic

  // On sale with sale price
  if (product.is_on_sale && product.sale_price) {
    return (
      <div className="flex flex-col">
        {showOriginalPriceOnSale && (
          <span className="text-xs text-muted-foreground line-through">
            {formatCurrency(product.price)}
          </span>
        )}
        <span className={cn(baseClasses, 'text-destructive')}>
          {formatCurrency(product.sale_price)}
        </span>
      </div>
    );
  }

  // Price is 0 with min optional price
  if (Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0) {
    return (
      <span className={cn(baseClasses, 'text-primary')}>
        A partir de {formatCurrency(product.min_optional_price)}
      </span>
    );
  }

  // Price is 0 without min optional
  if (Number(product.price) === 0) {
    return (
      <span className={cn(baseClasses, 'text-primary')}>
        Escolha uma opção
      </span>
    );
  }

  // Regular price
  return (
    <span className={cn(baseClasses, 'text-primary')}>
      {formatCurrency(effectivePrice)}
    </span>
  );
}

/**
 * Inline version for use in text spans
 */
interface InlinePizzaPriceProps {
  productId: string;
  fallbackPrice?: number;
  className?: string;
}

export function InlinePizzaPrice({ productId, fallbackPrice, className }: InlinePizzaPriceProps) {
  const { data: lowestPrice, isLoading } = usePizzaLowestPrice(productId);

  if (isLoading) {
    return <span className={className}>Carregando...</span>;
  }

  if (lowestPrice !== null && lowestPrice !== undefined && lowestPrice > 0) {
    return (
      <span className={className}>
        A partir de {formatCurrency(lowestPrice)}
      </span>
    );
  }

  if (fallbackPrice !== undefined && fallbackPrice > 0) {
    return (
      <span className={className}>
        A partir de {formatCurrency(fallbackPrice)}
      </span>
    );
  }

  return <span className={className}>Escolha uma opção</span>;
}
