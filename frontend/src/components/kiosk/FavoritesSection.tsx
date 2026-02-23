/**
 * FavoritesSection - Shows customer's favorite products in kiosk
 */

import { useState } from 'react';
import { Star, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { kioskActions, useKioskState } from '@/stores/kioskStore';
import { KioskCartItem } from '@/hooks/useKiosk';
import { toast } from 'sonner';

interface FavoriteProduct {
  productId: string;
  productName: string;
  productImage: string | null;
  price: number;
  timesOrdered: number;
}

interface FavoritesSectionProps {
  favorites: FavoriteProduct[];
  isLandscape?: boolean;
  onProductClick?: (productId: string) => void;
}

export function FavoritesSection({ favorites, isLandscape, onProductClick }: FavoritesSectionProps) {
  const identifiedCustomer = useKioskState(s => s.identifiedCustomer);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  if (!identifiedCustomer || favorites.length === 0) return null;

  const formatCurrency = (value: number) => {
    return (value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleQuickAdd = (product: FavoriteProduct) => {
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: product.productId,
      product_name: product.productName,
      quantity: 1,
      unit_price_cents: Math.round(product.price * 100),
      total_cents: Math.round(product.price * 100),
      image_url: product.productImage || undefined,
    };
    kioskActions.addToCart(item);
    setAddedIds(prev => [...prev, product.productId]);
    toast.success(`${product.productName} adicionado!`);
    
    // Remove from "added" state after animation
    setTimeout(() => {
      setAddedIds(prev => prev.filter(id => id !== product.productId));
    }, 2000);
  };

  const firstName = identifiedCustomer.name.split(' ')[0];

  return (
    <div className="mb-6 bg-gradient-to-r from-orange-600/20 to-orange-500/10 rounded-2xl p-4 border border-orange-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Seus Favoritos, {firstName}!
            {identifiedCustomer.isVIP && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
          </h3>
          <p className="text-sm text-gray-400">Baseado nos seus pedidos anteriores</p>
        </div>
      </div>

      <div className={cn(
        'flex gap-3 overflow-x-auto pb-2',
        isLandscape ? 'flex-nowrap' : 'flex-wrap'
      )}>
        {favorites.slice(0, isLandscape ? 5 : 4).map((product) => {
          const isAdded = addedIds.includes(product.productId);
          
          return (
            <div
              key={product.productId}
              className={cn(
                'bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 transition-all',
                'hover:ring-2 hover:ring-orange-500',
                isLandscape ? 'w-40' : 'w-36',
                isAdded && 'ring-2 ring-green-500'
              )}
            >
              {/* Product image */}
              <div 
                className="relative cursor-pointer"
                onClick={() => onProductClick?.(product.productId)}
              >
                {product.productImage ? (
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="w-full aspect-square object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                )}
                
                {/* Badge showing times ordered */}
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {product.timesOrdered}x
                </div>
              </div>

              <div className="p-3">
                <h4 className="font-medium text-white text-sm line-clamp-2 mb-1">
                  {product.productName}
                </h4>
                <p className="text-orange-500 font-bold text-sm mb-2">
                  {formatCurrency(product.price)}
                </p>
                
                <Button
                  size="sm"
                  className={cn(
                    'w-full text-xs h-8 transition-all',
                    isAdded 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-orange-600 hover:bg-orange-700'
                  )}
                  onClick={() => handleQuickAdd(product)}
                  disabled={isAdded}
                >
                  {isAdded ? (
                    <>✓ Adicionado</>
                  ) : (
                    <>
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
