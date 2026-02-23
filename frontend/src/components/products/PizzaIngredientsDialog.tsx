import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check, Pizza, Trash2 } from 'lucide-react';
import { parseIngredients } from '@/hooks/useFlavors';

interface PizzaIngredientsDialogProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  composition: string | null | undefined;
  onSave?: (updatedComposition: string) => void;
}

export function PizzaIngredientsDialog({
  open,
  onClose,
  productName,
  composition,
  onSave,
}: PizzaIngredientsDialogProps) {
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [originalIngredients, setOriginalIngredients] = useState<{ removable: string[]; fixed: string[] }>({ removable: [], fixed: [] });

  // Parse ingredients when dialog opens or composition changes
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

  const handleSave = () => {
    if (!onSave) {
      onClose();
      return;
    }

    // Rebuild composition string without removed ingredients
    const remainingRemovable = originalIngredients.removable.filter(
      ing => !removedIngredients.includes(ing)
    );
    
    // Reconstruct composition: removable (comma-separated) + fixed (semicolon-separated)
    let newComposition = remainingRemovable.join(', ');
    if (originalIngredients.fixed.length > 0) {
      newComposition += '; ' + originalIngredients.fixed.join('; ');
    }

    onSave(newComposition);
    onClose();
  };

  const handleClose = () => {
    setRemovedIngredients([]);
    onClose();
  };

  const hasIngredients = originalIngredients.removable.length > 0 || originalIngredients.fixed.length > 0;
  const hasChanges = removedIngredients.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pizza className="w-5 h-5 text-orange-500" />
            Ingredientes - {productName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!hasIngredients ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              Este produto não possui ingredientes cadastrados na composição.
            </p>
          ) : (
            <div className="space-y-4">
              {originalIngredients.removable.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Ingredientes (clique para remover)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {originalIngredients.removable.map((ing, i) => {
                      const isRemoved = removedIngredients.includes(ing);
                      return (
                        <Badge
                          key={i}
                          variant={isRemoved ? 'destructive' : 'secondary'}
                          className="cursor-pointer text-sm py-2 px-3 transition-all"
                          onClick={() => handleIngredientToggle(ing)}
                        >
                          {isRemoved ? (
                            <X className="w-3 h-3 mr-1" />
                          ) : (
                            <Check className="w-3 h-3 mr-1" />
                          )}
                          {ing}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {originalIngredients.fixed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Ingredientes fixos (não removíveis)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {originalIngredients.fixed.map((ing, i) => (
                      <Badge key={i} variant="outline" className="text-sm py-2 px-3 bg-muted">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {hasChanges && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    {removedIngredients.length} ingrediente(s) marcado(s) para remoção
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {removedIngredients.map((ing, i) => (
                      <Badge key={i} variant="destructive" className="text-xs">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          {onSave && hasIngredients && (
            <Button onClick={handleSave} disabled={!hasChanges}>
              Salvar Alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
