/**
 * Pizza Ordering Modal V3
 * 
 * FLOW:
 * 1. Size selection (single select, required)
 * 2. Dough selection (if configured for this product)
 * 3. Flavor selection (multi, with ingredients removal per flavor)
 * 4. Border decision (Sem borda / Com borda)
 * 5. Border flavor (only if Com borda)
 * 6. Border type (only after border flavor is selected)
 * 7. Optional groups (optional)
 * 
 * ARCHITECTURE:
 * - ONE root state object
 * - NO useEffect writing to state
 * - All changes from explicit user actions
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pizza, ChevronRight, ChevronLeft, X, Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePizzaModalData, PIZZA_SIZES, type FlavorData, type PizzaSizeKey } from '@/hooks/usePizzaConfigV3';
import { supabase } from '@/lib/supabase-shim';

// ============================================
// TYPES
// ============================================

export interface PizzaModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  companyId: string;
  onConfirm: (result: PizzaOrderResult) => void;
}

export interface PizzaOrderResult {
  size: string;
  flavors: {
    id: string;
    name: string;
    removedIngredients: string[];
    observation?: string;
  }[];
  totalPrice: number;
  selectedBorder: { id: string; name: string; price: number } | null;
  borderTotal: number;
  selectedOptionals: {
    group_id: string;
    group_name: string;
    item_id: string;
    item_label: string;
    price: number;
  }[];
  optionalsTotal: number;
  pricing_model: 'maior' | 'media' | 'partes';
  selectedDoughType?: { id: string; name: string; price_delta: number } | null;
  selectedBorderType?: { id: string; name: string; price_delta: number } | null;
}

interface ModalState {
  size: string;
  doughTypeId: string | null;
  flavorIds: string[];
  wantsBorder: boolean | null; // null = not decided yet
  borderId: string | null;
  borderTypeId: string | null;
  optionalKeys: string[]; // "groupId:itemId"
  removedIngredients: Record<string, string[]>;
  observations: Record<string, string>;
}

type Step = 'size' | 'dough' | 'flavors' | 'border_decision' | 'border_flavor' | 'border_type' | 'optionals';

interface DoughTypeData {
  id: string;
  name: string;
  description: string | null;
  price_delta: number;
  is_default: boolean;
}

interface BorderTypeData {
  id: string;
  name: string;
  description: string | null;
  price_delta: number;
  is_default: boolean;
}

// ============================================
// HELPERS
// ============================================

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function parseIngredients(raw: string | null): { removable: string[]; fixed: string[] } {
  if (!raw) return { removable: [], fixed: [] };
  const parts = raw.split(';').map(p => p.trim());
  const removable = parts[0]?.split(',').map(i => i.trim()).filter(Boolean) || [];
  const fixed = parts.slice(1).map(p => p.trim()).filter(Boolean);
  return { removable, fixed };
}

function calcPrice(
  flavors: FlavorData[],
  size: string,
  model: 'maior' | 'media' | 'partes'
): number {
  if (flavors.length === 0) return 0;
  const prices = flavors.map(f => {
    const p = f.prices.find(pr => pr.size_name === size);
    return p?.price_full || 0;
  });
  if (model === 'maior') return Math.max(...prices);
  if (model === 'media') return prices.reduce((a, b) => a + b, 0) / prices.length;
  return prices.reduce((a, b) => a + b, 0) / flavors.length;
}

// ============================================
// STEP INDICATOR
// ============================================

function StepBar({ current, steps }: { current: Step; steps: { key: Step; label: string }[] }) {
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center justify-center gap-1 mb-4 px-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
            i <= idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {i + 1}
          </div>
          <span className={cn('text-xs ml-1 hidden sm:inline', i <= idx ? 'text-foreground' : 'text-muted-foreground')}>
            {s.label}
          </span>
          {i < steps.length - 1 && <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ============================================
// INGREDIENT SHEET
// ============================================

function IngredientSheet({
  open,
  onClose,
  flavorName,
  ingredientsRaw,
  removed,
  onToggle,
  obs,
  onObsChange,
}: {
  open: boolean;
  onClose: () => void;
  flavorName: string;
  ingredientsRaw: string | null;
  removed: string[];
  onToggle: (ing: string) => void;
  obs: string;
  onObsChange: (v: string) => void;
}) {
  const parsed = useMemo(() => parseIngredients(ingredientsRaw), [ingredientsRaw]);

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pizza className="w-5 h-5 text-primary" />
            {flavorName}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          {parsed.removable.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-muted-foreground uppercase">Toque para remover</p>
              <div className="flex flex-wrap gap-2">
                {parsed.removable.map((ing, i) => {
                  const isRemoved = removed.includes(ing);
                  return (
                    <Badge
                      key={i}
                      variant={isRemoved ? 'destructive' : 'secondary'}
                      className={cn('cursor-pointer text-sm py-2 px-3', isRemoved && 'line-through opacity-75')}
                      onClick={() => onToggle(ing)}
                    >
                      {isRemoved ? <X className="w-3 h-3 mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      {ing}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {parsed.fixed.length > 0 && (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-muted-foreground uppercase">Ingredientes fixos</p>
              <div className="flex flex-wrap gap-2">
                {parsed.fixed.map((ing, i) => (
                  <Badge key={i} variant="outline" className="text-sm py-2 px-3 bg-muted">{ing}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observação
            </p>
            <Textarea
              placeholder="Ex: sem cebola, bem passada..."
              value={obs}
              onChange={e => onObsChange(e.target.value)}
              rows={3}
            />
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4">
          <Button onClick={onClose} className="w-full h-12">OK</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// HOOKS FOR DOUGH & BORDER TYPES
// ============================================

function useProductDoughTypes(productId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['pizza-modal-dough-types', productId],
    enabled: enabled && !!productId,
    staleTime: 30000,
    queryFn: async (): Promise<DoughTypeData[]> => {
      // Get linked dough type IDs for this product
      const { data: links } = await supabase
        .from('product_pizza_dough_types')
        .select('dough_type_id')
        .eq('product_id', productId!);

      const ids = (links || []).map(l => l.dough_type_id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('pizza_dough_types')
        .select('id, name, description, price_delta, is_default, is_active')
        .in('id', ids)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        price_delta: Number(d.price_delta) || 0,
        is_default: d.is_default ?? false,
      }));
    },
  });
}

function useProductBorderTypes(productId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['pizza-modal-border-types', productId],
    enabled: enabled && !!productId,
    staleTime: 30000,
    queryFn: async (): Promise<BorderTypeData[]> => {
      const { data: links } = await supabase
        .from('product_pizza_border_types')
        .select('border_type_id')
        .eq('product_id', productId!);

      const ids = (links || []).map(l => l.border_type_id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('pizza_border_types')
        .select('id, name, description, price_delta, is_default, is_active')
        .in('id', ids)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        price_delta: Number(b.price_delta) || 0,
        is_default: b.is_default ?? false,
      }));
    },
  });
}

// ============================================
// MAIN MODAL
// ============================================

export function PizzaModalV3({ open, onClose, productId, productName, companyId, onConfirm }: PizzaModalProps) {
  // Fetch data only when open
  const { data, isLoading } = usePizzaModalData(productId, companyId, open);
  const { data: doughTypes = [] } = useProductDoughTypes(productId, open);
  const { data: borderTypes = [] } = useProductBorderTypes(productId, open);

  // Single state object - never auto-reset except on close
  const [state, setState] = useState<ModalState>({
    size: '',
    doughTypeId: null,
    flavorIds: [],
    wantsBorder: null,
    borderId: null,
    borderTypeId: null,
    optionalKeys: [],
    removedIngredients: {},
    observations: {},
  });

  const [step, setStep] = useState<Step>('size');
  const [ingredientSheet, setIngredientSheet] = useState<string | null>(null);

  // Close handler resets everything
  const handleClose = useCallback(() => {
    setState({
      size: '',
      doughTypeId: null,
      flavorIds: [],
      wantsBorder: null,
      borderId: null,
      borderTypeId: null,
      optionalKeys: [],
      removedIngredients: {},
      observations: {},
    });
    setStep('size');
    setIngredientSheet(null);
    onClose();
  }, [onClose]);

  // Computed values
  const allowedSizes = data?.config?.allowed_sizes || [];
  const maxFlavors = useMemo(() => {
    if (!data?.config || !state.size) return 1;
    return data.config.max_flavors_per_size[state.size] || 1;
  }, [data?.config, state.size]);

  const hasDoughStep = doughTypes.length > 0;
  const hasBorders = (data?.borders?.length || 0) > 0;
  const hasBorderTypes = borderTypes.length > 0;
  const hasOptionals = (data?.optionals?.length || 0) > 0;

  // Build dynamic steps list
  const steps = useMemo(() => {
    const arr: { key: Step; label: string }[] = [
      { key: 'size', label: 'Tamanho' },
    ];
    if (hasDoughStep) arr.push({ key: 'dough', label: 'Massa' });
    arr.push({ key: 'flavors', label: 'Sabores' });
    if (hasBorders) {
      arr.push({ key: 'border_decision', label: 'Borda' });
      // border_flavor and border_type are conditional sub-steps
      // They appear only if wantsBorder === true
      if (state.wantsBorder === true) {
        arr.push({ key: 'border_flavor', label: 'Sabor Borda' });
        if (hasBorderTypes && state.borderId) {
          arr.push({ key: 'border_type', label: 'Tipo Borda' });
        }
      }
    }
    if (hasOptionals) arr.push({ key: 'optionals', label: 'Adicionais' });
    return arr;
  }, [hasDoughStep, hasBorders, hasBorderTypes, hasOptionals, state.wantsBorder, state.borderId]);

  // Handlers
  const selectSize = useCallback((s: string) => {
    setState(prev => ({ ...prev, size: s }));
  }, []);

  const selectDoughType = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, doughTypeId: id }));
  }, []);

  const toggleFlavor = useCallback((id: string) => {
    setState(prev => {
      if (prev.flavorIds.includes(id)) {
        const newRemoved = { ...prev.removedIngredients };
        delete newRemoved[id];
        const newObs = { ...prev.observations };
        delete newObs[id];
        return { ...prev, flavorIds: prev.flavorIds.filter(f => f !== id), removedIngredients: newRemoved, observations: newObs };
      }
      const max = data?.config?.max_flavors_per_size[prev.size] || 1;
      if (prev.flavorIds.length < max) {
        return { ...prev, flavorIds: [...prev.flavorIds, id] };
      }
      return prev;
    });
  }, [data?.config]);

  const setWantsBorder = useCallback((wants: boolean) => {
    setState(prev => ({
      ...prev,
      wantsBorder: wants,
      // Reset border selections when changing decision
      borderId: wants ? prev.borderId : null,
      borderTypeId: wants ? prev.borderTypeId : null,
    }));
  }, []);

  const selectBorder = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, borderId: id, borderTypeId: null }));
  }, []);

  const selectBorderType = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, borderTypeId: id }));
  }, []);

  const toggleOptional = useCallback((groupId: string, itemId: string) => {
    const key = `${groupId}:${itemId}`;
    setState(prev => ({
      ...prev,
      optionalKeys: prev.optionalKeys.includes(key)
        ? prev.optionalKeys.filter(k => k !== key)
        : [...prev.optionalKeys, key],
    }));
  }, []);

  const toggleIngredient = useCallback((flavorId: string, ing: string) => {
    setState(prev => {
      const curr = prev.removedIngredients[flavorId] || [];
      const updated = curr.includes(ing) ? curr.filter(i => i !== ing) : [...curr, ing];
      return { ...prev, removedIngredients: { ...prev.removedIngredients, [flavorId]: updated } };
    });
  }, []);

  const setObs = useCallback((flavorId: string, obs: string) => {
    setState(prev => ({
      ...prev,
      observations: { ...prev.observations, [flavorId]: obs },
    }));
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    const idx = steps.findIndex(s => s.key === step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].key);
    } else {
      doConfirm();
    }
  }, [step, steps]);

  const goPrev = useCallback(() => {
    const idx = steps.findIndex(s => s.key === step);
    if (idx > 0) setStep(steps[idx - 1].key);
  }, [step, steps]);

  // Price calculations
  const flavorPrice = useMemo(() => {
    if (!data?.config || !data?.flavors || state.flavorIds.length === 0) return 0;
    const selected = data.flavors.filter(f => state.flavorIds.includes(f.id));
    return calcPrice(selected, state.size, data.config.pricing_model);
  }, [data, state.flavorIds, state.size]);

  const borderPrice = useMemo(() => {
    if (!state.borderId || !data?.borders) return 0;
    return data.borders.find(b => b.id === state.borderId)?.price || 0;
  }, [data?.borders, state.borderId]);

  const doughDelta = useMemo(() => {
    if (!state.doughTypeId) return 0;
    return doughTypes.find(d => d.id === state.doughTypeId)?.price_delta || 0;
  }, [doughTypes, state.doughTypeId]);

  const borderTypeDelta = useMemo(() => {
    if (!state.borderTypeId) return 0;
    return borderTypes.find(b => b.id === state.borderTypeId)?.price_delta || 0;
  }, [borderTypes, state.borderTypeId]);

  const optionalsPrice = useMemo(() => {
    if (!data?.optionals) return 0;
    let total = 0;
    for (const key of state.optionalKeys) {
      const [gid, iid] = key.split(':');
      const group = data.optionals.find(g => g.id === gid);
      const item = group?.items.find(i => i.id === iid);
      if (item) total += item.price;
    }
    return total;
  }, [data?.optionals, state.optionalKeys]);

  const totalPrice = flavorPrice + borderPrice + doughDelta + borderTypeDelta + optionalsPrice;

  // Confirm
  const doConfirm = useCallback(() => {
    if (!data?.config || !data?.flavors) return;

    const selectedFlavors = data.flavors
      .filter(f => state.flavorIds.includes(f.id))
      .map(f => ({
        id: f.id,
        name: f.name,
        removedIngredients: state.removedIngredients[f.id] || [],
        observation: state.observations[f.id],
      }));

    const border = state.borderId ? data.borders?.find(b => b.id === state.borderId) : null;

    const optionals: PizzaOrderResult['selectedOptionals'] = [];
    for (const key of state.optionalKeys) {
      const [gid, iid] = key.split(':');
      const group = data.optionals?.find(g => g.id === gid);
      const item = group?.items.find(i => i.id === iid);
      if (group && item) {
        optionals.push({
          group_id: gid,
          group_name: group.name,
          item_id: iid,
          item_label: item.label,
          price: item.price,
        });
      }
    }

    const selectedDoughType = state.doughTypeId
      ? doughTypes.find(d => d.id === state.doughTypeId) || null
      : null;

    const selectedBorderType = state.borderTypeId
      ? borderTypes.find(b => b.id === state.borderTypeId) || null
      : null;

    onConfirm({
      size: state.size,
      flavors: selectedFlavors,
      totalPrice: flavorPrice,
      selectedBorder: border ? { id: border.id, name: border.name, price: border.price } : null,
      borderTotal: borderPrice,
      selectedOptionals: optionals,
      optionalsTotal: optionalsPrice,
      pricing_model: data.config.pricing_model,
      selectedDoughType: selectedDoughType
        ? { id: selectedDoughType.id, name: selectedDoughType.name, price_delta: selectedDoughType.price_delta }
        : null,
      selectedBorderType: selectedBorderType
        ? { id: selectedBorderType.id, name: selectedBorderType.name, price_delta: selectedBorderType.price_delta }
        : null,
    });

    handleClose();
  }, [data, state, doughTypes, borderTypes, flavorPrice, borderPrice, optionalsPrice, onConfirm, handleClose]);

  // Validation per step
  const canProceed = useMemo(() => {
    if (step === 'size') return !!state.size;
    if (step === 'dough') return true; // dough is optional (can proceed without selecting)
    if (step === 'flavors') return state.flavorIds.length > 0;
    if (step === 'border_decision') return state.wantsBorder !== null;
    if (step === 'border_flavor') return !!state.borderId;
    if (step === 'border_type') return true; // border type is optional
    return true;
  }, [step, state]);

  // Ingredient sheet flavor
  const sheetFlavor = useMemo(() => {
    if (!ingredientSheet || !data?.flavors) return null;
    return data.flavors.find(f => f.id === ingredientSheet) || null;
  }, [ingredientSheet, data?.flavors]);

  // Loading
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{productName}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // No config (strict rule: valid if at least one exists: sizes OR flavors OR borders OR optionals)
  const isValid = !!data && (
    (data.config?.allowed_sizes?.length || 0) > 0 ||
    (data.flavors?.length || 0) > 0 ||
    (data.borders?.length || 0) > 0 ||
    (data.optionals?.length || 0) > 0
  );

  if (!isValid) {
    return (
      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{productName}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Pizza sem configuração. Verifique tamanhos, sabores, bordas ou adicionais no cadastro do produto.
          </p>
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const isLastStep = steps.findIndex(s => s.key === step) === steps.length - 1;

  return (
    <>
      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="w-[90vw] max-w-[960px] min-w-0 sm:min-w-[720px] max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Pizza className="w-5 h-5 text-primary" />
              {productName}
            </DialogTitle>
            <StepBar current={step} steps={steps} />
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 p-4">
            {/* SIZE STEP */}
            {step === 'size' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione o tamanho:</p>
                <div className="grid grid-cols-2 gap-3">
                  {allowedSizes.map(s => {
                    const def = PIZZA_SIZES[s as PizzaSizeKey];
                    const isSelected = state.size === s;
                    return (
                      <div
                        key={s}
                        onClick={() => selectSize(s)}
                        className={cn(
                          'p-4 rounded-lg border cursor-pointer transition-all',
                          isSelected ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                        )}
                      >
                        <p className="font-medium">{def?.label || s}</p>
                        <p className="text-xs text-muted-foreground">
                          até {def?.maxFlavors || 1} sabor(es)
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DOUGH STEP */}
            {step === 'dough' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Escolha o tipo de massa:</p>
                {doughTypes.map(d => {
                  const isSelected = state.doughTypeId === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => selectDoughType(d.id)}
                      className={cn(
                        'flex justify-between items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{d.name}</p>
                        {d.description && (
                          <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                        )}
                        {d.is_default && (
                          <Badge variant="secondary" className="text-xs mt-1">Padrão</Badge>
                        )}
                      </div>
                      {d.price_delta > 0 && (
                        <Badge variant="outline" className="shrink-0">+{formatCurrency(d.price_delta)}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FLAVORS STEP */}
            {step === 'flavors' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Selecione até {maxFlavors} sabor(es):
                  </p>
                  <Badge variant="secondary">{state.flavorIds.length}/{maxFlavors}</Badge>
                </div>
                <div className="grid gap-2">
                  {data.flavors.map(f => {
                    const isSelected = state.flavorIds.includes(f.id);
                    const hasChanges = (state.removedIngredients[f.id]?.length || 0) > 0 || !!state.observations[f.id];
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={!isSelected && state.flavorIds.length >= maxFlavors}
                          onCheckedChange={() => toggleFlavor(f.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{f.name}</p>
                          {f.highlight_group && (
                            <Badge variant="outline" className="text-xs mt-1">{f.highlight_group}</Badge>
                          )}
                        </div>
                        {isSelected && (
                          <Button
                            variant={hasChanges ? 'default' : 'outline'}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setIngredientSheet(f.id); }}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* BORDER DECISION STEP */}
            {step === 'border_decision' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Deseja borda?</p>
                <div
                  onClick={() => setWantsBorder(false)}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-colors text-center',
                    state.wantsBorder === false ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                  )}
                >
                  <p className="font-bold text-lg">Sem borda</p>
                  <p className="text-xs text-muted-foreground mt-1">Continuar sem borda</p>
                </div>
                <div
                  onClick={() => setWantsBorder(true)}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-colors text-center',
                    state.wantsBorder === true ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                  )}
                >
                  <p className="font-bold text-lg">Com borda</p>
                  <p className="text-xs text-muted-foreground mt-1">Escolher sabor e tipo da borda</p>
                </div>
              </div>
            )}

            {/* BORDER FLAVOR STEP - only after "Com borda" */}
            {step === 'border_flavor' && data.borders && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Escolha o sabor da borda:</p>
                {data.borders.map(b => {
                  const isSelected = state.borderId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => selectBorder(b.id)}
                      className={cn(
                        'flex justify-between items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <p className="font-medium flex-1 min-w-0 truncate">{b.name}</p>
                      <Badge variant="outline" className="shrink-0">+{formatCurrency(b.price)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BORDER TYPE STEP - only after border flavor is selected */}
            {step === 'border_type' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Escolha o tipo da borda:</p>
                {borderTypes.map(bt => {
                  const isSelected = state.borderTypeId === bt.id;
                  return (
                    <div
                      key={bt.id}
                      onClick={() => selectBorderType(bt.id)}
                      className={cn(
                        'flex justify-between items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{bt.name}</p>
                        {bt.description && (
                          <p className="text-xs text-muted-foreground truncate">{bt.description}</p>
                        )}
                      </div>
                      {bt.price_delta > 0 && (
                        <Badge variant="outline" className="shrink-0">+{formatCurrency(bt.price_delta)}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* OPTIONALS STEP */}
            {step === 'optionals' && data.optionals && (
              <div className="space-y-6">
                {data.optionals.map(group => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Mín: {group.min_select}, Máx: {group.max_select}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {group.items.map(item => {
                        const key = `${group.id}:${item.id}`;
                        const isSelected = state.optionalKeys.includes(key);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleOptional(group.id, item.id)}
                            className={cn(
                              'flex justify-between items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                            )}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Checkbox checked={isSelected} className="shrink-0" />
                              <span className="text-sm truncate">{item.label}</span>
                            </div>
                            {item.price > 0 && (
                              <Badge variant="outline" className="shrink-0">+{formatCurrency(item.price)}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={step === 'size' ? handleClose : goPrev} className="flex-1">
                {step === 'size' ? 'Cancelar' : <><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</>}
              </Button>
              <Button onClick={goNext} disabled={!canProceed} className="flex-1">
                {isLastStep ? 'Confirmar' : <>Avançar <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ingredient Sheet */}
      {sheetFlavor && (
        <IngredientSheet
          open={!!ingredientSheet}
          onClose={() => setIngredientSheet(null)}
          flavorName={sheetFlavor.name}
          ingredientsRaw={sheetFlavor.ingredients_raw}
          removed={state.removedIngredients[sheetFlavor.id] || []}
          onToggle={(ing) => toggleIngredient(sheetFlavor.id, ing)}
          obs={state.observations[sheetFlavor.id] || ''}
          onObsChange={(v) => setObs(sheetFlavor.id, v)}
        />
      )}
    </>
  );
}
