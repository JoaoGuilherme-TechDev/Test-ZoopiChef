import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface CartButtonProps {
  variant?: 'floating' | 'inline';
  size?: 'default' | 'large';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CartButton({ variant = 'floating', size = 'default' }: CartButtonProps) {
  const { totalItems, totalPrice, setIsOpen } = useCart();

  if (totalItems === 0 && variant === 'floating') {
    return null;
  }

  if (variant === 'inline') {
    return (
      <Button
        variant="outline"
        size={size === 'large' ? 'lg' : 'default'}
        className={cn(
          "relative",
          size === 'large' && "h-14 px-6 text-lg"
        )}
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart className={cn("mr-2", size === 'large' ? "h-6 w-6" : "h-4 w-4")} />
        <span>Carrinho</span>
        {totalItems > 0 && (
          <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-sm font-bold">
            {totalItems}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-lg",
        size === 'large' 
          ? "h-16 px-6 text-lg gap-3 rounded-full" 
          : "h-14 px-5 gap-2 rounded-full"
      )}
      onClick={() => setIsOpen(true)}
    >
      <ShoppingCart className={size === 'large' ? "h-6 w-6" : "h-5 w-5"} />
      <span className="font-bold">{totalItems}</span>
      <span className="text-primary-foreground/80">|</span>
      <span>{formatCurrency(totalPrice)}</span>
    </Button>
  );
}
