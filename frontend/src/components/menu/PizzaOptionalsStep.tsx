import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pizza } from 'lucide-react';
import type { OptionalCalcMode } from '@/hooks/useProductOptions';
import type { PizzaSelectedOptional, PizzaSelectedFlavor } from '@/contexts/CartContext';
import { formatCalcModeLabel, calculatePizzaOptionals } from '@/lib/pizza/calculatePizzaOptionals';

export interface OptionGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  type: 'single' | 'multiple';
  calc_mode: OptionalCalcMode;
  items: Array<{
    id: string;
    label: string;
    price_delta: number;
  }>;
}

interface PizzaOptionalsStepProps {
  groups: OptionGroup[];
  selectedFlavors: PizzaSelectedFlavor[];
  partsCount: number;
  onConfirm: (selectedOptionals: PizzaSelectedOptional[], optionalsTotal: number) => void;
  onBack: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PizzaOptionalsStep({
  groups,
  selectedFlavors,
  partsCount,
  onConfirm,
  onBack,
}: PizzaOptionalsStepProps) {
  const [selectedOptionals, setSelectedOptionals] = useState<PizzaSelectedOptional[]>([]);
  const [flavorScopeDialog, setFlavorScopeDialog] = useState<{
    open: boolean;
    group: OptionGroup | null;
    item: { id: string; label: string; price_delta: number } | null;
  }>({ open: false, group: null, item: null });

  // Track if we've already auto-confirmed for empty groups (prevents infinite loop)
  const hasAutoConfirmedRef = useRef(false);

  // Handle empty groups case via useEffect (NOT during render)
  useEffect(() => {
    if (groups.length === 0 && !hasAutoConfirmedRef.current) {
      hasAutoConfirmedRef.current = true;
      // Schedule the callback for after the current render cycle
      const timeoutId = setTimeout(() => {
        onConfirm([], 0);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [groups.length, onConfirm]);

  // Build flavor names map for display
  const flavorNamesMap = selectedFlavors.reduce((acc, f) => {
    acc[f.id] = f.name;
    return acc;
  }, {} as Record<string, string>);

  // Calculate current totals
  const calculationResult = calculatePizzaOptionals(
    selectedOptionals.map(opt => ({
      group_id: opt.group_id,
      group_name: opt.group_name,
      item_id: opt.item_id,
      item_label: opt.item_label,
      price: opt.price,
      target_scope: opt.target_scope,
      calc_mode: opt.calc_mode,
    })),
    partsCount,
    flavorNamesMap
  );

  const handleToggleOptional = (group: OptionGroup, item: { id: string; label: string; price_delta: number }) => {
    const existingIndex = selectedOptionals.findIndex(
      opt => opt.group_id === group.id && opt.item_id === item.id
    );

    if (existingIndex >= 0) {
      // Remove if already selected
      setSelectedOptionals(prev => prev.filter((_, i) => i !== existingIndex));
      return;
    }

    // For per_flavor_part mode, ask which flavor to apply to
    if (group.calc_mode === 'per_flavor_part' && partsCount > 1) {
      setFlavorScopeDialog({ open: true, group, item });
      return;
    }

    // For other modes, add directly with 'whole_pizza' scope
    addOptional(group, item, 'whole_pizza');
  };

  const addOptional = (
    group: OptionGroup, 
    item: { id: string; label: string; price_delta: number },
    targetScope: 'whole_pizza' | string
  ) => {
    // Check max_select for the group
    const groupOptionals = selectedOptionals.filter(opt => opt.group_id === group.id);
    
    if (group.type === 'single' && groupOptionals.length >= 1) {
      // Replace existing for single select
      setSelectedOptionals(prev => [
        ...prev.filter(opt => opt.group_id !== group.id),
        {
          group_id: group.id,
          group_name: group.name,
          item_id: item.id,
          item_label: item.label,
          price: item.price_delta,
          target_scope: targetScope,
          calc_mode: group.calc_mode,
        },
      ]);
    } else if (groupOptionals.length < group.max_select) {
      // Add for multiple select
      setSelectedOptionals(prev => [
        ...prev,
        {
          group_id: group.id,
          group_name: group.name,
          item_id: item.id,
          item_label: item.label,
          price: item.price_delta,
          target_scope: targetScope,
          calc_mode: group.calc_mode,
        },
      ]);
    }
  };

  const handleFlavorScopeSelect = (scope: 'whole_pizza' | string) => {
    if (flavorScopeDialog.group && flavorScopeDialog.item) {
      addOptional(flavorScopeDialog.group, flavorScopeDialog.item, scope);
    }
    setFlavorScopeDialog({ open: false, group: null, item: null });
  };

  const isItemSelected = (groupId: string, itemId: string) => {
    return selectedOptionals.some(opt => opt.group_id === groupId && opt.item_id === itemId);
  };

  const getGroupSelectedCount = (groupId: string) => {
    return selectedOptionals.filter(opt => opt.group_id === groupId).length;
  };

  // Validate required groups
  const validateRequiredGroups = () => {
    for (const group of groups) {
      if (group.required) {
        const count = getGroupSelectedCount(group.id);
        if (count < group.min_select) {
          return false;
        }
      }
    }
    return true;
  };

  const handleConfirm = () => {
    onConfirm(selectedOptionals, calculationResult.total);
  };

  // Show loading/empty state while waiting for auto-confirm
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Adicionais e Opcionais</p>
        {calculationResult.total > 0 && (
          <Badge variant="secondary">
            +{formatCurrency(calculationResult.total)}
          </Badge>
        )}
      </div>

      <ScrollArea className="max-h-[50vh]">
        <div className="space-y-6 pr-4">
          {groups.map(group => {
            const selectedCount = getGroupSelectedCount(group.id);
            const isComplete = selectedCount >= group.min_select;

            return (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.required ? 'Obrigatório' : 'Opcional'} •{' '}
                      {group.min_select === group.max_select
                        ? `Escolha ${group.min_select}`
                        : `${group.min_select} a ${group.max_select}`}
                      {' '}• {formatCalcModeLabel(group.calc_mode)}
                    </p>
                  </div>
                  <Badge variant={isComplete ? 'default' : 'outline'} className="shrink-0">
                    {selectedCount}/{group.max_select}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {group.items.map(item => {
                    const isSelected = isItemSelected(group.id, item.id);
                    const canSelect = selectedCount < group.max_select || isSelected;
                    const selectedOpt = selectedOptionals.find(
                      opt => opt.group_id === group.id && opt.item_id === item.id
                    );

                    return (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        } ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => canSelect && handleToggleOptional(group, item)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Checkbox checked={isSelected} className="shrink-0" />
                            <span className="text-sm truncate">{item.label}</span>
                            {isSelected && selectedOpt?.target_scope !== 'whole_pizza' && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {flavorNamesMap[selectedOpt?.target_scope || ''] || 'Sabor'}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                            +{formatCurrency(item.price_delta)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Calculation breakdown preview */}
      {calculationResult.breakdown.length > 0 && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Resumo dos adicionais:</p>
          {calculationResult.breakdown.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {item.item_label}
                {item.applied_to !== 'Pizza inteira' && (
                  <span className="text-muted-foreground"> ({item.applied_to})</span>
                )}
              </span>
              <span className="font-medium">
                {item.calculated_price > 0 ? formatCurrency(item.calculated_price) : '-'}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t font-medium">
            <span>Total adicionais:</span>
            <span>{formatCurrency(calculationResult.total)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={!validateRequiredGroups()}
          className="flex-1"
        >
          Adicionar ao Carrinho
        </Button>
      </div>

      {/* Flavor scope selection dialog */}
      <Dialog 
        open={flavorScopeDialog.open} 
        onOpenChange={(open) => !open && setFlavorScopeDialog({ open: false, group: null, item: null })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-orange-500" />
              Aplicar em qual sabor?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O adicional "{flavorScopeDialog.item?.label}" será aplicado em:
            </p>
            
            <RadioGroup onValueChange={handleFlavorScopeSelect}>
              <div 
                className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                onClick={() => handleFlavorScopeSelect('whole_pizza')}
              >
                <RadioGroupItem value="whole_pizza" id="whole_pizza" />
                <Label htmlFor="whole_pizza" className="cursor-pointer flex-1">
                  <div className="font-medium">Pizza inteira</div>
                  <div className="text-xs text-muted-foreground">
                    Adicional aplicado em todos os sabores
                  </div>
                </Label>
              </div>
              
              {selectedFlavors.map(flavor => (
                <div 
                  key={flavor.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                  onClick={() => handleFlavorScopeSelect(flavor.id)}
                >
                  <RadioGroupItem value={flavor.id} id={flavor.id} />
                  <Label htmlFor={flavor.id} className="cursor-pointer flex-1">
                    <div className="font-medium">{flavor.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Adicional só neste sabor
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
