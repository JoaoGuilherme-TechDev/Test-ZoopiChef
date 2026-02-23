/**
 * PizzaIngredientsSheet - Client-facing ingredient view/removal for pizza products
 * 
 * Used across all ordering channels: Delivery, Totem, Tablet, PDV
 * Shows ingredients and allows removal before adding to cart
 * Touch-friendly design for mobile and kiosk
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check, Pizza, Trash2 } from 'lucide-react';
import { parseIngredients } from '@/hooks/useFlavors';
import { cn } from '@/lib/utils';

interface PizzaIngredientsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  composition: string | null | undefined;
  onConfirm: (removedIngredients: string[]) => void;
  primaryColor?: string;
}

export function PizzaIngredientsSheet({
  open,
  onOpenChange,
  productName,
  composition,
  onConfirm,
  primaryColor,
}: PizzaIngredientsSheetProps) {
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [originalIngredients, setOriginalIngredients] = useState<{ removable: string[]; fixed: string[] }>({ removable: [], fixed: [] });

  // Parse ingredients when sheet opens or composition changes
  useEffect(() => {
    if (open && composition) {
      const parsed = parseIngredients(composition);
      setOriginalIngredients(parsed);
      setRemovedIngredients([]);
    }
  }, [open, composition]);

  const handleIngredientToggle = (ingredient: string) => {
    setRemovedIngredients(prev => {
      if (prev.includes(ingredient)) {
        return prev.filter(i => i !== ingredient);
      }
      return [...prev, ingredient];
    });
  };

  const handleConfirm = () => {
    onConfirm(removedIngredients);
    onOpenChange(false);
  };

  const handleClose = () => {
    setRemovedIngredients([]);
    onOpenChange(false);
  };

  const hasIngredients = originalIngredients.removable.length > 0 || originalIngredients.fixed.length > 0;
  const hasChanges = removedIngredients.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] max-h-[600px] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Pizza className="w-6 h-6" style={{ color: primaryColor || 'hsl(var(--primary))' }} />
            Ingredientes - {productName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100%-140px)]">
          {!hasIngredients ? (
            <p className="text-base text-muted-foreground italic py-8 text-center">
              Este produto não possui ingredientes cadastrados.
            </p>
          ) : (
            <div className="space-y-6 pr-2">
              {originalIngredients.removable.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Toque para remover ingredientes
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {originalIngredients.removable.map((ing, i) => {
                      const isRemoved = removedIngredients.includes(ing);
                      return (
                        <Badge
                          key={i}
                          variant={isRemoved ? 'destructive' : 'secondary'}
                          className={cn(
                            "cursor-pointer text-base py-3 px-4 transition-all touch-manipulation",
                            isRemoved && "line-through opacity-75"
                          )}
                          onClick={() => handleIngredientToggle(ing)}
                        >
                          {isRemoved ? (
                            <X className="w-4 h-4 mr-2" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          {ing}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {originalIngredients.fixed.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Ingredientes fixos (não removíveis)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {originalIngredients.fixed.map((ing, i) => (
                      <Badge key={i} variant="outline" className="text-base py-3 px-4 bg-muted">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasChanges && (
                <div className="pt-4 border-t">
                  <p className="text-base text-muted-foreground mb-3 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    {removedIngredients.length} ingrediente(s) para remover
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {removedIngredients.map((ing, i) => (
                      <Badge key={i} variant="destructive" className="text-sm">
                        Sem {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="pt-4 gap-3 sm:gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1 h-14 text-lg">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1 h-14 text-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {hasChanges ? 'Confirmar' : 'OK'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
// Re-export the centralized helper for backward compatibility
export { isPizzaCategory, shouldShowIngredientRemoval } from '@/utils/pizzaCategoryHelper';
