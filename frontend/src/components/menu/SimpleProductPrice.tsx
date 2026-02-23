/**
 * Simple Price Display for Pizza Products
 * 
 * A lightweight component for displaying pizza prices inline.
 * Always shows "A partir de R$ X" for pizzas.
 */

import { usePizzaLowestPrice } from '@/hooks/usePizzaLowestPrice';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface SimpleProductPriceProps {
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
}

/**
 * Hook to get formatted price text for a product.
 * Handles pizza detection and lowest price fetching.
 */
export function useProductPriceText(product: SimpleProductPriceProps['product']) {
  const isPizza = isPizzaCategory(product);
  
  const { data: lowestPizzaPrice, isLoading } = usePizzaLowestPrice(
    isPizza ? product.id : undefined,
    { enabled: isPizza }
  );

  if (isPizza) {
    if (isLoading) return { text: 'Carregando...', isLoading: true };
    if (lowestPizzaPrice !== null && lowestPizzaPrice !== undefined && lowestPizzaPrice > 0) {
      return { text: `A partir de ${formatCurrency(lowestPizzaPrice)}`, isLoading: false };
    }
    return { text: 'Escolha uma opção', isLoading: false };
  }

  // Non-pizza logic
  if (product.is_on_sale && product.sale_price) {
    return { 
      text: formatCurrency(product.sale_price), 
      originalPrice: formatCurrency(product.price),
      isOnSale: true,
      isLoading: false 
    };
  }

  if (Number(product.price) === 0) {
    if (product.min_optional_price && product.min_optional_price > 0) {
      return { text: `A partir de ${formatCurrency(product.min_optional_price)}`, isLoading: false };
    }
    return { text: 'Escolha uma opção', isLoading: false };
  }

  return { text: formatCurrency(product.price), isLoading: false };
}

/**
 * Simple component that returns just the price text span.
 */
export function SimpleProductPrice({ product, className }: SimpleProductPriceProps) {
  const { text, isLoading, isOnSale, originalPrice } = useProductPriceText(product) as any;

  if (isOnSale && originalPrice) {
    return (
      <>
        <span className={`text-xs text-muted-foreground line-through mr-1`}>{originalPrice}</span>
        <span className={`font-bold text-destructive ${className}`}>{text}</span>
      </>
    );
  }

  return <span className={className}>{text}</span>;
}
