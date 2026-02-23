import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseIngredients, calculatePizzaPrice } from '@/hooks/useFlavors';
import { X, Check, Pizza, UtensilsCrossed, Trash2, ChevronRight, ChevronLeft, Circle, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PizzaOptionalsStep, type OptionGroup as PizzaOptionGroup } from './PizzaOptionalsStep';
import type { PizzaSelectedOptional, PizzaSelectedBorder } from '@/contexts/CartContext';
import type { PublicPizzaDoughType, PublicPizzaBorderType } from '@/hooks/useProductPizzaConfigurationPublic';
import { cn } from '@/lib/utils';

export interface FlavorData {
  id: string;
  name: string;
  highlight_group: string | null;
  description: string | null;
  ingredients_raw: string | null;
  prices: Array<{
    size_name: string;
    price_full: number;
    price_per_part: number;
    price_avg: number;
  }>;
}

export interface BorderData {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

export interface PizzaConfig {
  allowed_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  pricing_model: 'maior' | 'media' | 'partes';
}

interface FlavorSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: FlavorSelection) => void;
  productName: string;
  flavors: FlavorData[];
  borders?: BorderData[];
  pizzaConfig: PizzaConfig;
  optionGroups?: PizzaOptionGroup[];
  doughTypes?: PublicPizzaDoughType[];
  borderTypes?: PublicPizzaBorderType[];
}

export interface FlavorSelection {
  size: string;
  flavors: Array<{
    id: string;
    name: string;
    description?: string | null;
    removedIngredients: string[];
    observation?: string;
  }>;
  totalPrice: number;
  selectedBorder?: PizzaSelectedBorder | null;
  borderTotal?: number;
  selectedOptionals?: PizzaSelectedOptional[];
  optionalsTotal?: number;
  selectedDoughType?: { id: string; name: string; price_delta: number } | null;
  selectedBorderType?: { id: string; name: string; price_delta: number } | null;
}

const SIZE_LABELS: Record<string, string> = {
  broto: 'Broto',
  media: 'Média',
  média: 'Média',
  grande: 'Grande',
  gigante: 'Gigante',
};

const SIZE_INFO: Record<string, { slices: number; maxFlavors: number }> = {
  broto: { slices: 4, maxFlavors: 1 },
  media: { slices: 6, maxFlavors: 2 },
  média: { slices: 6, maxFlavors: 2 },
  grande: { slices: 8, maxFlavors: 3 },
  gigante: { slices: 12, maxFlavors: 4 },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// FLOW: size -> dough -> flavors -> border_decision -> border_flavor -> border_type -> optionals
type PizzaStep = 'size' | 'dough' | 'flavors' | 'border_decision' | 'border_flavor' | 'border_type' | 'optionals';

// Step indicator component
function StepIndicator({ currentStep, hasDoughs, hasBorders, hasOptionals, hasMultipleSizes, wantsBorder, hasBorderFlavor, hasBorderTypes }: { currentStep: PizzaStep; hasDoughs: boolean; hasBorders: boolean; hasOptionals: boolean; hasMultipleSizes: boolean; wantsBorder: boolean | null; hasBorderFlavor: boolean; hasBorderTypes: boolean }) {
  const steps: { key: PizzaStep; label: string }[] = [
    ...(hasMultipleSizes ? [{ key: 'size' as PizzaStep, label: 'Tamanho' }] : []),
    ...(hasDoughs ? [{ key: 'dough' as PizzaStep, label: 'Massa' }] : []),
    { key: 'flavors', label: 'Sabores' },
    ...(hasBorders ? [{ key: 'border_decision' as PizzaStep, label: 'Borda' }] : []),
    ...(hasBorders && wantsBorder === true ? [{ key: 'border_flavor' as PizzaStep, label: 'Sabor Borda' }] : []),
    ...(hasBorders && wantsBorder === true && hasBorderFlavor && hasBorderTypes ? [{ key: 'border_type' as PizzaStep, label: 'Tipo Borda' }] : []),
    ...(hasOptionals ? [{ key: 'optionals' as PizzaStep, label: 'Adicionais' }] : []),
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-1 mb-4 px-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors",
              index <= currentIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
          <span className={cn(
            "text-xs ml-1 hidden sm:inline",
            index <= currentIndex ? "text-foreground" : "text-muted-foreground"
          )}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}

export function FlavorSelectorDialog({
  open,
  onClose,
  onConfirm,
  productName,
  flavors,
  borders = [],
  pizzaConfig,
  optionGroups = [],
  doughTypes = [],
  borderTypes = [],
}: FlavorSelectorDialogProps) {
  // State
  const [step, setStep] = useState<PizzaStep>('flavors');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<Record<string, string[]>>({});
  const [selectedBorder, setSelectedBorder] = useState<BorderData | null>(null);
  const [pizzaOptionals, setPizzaOptionals] = useState<PizzaSelectedOptional[]>([]);
  const [optionalsTotal, setOptionalsTotal] = useState(0);
  const [flavorObservations, setFlavorObservations] = useState<Record<string, string>>({});
  const [selectedDoughType, setSelectedDoughType] = useState<PublicPizzaDoughType | null>(null);
  const [selectedBorderType, setSelectedBorderType] = useState<PublicPizzaBorderType | null>(null);
  const [wantsBorder, setWantsBorder] = useState<boolean | null>(null);
  
  // Per-flavor ingredient sheet state
  const [ingredientSheetFlavorId, setIngredientSheetFlavorId] = useState<string | null>(null);
  // Per-flavor observation sheet state
  const [observationSheetFlavorId, setObservationSheetFlavorId] = useState<string | null>(null);

  const hasDoughs = doughTypes.length > 0;
  const hasBorders = borders.length > 0 || borderTypes.length > 0;
  const hasOptionals = optionGroups.length > 0;
  const hasMultipleSizes = pizzaConfig.allowed_sizes.length > 1;

  // Set initial step and reset state when dialog opens
  useEffect(() => {
    if (open) {
      const defaultSize = pizzaConfig.allowed_sizes.length === 1 
        ? pizzaConfig.allowed_sizes[0] 
        : '';
      
      // Step priority: size (if multiple) → dough (if exists) → flavors
      let initialStep: PizzaStep = 'flavors';
      if (hasMultipleSizes) {
        initialStep = 'size';
      } else if (hasDoughs) {
        initialStep = 'dough';
      }
      
      setStep(initialStep);
      setSelectedSize(defaultSize);
      setSelectedFlavors([]);
      setRemovedIngredients({});
      setSelectedBorder(null);
      setPizzaOptionals([]);
      setOptionalsTotal(0);
      setFlavorObservations({});
      setSelectedDoughType(doughTypes.find(d => d.is_default) || null);
      setSelectedBorderType(null);
      setWantsBorder(null);
    }
  }, [open, pizzaConfig.allowed_sizes, hasMultipleSizes, hasDoughs]);

  const maxFlavors = selectedSize ? (pizzaConfig.max_flavors_per_size[selectedSize] || 1) : 1;

  const handleFlavorToggle = (flavorId: string) => {
    setSelectedFlavors(prev => {
      if (prev.includes(flavorId)) {
        const newRemoved = { ...removedIngredients };
        delete newRemoved[flavorId];
        setRemovedIngredients(newRemoved);
        // Also clear observation
        const newObs = { ...flavorObservations };
        delete newObs[flavorId];
        setFlavorObservations(newObs);
        return prev.filter(id => id !== flavorId);
      }
      if (prev.length < maxFlavors) {
        return [...prev, flavorId];
      }
      return prev;
    });
  };

  const handleIngredientToggle = (flavorId: string, ingredient: string) => {
    setRemovedIngredients(prev => {
      const current = prev[flavorId] || [];
      if (current.includes(ingredient)) {
        return { ...prev, [flavorId]: current.filter(i => i !== ingredient) };
      }
      return { ...prev, [flavorId]: [...current, ingredient] };
    });
  };

  const handleBorderSelect = (border: BorderData | null) => {
    setSelectedBorder(border);
  };

  const handleProceedFromSize = () => {
    if (!selectedSize) return;
    setStep(hasDoughs ? 'dough' : 'flavors');
  };

  const handleProceedFromDough = () => {
    setStep('flavors');
  };

  const handleProceedFromFlavors = () => {
    if (selectedFlavors.length === 0) return;
    if (hasBorders) {
      setStep('border_decision');
    } else if (hasOptionals) {
      setStep('optionals');
    } else {
      handleFinalConfirm();
    }
  };

  const handleBorderDecisionNext = () => {
    if (wantsBorder === null) return;
    if (wantsBorder === false) {
      // Skip border flavor and type
      setSelectedBorder(null);
      setSelectedBorderType(null);
      if (hasOptionals) {
        setStep('optionals');
      } else {
        handleFinalConfirm();
      }
    } else {
      // Go to border flavor selection
      setStep('border_flavor');
    }
  };

  const handleBorderFlavorNext = () => {
    if (borderTypes.length > 0) {
      setStep('border_type');
    } else if (hasOptionals) {
      setStep('optionals');
    } else {
      handleFinalConfirm();
    }
  };

  const handleBorderTypeNext = () => {
    if (hasOptionals) {
      setStep('optionals');
    } else {
      handleFinalConfirm();
    }
  };

  const handleOptionalsConfirm = (selectedOpts: PizzaSelectedOptional[], total: number) => {
    setPizzaOptionals(selectedOpts);
    setOptionalsTotal(total);
    // Optionals is the final step - confirm directly
    handleFinalConfirm(selectedOpts, total);
  };

  const borderTotal = selectedBorder?.price || 0;

  const handleFinalConfirm = (opts?: PizzaSelectedOptional[], optsTotal?: number) => {
    const selectedFlavorData = selectedFlavors.map(id => {
      const flavor = flavors.find(f => f.id === id)!;
      return {
        flavorId: id,
        prices: flavor.prices,
      };
    });

    const totalPrice = calculatePizzaPrice(
      selectedFlavorData,
      selectedSize,
      pizzaConfig.pricing_model
    );

    onConfirm({
      size: selectedSize,
      flavors: selectedFlavors.map(id => {
        const flavor = flavors.find(f => f.id === id)!;
        return {
          id,
          name: flavor.name,
          description: flavor.description,
          removedIngredients: removedIngredients[id] || [],
          observation: flavorObservations[id] || undefined,
        };
      }),
      totalPrice,
      selectedBorder: selectedBorder ? {
        id: selectedBorder.id,
        name: selectedBorder.name,
        price: selectedBorder.price,
      } : null,
      borderTotal,
      selectedOptionals: opts ?? pizzaOptionals,
      optionalsTotal: optsTotal ?? optionalsTotal,
      selectedDoughType: selectedDoughType ? { id: selectedDoughType.id, name: selectedDoughType.name, price_delta: selectedDoughType.price_delta } : null,
      selectedBorderType: selectedBorderType ? { id: selectedBorderType.id, name: selectedBorderType.name, price_delta: selectedBorderType.price_delta } : null,
    });

    onClose();
  };

  // Calculate preview price
  const previewPrice = selectedSize && selectedFlavors.length > 0
    ? calculatePizzaPrice(
        selectedFlavors.map(id => ({
          flavorId: id,
          prices: flavors.find(f => f.id === id)?.prices || [],
        })),
        selectedSize,
        pizzaConfig.pricing_model
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[90vw] max-w-[960px] min-w-0 sm:min-w-[720px] max-h-[90vh] overflow-hidden flex flex-col gap-2 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pizza className="w-5 h-5 text-primary" />
            {productName}
            {selectedSize && (
              <Badge variant="outline" className="ml-2 capitalize">
                {SIZE_LABELS[selectedSize] || selectedSize}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <StepIndicator currentStep={step} hasDoughs={hasDoughs} hasBorders={hasBorders} hasOptionals={hasOptionals} hasMultipleSizes={hasMultipleSizes} wantsBorder={wantsBorder} hasBorderFlavor={!!selectedBorder} hasBorderTypes={borderTypes.length > 0} />

        <ScrollArea className="flex-1 min-h-0 pr-4">
          {/* STEP: Size Selection */}
          {step === 'size' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione o tamanho:</p>
              <div className="grid grid-cols-2 gap-3">
                {pizzaConfig.allowed_sizes.map(size => {
                  const isSelected = selectedSize === size;
                  const sizeInfo = SIZE_INFO[size] || { slices: 8, maxFlavors: 2 };
                  const configMaxFlavors = pizzaConfig.max_flavors_per_size[size] || sizeInfo.maxFlavors;
                  const configSlices = pizzaConfig.slices_per_size[size] || sizeInfo.slices;
                  
                  return (
                    <div
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'p-4 rounded-lg border cursor-pointer transition-all',
                        isSelected ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <p className="font-medium capitalize">{SIZE_LABELS[size] || size}</p>
                      <p className="text-xs text-muted-foreground">
                        {configSlices} fatias, até {configMaxFlavors} sabor{configMaxFlavors > 1 ? 'es' : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Dough Selection */}
          {step === 'dough' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Selecione o tipo de massa:</p>
              <div className="space-y-2">
                {doughTypes.map(dt => (
                  <div
                    key={dt.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedDoughType?.id === dt.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedDoughType(dt)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Circle className={cn("w-5 h-5", selectedDoughType?.id === dt.id ? "text-primary fill-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{dt.name}</span>
                        {dt.is_default && (
                          <Badge variant="secondary" className="text-xs">Padrão</Badge>
                        )}
                      </div>
                      {dt.price_delta > 0 && <span className="text-sm font-medium text-primary">+{formatCurrency(dt.price_delta)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP: Select Flavors */}
          {step === 'flavors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Escolha até {maxFlavors} sabor{maxFlavors > 1 ? 'es' : ''}:
                </p>
                <Badge variant="outline">
                  {selectedFlavors.length}/{maxFlavors}
                </Badge>
              </div>

              <div className="space-y-2">
                {flavors.map(flavor => {
                  const isSelected = selectedFlavors.includes(flavor.id);
                  const sizePrice = flavor.prices.find(p => p.size_name === selectedSize);
                  const flavorRemovedIngredients = removedIngredients[flavor.id] || [];
                  const hasIngredients = flavor.ingredients_raw && flavor.ingredients_raw.trim().length > 0;
                  
                  return (
                    <div
                      key={flavor.id}
                      className={cn(
                        "p-4 border rounded-lg transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                        !isSelected && selectedFlavors.length >= maxFlavors ? "opacity-50" : ""
                      )}
                    >
                      <div 
                        className={cn(
                          "flex items-start justify-between gap-2",
                          !isSelected && selectedFlavors.length >= maxFlavors ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                        onClick={() => handleFlavorToggle(flavor.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={isSelected} />
                            <span className="font-medium">{flavor.name}</span>
                            {flavor.highlight_group && (
                              <Badge variant="secondary" className="text-xs">
                                {flavor.highlight_group}
                              </Badge>
                            )}
                          </div>
                          {flavor.description && (
                            <p className="text-sm text-muted-foreground mt-1 pl-6">
                              {flavor.description}
                            </p>
                          )}
                        </div>
                        {sizePrice && (
                          <span className="text-sm font-medium">
                            {formatCurrency(sizePrice.price_full)}
                          </span>
                        )}
                      </div>
                      
                      {/* INLINE: Actions for selected flavors */}
                      {isSelected && (
                        <div className="mt-3 pl-6 space-y-2 border-t border-dashed pt-3">
                          {/* Ingredient removal button */}
                          {hasIngredients && (
                            <Button
                              variant="default"
                              size="default"
                              className={cn(
                                "w-full h-11 text-sm gap-2 font-semibold transition-all",
                                flavorRemovedIngredients.length > 0 
                                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                                  : "bg-primary/90 hover:bg-primary text-primary-foreground"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIngredientSheetFlavorId(flavor.id);
                              }}
                            >
                              <UtensilsCrossed className="w-5 h-5" />
                              {flavorRemovedIngredients.length > 0 
                                ? `Ingredientes (${flavorRemovedIngredients.length} removido${flavorRemovedIngredients.length > 1 ? 's' : ''})` 
                                : 'Ver e Remover Ingredientes'}
                            </Button>
                          )}
                          
                          {/* Observation button */}
                          <Button
                            variant="outline"
                            size="default"
                            className={cn(
                              "w-full h-11 text-sm gap-2 font-medium transition-all",
                              flavorObservations[flavor.id] 
                                ? "border-primary text-primary bg-primary/5" 
                                : ""
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setObservationSheetFlavorId(flavor.id);
                            }}
                          >
                            <MessageSquare className="w-5 h-5" />
                            {flavorObservations[flavor.id] 
                              ? 'Observação adicionada' 
                              : 'Adicionar Observação'}
                          </Button>
                          
                          {/* Show removed ingredients summary */}
                          {flavorRemovedIngredients.length > 0 && (
                            <div className="bg-destructive/10 rounded-md p-2">
                              <p className="text-xs text-destructive font-medium mb-1.5 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Removidos:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {flavorRemovedIngredients.map((ing, i) => (
                                  <Badge key={i} variant="destructive" className="text-[10px] py-0.5">
                                    <X className="w-2.5 h-2.5 mr-0.5" />
                                    {ing}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show observation preview */}
                          {flavorObservations[flavor.id] && (
                            <div className="bg-primary/5 rounded-md p-2 border border-primary/20">
                              <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Observação:
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {flavorObservations[flavor.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Price preview */}
              {previewPrice > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Preço ({pizzaConfig.pricing_model === 'maior' ? 'pelo maior' : pizzaConfig.pricing_model === 'media' ? 'média' : 'por partes'}):
                    </span>
                    <span className="text-lg font-bold">{formatCurrency(previewPrice)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP: Border Decision */}
          {step === 'border_decision' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Deseja borda?</p>
              <div
                onClick={() => setWantsBorder(false)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-colors text-center',
                  wantsBorder === false ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                )}
              >
                <p className="font-bold text-lg">Sem borda</p>
                <p className="text-xs text-muted-foreground mt-1">Continuar sem borda</p>
              </div>
              <div
                onClick={() => setWantsBorder(true)}
                className={cn(
                  'p-4 rounded-lg border cursor-pointer transition-colors text-center',
                  wantsBorder === true ? 'bg-primary/10 border-primary ring-1 ring-primary' : 'hover:bg-muted/50'
                )}
              >
                <p className="font-bold text-lg">Com borda</p>
                <p className="text-xs text-muted-foreground mt-1">Escolher sabor e tipo da borda</p>
              </div>
            </div>
          )}

          {/* STEP: Border Flavor Selection */}
          {step === 'border_flavor' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Escolha o sabor da borda:</p>
              {borders.map(border => (
                <div
                  key={border.id}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-colors",
                    selectedBorder?.id === border.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleBorderSelect(border)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Circle className={cn("w-5 h-5 shrink-0", selectedBorder?.id === border.id ? "text-primary fill-primary" : "text-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{border.name}</p>
                        {border.description && <p className="text-sm text-muted-foreground truncate">{border.description}</p>}
                      </div>
                    </div>
                    <span className="font-medium text-primary shrink-0 whitespace-nowrap">+{formatCurrency(border.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP: Border Type Selection - ONLY after border flavor */}
          {step === 'border_type' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Escolha o tipo da borda:</p>
              {borderTypes.map(bt => (
                <div
                  key={bt.id}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors",
                    selectedBorderType?.id === bt.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedBorderType(bt)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Circle className={cn("w-5 h-5", selectedBorderType?.id === bt.id ? "text-primary fill-primary" : "text-muted-foreground")} />
                      <span className="font-medium">{bt.name}</span>
                    </div>
                    {bt.price_delta > 0 && <span className="text-sm font-medium text-primary">+{formatCurrency(bt.price_delta)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Pizza Optionals */}
          {step === 'optionals' && (
            <PizzaOptionalsStep
              groups={optionGroups}
              selectedFlavors={selectedFlavors.map(id => {
                const flavor = flavors.find(f => f.id === id)!;
                return {
                  id,
                  name: flavor.name,
                  removedIngredients: removedIngredients[id] || [],
                };
              })}
              partsCount={selectedFlavors.length}
              onConfirm={handleOptionalsConfirm}
              onBack={() => {
                if (hasBorders && wantsBorder && borderTypes.length > 0) {
                  setStep('border_type');
                } else if (hasBorders && wantsBorder) {
                  setStep('border_flavor');
                } else if (hasBorders) {
                  setStep('border_decision');
                } else {
                  setStep('flavors');
                }
              }}
            />
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'size' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleProceedFromSize} 
                disabled={!selectedSize}
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'dough' && (
            <>
              <Button 
                variant="outline" 
                onClick={hasMultipleSizes ? () => setStep('size') : onClose}
              >
                {hasMultipleSizes ? (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </>
                ) : 'Cancelar'}
              </Button>
              <Button 
                onClick={handleProceedFromDough} 
                disabled={!selectedDoughType}
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'flavors' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (hasDoughs) {
                    setStep('dough');
                  } else if (hasMultipleSizes) {
                    setStep('size');
                  } else {
                    onClose();
                  }
                }}
              >
                {(hasDoughs || hasMultipleSizes) ? (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </>
                ) : 'Cancelar'}
              </Button>
              <Button 
                onClick={handleProceedFromFlavors} 
                disabled={selectedFlavors.length === 0}
              >
                {hasBorders || hasOptionals ? 'Continuar' : 'Adicionar ao Carrinho'}
                {(hasBorders || hasOptionals) && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </>
          )}

          {step === 'border_decision' && (
            <>
              <Button variant="outline" onClick={() => setStep('flavors')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleBorderDecisionNext} disabled={wantsBorder === null}>
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 'border_flavor' && (
            <>
              <Button variant="outline" onClick={() => setStep('border_decision')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleBorderFlavorNext} disabled={!selectedBorder}>
                {borderTypes.length > 0 || hasOptionals ? 'Continuar' : 'Adicionar ao Carrinho'}
                {(borderTypes.length > 0 || hasOptionals) && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </>
          )}

          {step === 'border_type' && (
            <>
              <Button variant="outline" onClick={() => setStep('border_flavor')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleBorderTypeNext}>
                {hasOptionals ? 'Continuar' : 'Adicionar ao Carrinho'}
                {hasOptionals && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Per-flavor ingredient sheet */}
      <PerFlavorIngredientSheet
        open={!!ingredientSheetFlavorId}
        onOpenChange={(open) => !open && setIngredientSheetFlavorId(null)}
        flavor={ingredientSheetFlavorId ? flavors.find(f => f.id === ingredientSheetFlavorId) : null}
        removedIngredients={ingredientSheetFlavorId ? (removedIngredients[ingredientSheetFlavorId] || []) : []}
        onIngredientToggle={(ingredient) => {
          if (ingredientSheetFlavorId) {
            handleIngredientToggle(ingredientSheetFlavorId, ingredient);
          }
        }}
      />

      {/* Per-flavor observation sheet */}
      <PerFlavorObservationSheet
        open={!!observationSheetFlavorId}
        onOpenChange={(open) => !open && setObservationSheetFlavorId(null)}
        flavorName={observationSheetFlavorId ? flavors.find(f => f.id === observationSheetFlavorId)?.name || '' : ''}
        observation={observationSheetFlavorId ? (flavorObservations[observationSheetFlavorId] || '') : ''}
        onSave={(obs) => {
          if (observationSheetFlavorId) {
            setFlavorObservations(prev => ({ ...prev, [observationSheetFlavorId]: obs }));
            setObservationSheetFlavorId(null);
          }
        }}
      />
    </Dialog>
  );
}

// Per-flavor ingredient sheet component
function PerFlavorIngredientSheet({
  open,
  onOpenChange,
  flavor,
  removedIngredients,
  onIngredientToggle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flavor: FlavorData | null | undefined;
  removedIngredients: string[];
  onIngredientToggle: (ingredient: string) => void;
}) {
  if (!flavor) return null;

  const { removable, fixed } = parseIngredients(flavor.ingredients_raw);
  const hasIngredients = removable.length > 0 || fixed.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] max-h-[600px] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b mb-4">
          <SheetTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="block text-base font-semibold">{flavor.name}</span>
              <span className="block text-xs text-muted-foreground font-normal">
                Toque nos ingredientes para remover
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100%-160px)]">
          {!hasIngredients ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-base text-muted-foreground">
                Este sabor não possui ingredientes cadastrados.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pr-2">
              {removable.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                      Ingredientes Removíveis
                    </p>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {removable.map((ing, i) => {
                      const isRemoved = removedIngredients.includes(ing);
                      return (
                        <div
                          key={i}
                          onClick={() => onIngredientToggle(ing)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all touch-manipulation",
                            isRemoved 
                              ? "bg-destructive/10 border-destructive text-destructive" 
                              : "bg-muted/50 border-transparent hover:border-primary/50"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            isRemoved ? "bg-destructive text-destructive-foreground" : "bg-primary/10 text-primary"
                          )}>
                            {isRemoved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </div>
                          <span className={cn(
                            "text-sm font-medium flex-1",
                            isRemoved && "line-through opacity-75"
                          )}>
                            {ing}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {fixed.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2">
                      Ingredientes Fixos
                    </p>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fixed.map((ing, i) => (
                      <Badge key={i} variant="outline" className="text-sm py-2 px-3 bg-muted">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {removedIngredients.length > 0 && (
                <div className="bg-destructive/10 rounded-xl p-4 border-2 border-destructive/30">
                  <p className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    {removedIngredients.length} ingrediente(s) serão removidos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {removedIngredients.map((ing, i) => (
                      <Badge key={i} variant="destructive" className="text-sm py-1.5 px-3">
                        Sem {ing}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="pt-4 border-t">
          <Button 
            onClick={() => onOpenChange(false)} 
            className={cn(
              "w-full h-12 text-lg font-semibold",
              removedIngredients.length > 0 && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {removedIngredients.length > 0 
              ? `Confirmar (${removedIngredients.length} removido${removedIngredients.length > 1 ? 's' : ''})` 
              : 'Fechar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Per-flavor observation sheet component
function PerFlavorObservationSheet({
  open,
  onOpenChange,
  flavorName,
  observation,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flavorName: string;
  observation: string;
  onSave: (observation: string) => void;
}) {
  const [localObs, setLocalObs] = useState(observation);

  useEffect(() => {
    if (open) {
      setLocalObs(observation);
    }
  }, [open, observation]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[50vh] max-h-[400px] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b mb-4">
          <SheetTitle className="flex items-center gap-3 text-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="block text-base font-semibold">Observação - {flavorName}</span>
              <span className="block text-xs text-muted-foreground font-normal">
                Ex: bem assada, sem tempero, etc.
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 py-4">
          <Textarea
            placeholder="Digite sua observação para este sabor..."
            value={localObs}
            onChange={(e) => setLocalObs(e.target.value)}
            className="min-h-[100px] resize-none"
            autoFocus
          />
        </div>

        <SheetFooter className="pt-4 border-t flex gap-2">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)} 
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => onSave(localObs.trim())} 
            className="flex-1"
          >
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
