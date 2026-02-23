/**
 * TabletProductDetailDialog - Modal showing product details with image, description, and optionals
 * Similar to competitor's detailed product view
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Minus, ShoppingCart, Sparkles, AlertCircle, Check, Loader2 } from 'lucide-react';
import { usePublicProductOptionalGroupLinks, PublicProductOptionalGroupLink } from '@/hooks/usePublicProductOptionalGroups';
import { toast } from 'sonner';

interface SelectedOption {
  group_id: string;
  group_name: string;
  items: { id: string; label: string; price_delta: number; quantity: number }[];
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number | null;
}

interface TabletProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  companyId: string;
  primaryColor: string;
  onAddToCart: (product: Product, quantity: number, selectedOptions?: SelectedOption[], totalPrice?: number) => void;
}

export function TabletProductDetailDialog({
  open,
  onOpenChange,
  product,
  companyId,
  primaryColor,
  onAddToCart,
}: TabletProductDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // Fetch product optionals using the public hook
  const { data: linkedGroups = [], isLoading } = usePublicProductOptionalGroupLinks(
    open ? product?.id : undefined,
    companyId
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelections({});
    }
  }, [open]);

  const hasOptionals = linkedGroups.length > 0;

  const handleSingleSelect = (linkId: string, itemId: string) => {
    setSelections(prev => ({
      ...prev,
      [linkId]: [itemId],
    }));
  };

  const handleMultiSelect = (linkId: string, itemId: string, checked: boolean, maxSelect: number) => {
    setSelections(prev => {
      const current = prev[linkId] || [];

      if (checked) {
        if (current.includes(itemId)) return prev;
        if (current.length >= maxSelect) {
          toast.warning(`Máximo de ${maxSelect} opções permitidas`);
          return prev;
        }
        return { ...prev, [linkId]: [...current, itemId] };
      }

      return { ...prev, [linkId]: current.filter(id => id !== itemId) };
    });
  };

  const calculateTotal = () => {
    if (!product) return 0;
    
    const basePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
    let optionalsTotal = 0;

    linkedGroups.forEach(link => {
      const selectedItems = selections[link.id] || [];
      selectedItems.forEach(itemId => {
        const item = link.optional_group?.items?.find(i => i.id === itemId);
        if (item) {
          optionalsTotal += item.price_delta;
        }
      });
    });

    return (basePrice + optionalsTotal) * quantity;
  };

  const validateSelections = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    linkedGroups.forEach(link => {
      const selectedCount = (selections[link.id] || []).length;
      const minSelect = link.min_select || 0;

      if (selectedCount < minSelect) {
        errors.push(`${link.optional_group?.name}: selecione pelo menos ${minSelect} opção`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleConfirm = () => {
    if (!product) return;

    if (hasOptionals) {
      const validation = validateSelections();
      if (!validation.valid) {
        toast.error(validation.errors[0]);
        return;
      }
    }

    // Build selected options
    const selectedOptions: SelectedOption[] = [];
    linkedGroups.forEach(link => {
      const group = link.optional_group;
      if (!group) return;

      const selectedIds = selections[link.id] || [];
      if (selectedIds.length === 0) return;

      const items = selectedIds
        .map(itemId => group.items?.find(i => i.id === itemId))
        .filter(Boolean)
        .map(item => ({
          id: item!.id,
          label: item!.label,
          price_delta: item!.price_delta,
          quantity: 1,
        }));

      if (items.length > 0) {
        selectedOptions.push({
          group_id: group.id,
          group_name: group.name,
          items,
        });
      }
    });

    const totalPrice = calculateTotal();
    onAddToCart(product, quantity, selectedOptions.length > 0 ? selectedOptions : undefined, totalPrice);
    onOpenChange(false);
  };

  const formatPrice = (value: number) => {
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  if (!product) return null;

  const basePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
  const totalPrice = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        {/* Product Image */}
        {product.image_url ? (
          <div className="relative h-56 w-full">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.is_on_sale && product.sale_price && (
              <Badge variant="destructive" className="absolute top-4 right-4 text-sm px-3 py-1">
                Promoção
              </Badge>
            )}
          </div>
        ) : (
          <div className="h-32 w-full bg-muted flex items-center justify-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        <div className="p-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
          </DialogHeader>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 mt-3">
            {product.is_on_sale && product.sale_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="text-xl font-bold" style={{ color: primaryColor }}>
              {formatPrice(basePrice)}
            </span>
          </div>

          <Separator className="my-4" />

          {/* Optionals */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : hasOptionals ? (
            <ScrollArea className="max-h-[200px] pr-2">
              <div className="space-y-4">
                {linkedGroups.map(link => {
                  const group = link.optional_group;
                  if (!group || !group.items?.length) return null;

                  const activeItems = group.items.filter(i => i.active !== false);
                  const selectedCount = (selections[link.id] || []).length;
                  const isRequired = link.min_select > 0;
                  const isSingleSelect = link.max_select === 1;

                  return (
                    <div key={link.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-semibold block truncate">{group.name}</Label>
                          <div className="text-xs text-muted-foreground">
                            {isRequired ? 'Obrigatório' : 'Opcional'}
                            {link.max_select > 1 && ` • Até ${link.max_select} opções`}
                          </div>
                        </div>
                        {isRequired && selectedCount === 0 && (
                          <Badge variant="outline" className="text-destructive border-destructive text-xs shrink-0">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Obrigatório
                          </Badge>
                        )}
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Check className="w-3 h-3 mr-1" />
                            {selectedCount}
                          </Badge>
                        )}
                      </div>

                      {isSingleSelect ? (
                        <RadioGroup
                          value={selections[link.id]?.[0] || ''}
                          onValueChange={(value) => handleSingleSelect(link.id, value)}
                        >
                          {activeItems.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleSingleSelect(link.id, item.id)}
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value={item.id} id={`tablet-${item.id}`} />
                                <Label htmlFor={`tablet-${item.id}`} className="cursor-pointer text-sm">
                                  {item.label}
                                </Label>
                              </div>
                              <span className="text-sm text-primary font-medium">
                                {item.price_delta > 0 ? `+ ${formatPrice(item.price_delta)}` : formatPrice(item.price_delta)}
                              </span>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-1">
                          {activeItems.map(item => {
                            const isSelected = (selections[link.id] || []).includes(item.id);
                            return (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                }`}
                                onClick={() => handleMultiSelect(link.id, item.id, !isSelected, link.max_select)}
                              >
                                <div className="flex items-center gap-2">
                                  <Checkbox checked={isSelected} />
                                  <Label className="cursor-pointer text-sm">{item.label}</Label>
                                </div>
                                <span className="text-sm text-primary font-medium">
                                  {item.price_delta > 0 ? `+ ${formatPrice(item.price_delta)}` : formatPrice(item.price_delta)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : null}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mt-4">
            <span className="font-medium">Quantidade</span>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button
            className="w-full h-12 text-base"
            style={{ backgroundColor: primaryColor }}
            onClick={handleConfirm}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Adicionar {formatPrice(totalPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
