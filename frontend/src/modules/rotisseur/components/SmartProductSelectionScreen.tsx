import { useState, useEffect } from 'react';
import { Plus, Minus, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { MeatProduct, SelectedAccompaniment, CookingMethod, MeatOccasion } from '../types';
import { useRotisseurAI, type ComplementSuggestion } from '../hooks/useRotisseurAI';

interface SmartProductSelectionScreenProps {
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
  // AI Context
  companyId: string;
  selectedMeats: { id: string; name: string; quantity: number }[];
  numberOfPeople: number;
  occasion: MeatOccasion;
  cookingMethod: CookingMethod;
  enableAI?: boolean;
}

export function SmartProductSelectionScreen({
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
  companyId,
  selectedMeats,
  numberOfPeople,
  occasion,
  cookingMethod,
  enableAI = true,
}: SmartProductSelectionScreenProps) {
  const { 
    isLoadingComplements, 
    complementsResponse, 
    getComplementSuggestions 
  } = useRotisseurAI();

  const [hasLoadedAI, setHasLoadedAI] = useState(false);

  // Load AI suggestions on mount
  useEffect(() => {
    if (enableAI && !hasLoadedAI && selectedMeats.length > 0 && products.length > 0) {
      setHasLoadedAI(true);
      getComplementSuggestions({
        companyId,
        selectedMeats: selectedMeats.map(m => ({
          id: m.id,
          name: m.name,
          quantity_grams: m.quantity * 1000, // Convert kg to grams
        })),
        availableComplements: products,
        numberOfPeople,
        occasion,
        cookingMethod,
      });
    }
  }, [enableAI, hasLoadedAI, selectedMeats, products, companyId, numberOfPeople, occasion, cookingMethod, getComplementSuggestions]);

  // Build suggestion map for quick lookup
  const suggestionMap = new Map<string, ComplementSuggestion>();
  complementsResponse?.suggestions.forEach(s => {
    suggestionMap.set(s.product_id, s);
  });

  // Sort products: AI suggested first, then rest
  const sortedProducts = [...products].sort((a, b) => {
    const aScore = suggestionMap.get(a.id)?.confidence_score || 0;
    const bScore = suggestionMap.get(b.id)?.confidence_score || 0;
    return bScore - aScore;
  });

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/20 via-background to-background">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {/* AI Message */}
        {enableAI && complementsResponse?.message && (
          <div className="bg-accent/30 border border-accent/50 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-foreground">Sugestão do Maître</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {complementsResponse.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoadingComplements && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Analisando combinações...</span>
          </div>
        )}
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
            {sortedProducts.map((product) => {
              const qty = getSelectedQuantity(product.id);
              const isSelected = qty > 0;
              const suggestion = suggestionMap.get(product.id);
              const isAISuggested = suggestion && suggestion.confidence_score >= 30;

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "overflow-hidden transition-all",
                    isSelected && "ring-2 ring-primary",
                    isAISuggested && !isSelected && "ring-1 ring-accent/50"
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
                      
                      {/* AI Badge */}
                      {isAISuggested && (
                        <Badge 
                          className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Sugerido
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {formatCurrency(product.price)}/{product.unit || 'un'}
                      </p>

                      {/* AI Reason */}
                      {isAISuggested && suggestion?.reason && (
                        <p className="text-xs text-accent-foreground/80 mb-2 line-clamp-2">
                          {suggestion.reason}
                        </p>
                      )}

                      {/* Quantity Controls */}
                      {isSelected ? (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleRemove(product)}
                            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold">{qty}</span>
                          <button
                            onClick={() => handleAdd(product)}
                            className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAdd(product)}
                          variant={isAISuggested ? "default" : "outline"}
                          className={cn(
                            "w-full",
                            isAISuggested && "bg-accent hover:bg-accent/80 text-accent-foreground"
                          )}
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
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-md mx-auto">
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">
                {selectedItems.reduce((acc, i) => acc + i.quantity, 0)} {selectedItems.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
            {selectedItems.length > 0 ? (
              <Button
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
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
