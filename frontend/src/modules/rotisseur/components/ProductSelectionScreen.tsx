import { Plus, Minus, ChevronRight, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { MeatProduct, SelectedAccompaniment } from '../types';

interface ProductSelectionScreenProps {
  title: string;
  subtitle: string;
  products: MeatProduct[];
  selectedItems: SelectedAccompaniment[];
  onSelectItem: (item: SelectedAccompaniment) => void;
  onRemoveItem: (productId: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  continueLabel?: string;
  skipLabel?: string;
}

export function ProductSelectionScreen({
  title,
  subtitle,
  products,
  selectedItems,
  onSelectItem,
  onRemoveItem,
  onContinue,
  onSkip,
  onBack,
  continueLabel = 'Continuar',
  skipLabel = 'Pular',
}: ProductSelectionScreenProps) {
  const getSelectedQuantity = (productId: string): number => {
    const selected = selectedItems.find((m) => m.product.id === productId);
    return selected?.quantity || 0;
  };

  const handleAdd = (product: MeatProduct) => {
    const currentQty = getSelectedQuantity(product.id);
    onSelectItem({
      product,
      quantity: currentQty + 1,
    });
  };

  const handleRemove = (product: MeatProduct) => {
    const currentQty = getSelectedQuantity(product.id);
    if (currentQty <= 1) {
      onRemoveItem(product.id);
    } else {
      onSelectItem({
        product,
        quantity: currentQty - 1,
      });
    }
  };

  const totalValue = selectedItems.reduce((acc, m) => acc + m.product.price * m.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-red-950/30 via-background to-background">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto cadastrado</p>
            <Button
              variant="outline"
              onClick={onSkip}
              className="mt-4"
            >
              {skipLabel}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const qty = getSelectedQuantity(product.id);
              const isSelected = qty > 0;

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "overflow-hidden transition-all",
                    isSelected && "ring-2 ring-red-500"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative aspect-square bg-muted">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatCurrency(product.price)}/{product.unit || 'un'}
                      </p>

                      {/* Quantity Controls */}
                      {isSelected ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleRemove(product)}
                            className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold">{qty}</span>
                          <button
                            onClick={() => handleAdd(product)}
                            className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAdd(product)}
                          variant="outline"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-white/10 p-4 z-50">
        <div className="max-w-md mx-auto">
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">
                {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} {selectedItems.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="font-bold text-white">{formatCurrency(totalValue)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-3 text-muted-foreground hover:text-white transition-colors"
            >
              ← Voltar
            </button>
            {selectedItems.length > 0 ? (
              <Button
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500"
              >
                {continueLabel}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={onSkip}
                variant="outline"
                className="flex-1"
              >
                {skipLabel}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
