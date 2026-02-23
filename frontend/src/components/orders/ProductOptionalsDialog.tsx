import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Check, AlertCircle, Pizza, Info, Plus, Minus } from 'lucide-react';
import { useProductOptionalGroupLinks, ProductOptionalGroupLink } from '@/hooks/useProductOptionalGroups';
import { useCompanyPizzaSettings } from '@/hooks/useCompanyPizzaSettings';

interface SelectedOptional {
  groupId: string;
  groupName: string;
  items: Array<{
    id: string;
    label: string;
    price: number;
    quantity?: number;
  }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
  };
  onConfirm: (selectedOptionals: SelectedOptional[], totalPrice: number, optionalsDescription: string) => void;
}

type CalcMode = 'sum_each_part' | 'proportional' | 'max_part_value' | 'pizza_total_split' | null;

const CALC_MODE_LABELS: Record<string, string> = {
  sum_each_part: 'Soma por parte',
  proportional: 'Proporcional',
  max_part_value: 'Pela maior',
  pizza_total_split: 'Total no item',
};

export function ProductOptionalsDialog({ open, onOpenChange, product, onConfirm }: Props) {
  const { data: linkedGroups, isLoading } = useProductOptionalGroupLinks(product.id);
  const { data: pizzaSettings } = useCompanyPizzaSettings();
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({}); // key: `${linkId}:${itemId}`
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  const noteKey = (linkId: string, itemId: string) => `${linkId}:${itemId}`;
  const qtyKey = (linkId: string, itemId: string) => `${linkId}:${itemId}`;

  const getItemQuantity = (linkId: string, itemId: string) => itemQuantities[qtyKey(linkId, itemId)] ?? 1;
  const setItemQuantity = (linkId: string, itemId: string, qty: number) => {
    const next = Math.max(1, qty);
    setItemQuantities((prev) => ({ ...prev, [qtyKey(linkId, itemId)]: next }));
  };

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelections({});
      setItemQuantities({});
      setItemNotes({});
    }
  }, [open]);

  // Detect if this product has flavor-based optional groups (pizza)
  const isPizzaProduct = useMemo(() => {
    return linkedGroups?.some(link => link.optional_group?.source_type === 'flavors');
  }, [linkedGroups]);

  // Get the calc_mode from pizza settings or from the optional group
  const getCalcMode = (link: ProductOptionalGroupLink): CalcMode => {
    // First check if optional_group has calc_mode
    if (link.optional_group?.calc_mode) {
      return link.optional_group.calc_mode as CalcMode;
    }
    // Fall back to company pizza settings pricing_model
    if (pizzaSettings?.pricing_model) {
      // Map pricing_model to calc_mode
      const modelMap: Record<string, CalcMode> = {
        'maior': 'max_part_value',
        'media': 'proportional',
        'partes': 'sum_each_part',
      };
      return modelMap[pizzaSettings.pricing_model] || 'max_part_value';
    }
    // Default to max_part_value (most common)
    return 'max_part_value';
  };

  const handleSingleSelect = (groupId: string, itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [groupId]: [itemId],
    }));

    // Clear notes for other items in this group
    setItemNotes(prev => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${groupId}:`) && k !== noteKey(groupId, itemId)) {
          delete next[k];
        }
      });
      return next;
    });
  };

  const handleMultiSelect = (groupId: string, itemId: string, checked: boolean, maxSelect: number) => {
    setSelections(prev => {
      const current = prev[groupId] || [];

      if (checked) {
        // Prevent duplicates (can happen when clicking row + checkbox)
        if (current.includes(itemId)) return prev;

        if (current.length >= maxSelect) {
          toast.warning(`Máximo de ${maxSelect} opções permitidas`);
          return prev;
        }
        return { ...prev, [groupId]: [...current, itemId] };
      }

      // When unchecking, clear quantity
      setItemQuantities((q) => {
        const copy = { ...q };
        delete copy[qtyKey(groupId, itemId)];
        return copy;
      });

      return { ...prev, [groupId]: current.filter(id => id !== itemId) };
    });
  };

  // Calculate price for a flavor group based on calc_mode
  const calculateFlavorGroupPrice = (link: ProductOptionalGroupLink): { total: number; breakdown: string } => {
    const selectedItems = selections[link.id] || [];
    if (selectedItems.length === 0) return { total: 0, breakdown: '' };

    const calcMode = getCalcMode(link);
    const items = selectedItems
      .map(itemId => link.optional_group?.items?.find(i => i.id === itemId))
      .filter(Boolean);

    if (items.length === 0) return { total: 0, breakdown: '' };

    const prices = items.map(item => item!.price_delta);
    const partsCount = items.length;
    let total = 0;
    let breakdown = '';

    switch (calcMode) {
      case 'max_part_value':
        // Charge only the highest value
        total = Math.max(...prices);
        const maxItem = items.find(i => i!.price_delta === total);
        breakdown = `Pela maior: ${formatPrice(total)}`;
        break;

      case 'sum_each_part':
        // Each flavor is divided by the number of parts, then summed
        total = prices.reduce((sum, price) => sum + (price / partsCount), 0);
        breakdown = prices.map((p, i) => `${formatPrice(p / partsCount)}`).join(' + ');
        break;

      case 'proportional':
        // Base price + proportional flavor value
        total = prices.reduce((sum, price) => sum + price, 0) / partsCount;
        breakdown = `Proporcional: ${formatPrice(total)}`;
        break;

      case 'pizza_total_split':
        // Sum all and show per-part
        total = prices.reduce((sum, p) => sum + p, 0);
        breakdown = `Total: ${formatPrice(total)}`;
        break;

      default:
        // Default: sum all prices
        total = prices.reduce((sum, p) => sum + p, 0);
        breakdown = formatPrice(total);
    }

    return { total, breakdown };
  };

  const calculateTotal = () => {
    let total = product.price;

    linkedGroups?.forEach(link => {
      if (link.optional_group?.source_type === 'flavors') {
        // Use pizza calculation logic
        const result = calculateFlavorGroupPrice(link);
        total += result.total;
      } else {
        // Regular optional groups: each item selected * quantity * price
        const selectedItems = selections[link.id] || [];
        selectedItems.forEach(itemId => {
          const item = link.optional_group?.items?.find(i => i.id === itemId);
          if (item) {
            const qty = getItemQuantity(link.id, itemId);
            total += item.price_delta * qty;
          }
        });
      }
    });

    return total;
  };

  const validateSelections = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    linkedGroups?.forEach(link => {
      const selectedCount = new Set(selections[link.id] || []).size;
      const minSelect = link.min_select || 0;
      const maxSelect = link.max_select || 999;

      if (selectedCount < minSelect) {
        errors.push(`${link.optional_group?.name}: selecione pelo menos ${minSelect} ${minSelect === 1 ? 'sabor' : 'sabores'}`);
      }
      if (selectedCount > maxSelect) {
        errors.push(`${link.optional_group?.name}: máximo de ${maxSelect} ${maxSelect === 1 ? 'sabor' : 'sabores'}`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleConfirm = () => {
    const validation = validateSelections();
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    const selectedOptionals: SelectedOptional[] = [];
    const descriptions: string[] = [];

    linkedGroups?.forEach(link => {
      const group = link.optional_group;
      if (!group) return;

      const selectedIds = Array.from(new Set(selections[link.id] || []));
      if (selectedIds.length === 0) return;

      const itemsRaw = selectedIds
        .map(itemId => group.items?.find(i => i.id === itemId))
        .filter(Boolean);

      if (itemsRaw.length === 0) return;

      const isFlavors = group.source_type === 'flavors';

      const items = itemsRaw.map((item) => {
        const note = itemNotes[noteKey(link.id, item!.id)]?.trim();
        const label = note ? `${item!.label} (${note})` : item!.label;
        const qty = isFlavors ? 1 : getItemQuantity(link.id, item!.id);

        return {
          id: item!.id,
          label,
          price: item!.price_delta * qty,
          quantity: qty,
        };
      });

      selectedOptionals.push({
        groupId: group.id,
        groupName: group.name,
        items,
      });

      if (isFlavors) {
        const fraction = itemsRaw.length === 2 ? '1/2' : itemsRaw.length === 3 ? '1/3' : `1/${itemsRaw.length}`;
        const flavorNames = itemsRaw
          .map((i) => {
            const n = itemNotes[noteKey(link.id, i!.id)]?.trim();
            return `${fraction} ${i!.label}${n ? ` (${n})` : ''}`;
          })
          .join(', ');
        descriptions.push(flavorNames);
      } else {
        const itemLabels = items
          .map((i) => (i.quantity && i.quantity > 1 ? `${i.quantity}x ${i.label}` : i.label))
          .join(', ');
        descriptions.push(`${group.name}: ${itemLabels}`);
      }
    });

    const optionalsDescription = descriptions.join(' | ');
    const totalPrice = calculateTotal();

    onConfirm(selectedOptionals, totalPrice, optionalsDescription);
    onOpenChange(false);
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If no optional groups linked, don't show dialog
  if (!linkedGroups || linkedGroups.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPizzaProduct && <Pizza className="h-5 w-5 text-primary" />}
            {product.name}
          </DialogTitle>
          <DialogDescription>
            {isPizzaProduct 
              ? 'Escolha os sabores da sua pizza'
              : 'Personalize seu pedido selecionando as opções abaixo'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {linkedGroups.map((link) => {
              const group = link.optional_group;
              if (!group || !group.items?.length) return null;

              const activeItems = group.items.filter(i => i.active !== false);
              const selectedCount = new Set(selections[link.id] || []).size;
              const isRequired = link.min_select > 0;
              const isSingleSelect = link.max_select === 1;
              const isFlavors = group.source_type === 'flavors';
              const calcMode = getCalcMode(link);

              // For pizza products, show calc mode info
              const calcModeLabel = isFlavors && calcMode ? CALC_MODE_LABELS[calcMode] : null;

              return (
                <div key={link.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-base font-semibold block truncate">{group.name}</Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span>{isRequired ? 'Obrigatório' : 'Opcional'}</span>
                        {link.max_select > 1 && <span>• Até {link.max_select} {isFlavors ? 'sabores' : 'opções'}</span>}
                        {calcModeLabel && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                            <Info className="w-2 h-2 mr-0.5" />
                            {calcModeLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isRequired && selectedCount === 0 && (
                      <Badge variant="outline" className="text-destructive border-destructive shrink-0">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Obrigatório
                      </Badge>
                    )}
                    {selectedCount > 0 && (
                      <Badge variant="secondary" className="shrink-0">
                        <Check className="w-3 h-3 mr-1" />
                        {selectedCount} {isFlavors ? 'sabor(es)' : 'selecionado(s)'}
                      </Badge>
                    )}
                  </div>

                  {isSingleSelect ? (
                    <RadioGroup
                      value={selections[link.id]?.[0] || ''}
                      onValueChange={(value) => handleSingleSelect(link.id, value)}
                    >
                      {activeItems.map((item) => {
                        const isChecked = (selections[link.id] || []).includes(item.id);
                        const qty = getItemQuantity(link.id, item.id);

                        return (
                          <div key={item.id} className="space-y-2">
                            <div
                              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleSingleSelect(link.id, item.id)}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={item.id} id={`opt-${item.id}`} />
                                <Label htmlFor={`opt-${item.id}`} className="cursor-pointer font-normal">
                                  {item.label}
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Permitir quantidade em seleção única (ex: bebidas) */}
                                {isChecked && !isFlavors && (
                                  <div className="flex items-center gap-1 mr-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemQuantity(link.id, item.id, qty - 1);
                                      }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">{qty}</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemQuantity(link.id, item.id, qty + 1);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}

                                {item.price_delta > 0 && (
                                  <span className="text-sm text-primary font-medium">
                                    {formatPrice(item.price_delta * (isChecked && !isFlavors ? qty : 1))}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isFlavors && isChecked && (
                              <Textarea
                                value={itemNotes[noteKey(link.id, item.id)] || ''}
                                onChange={(e) => setItemNotes(prev => ({ ...prev, [noteKey(link.id, item.id)]: e.target.value }))}
                                placeholder="Observação deste sabor (ex: sem cebola)"
                                className="min-h-[72px]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {activeItems.map((item) => {
                        const isChecked = (selections[link.id] || []).includes(item.id);
                        const qty = getItemQuantity(link.id, item.id);

                        return (
                          <div key={item.id} className="space-y-2">
                            <div
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isChecked ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`opt-${item.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleMultiSelect(link.id, item.id, !!checked, link.max_select)}
                                />
                                <Label htmlFor={`opt-${item.id}`} className="cursor-pointer font-normal">
                                  {item.label}
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                {isChecked && !isFlavors && (
                                  <div className="flex items-center gap-1 mr-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemQuantity(link.id, item.id, qty - 1);
                                      }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">{qty}</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setItemQuantity(link.id, item.id, qty + 1);
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}

                                {item.price_delta > 0 && (
                                  <span className="text-sm text-primary font-medium">
                                    {formatPrice(item.price_delta * (isChecked && !isFlavors ? qty : 1))}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isFlavors && isChecked && (
                              <Textarea
                                value={itemNotes[noteKey(link.id, item.id)] || ''}
                                onChange={(e) => setItemNotes(prev => ({ ...prev, [noteKey(link.id, item.id)]: e.target.value }))}
                                placeholder="Observação deste sabor (ex: sem cebola)"
                                className="min-h-[72px]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Show calculation breakdown for pizza flavors */}
                  {isFlavors && selectedCount > 0 && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {selectedCount} sabores ({calcModeLabel}):
                        </span>
                        <span className="font-medium text-primary">
                          {formatPrice(calculateFlavorGroupPrice(link).total)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Separator />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-left">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">{formatPrice(calculateTotal())}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>
              Adicionar ao Pedido
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}