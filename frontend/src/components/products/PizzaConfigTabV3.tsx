/**
 * Pizza Configuration Tab V3 - COMPLETE REBUILD FROM ZERO
 * 
 * ARCHITECTURE (MANDATORY):
 * 1. Fully isolated component with LOCAL STATE ONLY
 * 2. Does NOT write to parent form on every change
 * 3. Only returns data on explicit SAVE button click
 * 4. Data loaded ONCE on mount with empty dependency array
 * 5. NO useEffect that depends on selected values
 * 6. NO bidirectional sync
 * 7. NO automatic recalculation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useActivePizzaDoughTypes, useActivePizzaBorderTypes, useProductDoughTypeLinks, useProductBorderTypeLinks, useSaveProductDoughLinks, useSaveProductBorderLinks } from '@/hooks/usePizzaDoughBorderTypes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Pizza, Save, Circle, UtensilsCrossed, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CONSTANTS - Static, never recalculated
// ============================================

const PIZZA_SIZES = [
  { key: 'broto', label: 'Broto', slices: 4, maxFlavors: 1 },
  { key: 'media', label: 'Média', slices: 6, maxFlavors: 2 },
  { key: 'grande', label: 'Grande', slices: 8, maxFlavors: 3 },
  { key: 'gigante', label: 'Gigante', slices: 12, maxFlavors: 4 },
] as const;

const PRICING_OPTIONS = [
  { value: 'maior', label: 'Maior preço', desc: 'Cobra pelo sabor mais caro' },
  { value: 'media', label: 'Média', desc: 'Cobra a média dos sabores' },
  { value: 'partes', label: 'Por partes', desc: 'Cobra proporcional às fatias' },
] as const;

// ============================================
// TYPES
// ============================================

interface Props {
  productId: string;
  productName: string;
  companyId: string;
}

interface FlavorItem {
  id: string;
  name: string;
  group: string | null;
}

interface BorderItem {
  id: string;
  name: string;
  price: number;
}

interface OptionalItem {
  id: string;
  name: string;
}

// ============================================
// DATA LOADING - Pure queries, no state sync
// ============================================

function useLoadPizzaData(productId: string, companyId: string) {
  return useQuery({
    queryKey: ['pizza-config-tab-data', productId, companyId],
    staleTime: 60000,
    queryFn: async () => {
      // 1. Load existing config
      const { data: config } = await supabase
        .from('product_pizza_config')
        .select('allowed_sizes, pricing_model')
        .eq('product_id', productId)
        .maybeSingle();

      // 2. Load all flavors (non-borders)
      const { data: flavorsRaw } = await supabase
        .from('flavors')
        .select('id, name, highlight_group, usage_type')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');

      const allFlavors: FlavorItem[] = (flavorsRaw || [])
        .filter(f => f.usage_type === 'pizza' && !f.name.toLowerCase().includes('borda'))
        .map(f => ({ id: f.id, name: f.name, group: f.highlight_group }));

      // 3. Load all borders
      const allBorders: BorderItem[] = (flavorsRaw || [])
        .filter(f => f.name.toLowerCase().includes('borda'))
        .map(f => ({ id: f.id, name: f.name, price: 0 }));

      // Get prices for borders
      if (allBorders.length > 0) {
        const borderIds = allBorders.map(b => b.id);
        const { data: prices } = await supabase
          .from('flavor_prices')
          .select('flavor_id, price_full')
          .in('flavor_id', borderIds);
        
        const priceMap = new Map<string, number>();
        (prices || []).forEach(p => priceMap.set(p.flavor_id, p.price_full));
        allBorders.forEach(b => { b.price = priceMap.get(b.id) || 0; });
      }

      // 4. Load all optional groups
      const { data: optionalsRaw } = await supabase
        .from('optional_groups')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');

      const allOptionals: OptionalItem[] = (optionalsRaw || []).map(o => ({
        id: o.id,
        name: o.name,
      }));

      // 5. Load currently linked flavors/borders
      const { data: linkedFlavors } = await supabase
        .from('product_flavors')
        .select('flavor_id')
        .eq('product_id', productId)
        .eq('active', true);

      const linkedFlavorIds = new Set((linkedFlavors || []).map(l => l.flavor_id));
      const allBorderIds = new Set(allBorders.map(b => b.id));

      // Separate linked flavors from linked borders
      const selectedFlavorIds = [...linkedFlavorIds].filter(id => !allBorderIds.has(id));
      const selectedBorderIds = [...linkedFlavorIds].filter(id => allBorderIds.has(id));

      // 6. Load currently linked optionals
      const { data: linkedOptionals } = await supabase
        .from('product_optional_groups')
        .select('optional_group_id')
        .eq('product_id', productId);

      const selectedOptionalIds = (linkedOptionals || []).map(l => l.optional_group_id);

      return {
        // Available items (loaded once)
        allFlavors,
        allBorders,
        allOptionals,
        // Initial selections (for initializing local state)
        initialSizes: (config?.allowed_sizes || []) as string[],
        initialPricingModel: (config?.pricing_model || 'maior') as string,
        initialFlavorIds: selectedFlavorIds,
        initialBorderIds: selectedBorderIds,
        initialOptionalIds: selectedOptionalIds,
      };
    },
  });
}

// ============================================
// SAVE MUTATION
// ============================================

function useSaveConfig() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      productId: string;
      companyId: string;
      sizes: string[];
      pricingModel: string;
      flavorIds: string[];
      borderIds: string[];
      optionalIds: string[];
    }) => {
      const { productId, companyId, sizes, pricingModel, flavorIds, borderIds, optionalIds } = params;

      // Build size metadata
      const slicesPerSize: Record<string, number> = {};
      const maxFlavorsPerSize: Record<string, number> = {};
      PIZZA_SIZES.forEach(s => {
        if (sizes.includes(s.key)) {
          slicesPerSize[s.key] = s.slices;
          maxFlavorsPerSize[s.key] = s.maxFlavors;
        }
      });

      // 1. Upsert config
      const { error: cfgErr } = await supabase
        .from('product_pizza_config')
        .upsert({
          product_id: productId,
          company_id: companyId,
          requires_size: true,
          allowed_sizes: sizes,
          slices_per_size: slicesPerSize,
          max_flavors_per_size: maxFlavorsPerSize,
          pricing_model: pricingModel,
        }, { onConflict: 'product_id' });

      if (cfgErr) throw cfgErr;

      // 2. Replace product_flavors (flavors + borders combined)
      await supabase.from('product_flavors').delete().eq('product_id', productId);

      const allFlavorBorderIds = [...new Set([...flavorIds, ...borderIds])];
      if (allFlavorBorderIds.length > 0) {
        const records = allFlavorBorderIds.map((id, i) => ({
          company_id: companyId,
          product_id: productId,
          flavor_id: id,
          active: true,
          sort_order: i,
        }));
        const { error } = await supabase.from('product_flavors').insert(records);
        if (error) throw error;
      }

      // 3. Replace product_optional_groups
      await supabase.from('product_optional_groups').delete().eq('product_id', productId);

      if (optionalIds.length > 0) {
        const records = optionalIds.map((gid, i) => ({
          company_id: companyId,
          product_id: productId,
          optional_group_id: gid,
          min_select: 0,
          max_select: 10,
          sort_order: i,
          active: true,
        }));
        const { error } = await supabase.from('product_optional_groups').insert(records);
        if (error) throw error;
      }

      return { success: true, productId };
    },
    onSuccess: (result, variables) => {
      toast.success('Configuração de pizza salva!');
      // Invalidate config tab query
      qc.invalidateQueries({ queryKey: ['pizza-config-tab-data', result.productId] });
      // Invalidate modal data query so changes appear immediately in ordering flow
      qc.invalidateQueries({ queryKey: ['pizza-v3-modal', result.productId, variables.companyId] });
      // Invalidate public menu queries (used by FlavorSelectorDialog/PizzaConfiguratorDialog)
      qc.invalidateQueries({ queryKey: ['product-flavors-public', result.productId, variables.companyId] });
      // Invalidate the public pizza configuration query (single source of truth for ordering modal)
      qc.invalidateQueries({ queryKey: ['product-pizza-configuration-public', result.productId, variables.companyId] });
      // Also invalidate related pizza queries for good measure
      qc.invalidateQueries({ queryKey: ['pizza-v3-config', result.productId] });
      qc.invalidateQueries({ queryKey: ['pizza-v3-product-flavors', result.productId] });
      qc.invalidateQueries({ queryKey: ['pizza-v3-product-optionals', result.productId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar configuração');
    },
  });
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PizzaConfigTabV3({ productId, productName, companyId }: Props) {
  const { data, isLoading, isError } = useLoadPizzaData(productId, companyId);
  const saveMutation = useSaveConfig();

  // Dough & border type data
  const { data: allDoughTypes = [] } = useActivePizzaDoughTypes(companyId);
  const { data: allBorderTypes = [] } = useActivePizzaBorderTypes(companyId);
  const { data: initialDoughTypeIds = [] } = useProductDoughTypeLinks(productId);
  const { data: initialBorderTypeIds = [] } = useProductBorderTypeLinks(productId);
  const saveDoughLinks = useSaveProductDoughLinks();
  const saveBorderLinks = useSaveProductBorderLinks();

  // LOCAL STATE - initialized from query data, managed locally
  const [sizes, setSizes] = useState<string[]>([]);
  const [pricingModel, setPricingModelState] = useState('maior');
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const [borderIds, setBorderIds] = useState<string[]>([]);
  const [optionalIds, setOptionalIds] = useState<string[]>([]);
  const [selectedDoughTypeIds, setSelectedDoughTypeIds] = useState<string[]>([]);
  const [selectedBorderTypeIds, setSelectedBorderTypeIds] = useState<string[]>([]);
  const initializedRef = useRef(false);
  const doughBorderInitRef = useRef(false);

  // Initialize local state when data arrives (proper useEffect pattern)
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      setSizes(data.initialSizes);
      setPricingModelState(data.initialPricingModel);
      setFlavorIds(data.initialFlavorIds);
      setBorderIds(data.initialBorderIds);
      setOptionalIds(data.initialOptionalIds);
    }
  }, [data]);

  // Initialize dough/border type links
  useEffect(() => {
    if (!doughBorderInitRef.current && initialDoughTypeIds.length >= 0 && initialBorderTypeIds.length >= 0) {
      doughBorderInitRef.current = true;
      setSelectedDoughTypeIds(initialDoughTypeIds);
      setSelectedBorderTypeIds(initialBorderTypeIds);
    }
  }, [initialDoughTypeIds, initialBorderTypeIds]);

  // Toggle handlers - ONLY modify local state, NO side effects
  const toggleSize = useCallback((key: string) => {
    setSizes(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
  }, []);

  const setPricingModel = useCallback((model: string) => {
    setPricingModelState(model);
  }, []);

  const toggleFlavor = useCallback((id: string) => {
    setFlavorIds(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const toggleBorder = useCallback((id: string) => {
    setBorderIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  }, []);

  const toggleOptional = useCallback((id: string) => {
    setOptionalIds(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  }, []);

  const toggleDoughType = useCallback((id: string) => {
    setSelectedDoughTypeIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }, []);

  const toggleBorderType = useCallback((id: string) => {
    setSelectedBorderTypeIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  }, []);

  const selectAllFlavors = useCallback(() => {
    if (!data) return;
    setFlavorIds(data.allFlavors.map(f => f.id));
  }, [data]);

  const clearFlavors = useCallback(() => {
    setFlavorIds([]);
  }, []);

  // SAVE - explicit user action, writes to backend
  const handleSave = useCallback(() => {
    if (sizes.length === 0) {
      toast.error('Selecione pelo menos um tamanho');
      return;
    }
    if (flavorIds.length === 0) {
      toast.error('Selecione pelo menos um sabor');
      return;
    }

    saveMutation.mutate({
      productId,
      companyId,
      sizes,
      pricingModel,
      flavorIds,
      borderIds,
      optionalIds,
    });

    // Save dough & border type links in parallel
    saveDoughLinks.mutate({ productId, doughTypeIds: selectedDoughTypeIds });
    saveBorderLinks.mutate({ productId, borderTypeIds: selectedBorderTypeIds });
  }, [productId, companyId, sizes, pricingModel, flavorIds, borderIds, optionalIds, saveMutation, selectedDoughTypeIds, selectedBorderTypeIds, saveDoughLinks, saveBorderLinks]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando configuração...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-8 text-destructive">
        Erro ao carregar dados. Recarregue a página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Pizza className="w-5 h-5 text-primary" />
          <span className="font-semibold">Configuração de Pizza</span>
          <Badge variant="outline">{productName}</Badge>
        </div>
        <Button 
          type="button" 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configuração de Pizza
        </Button>
      </div>

      {/* 1. SIZES */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Circle className="w-4 h-4" />
            1. Tamanhos
          </CardTitle>
          <CardDescription>Selecione os tamanhos disponíveis (multi-seleção)</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="mb-4">
            {sizes.length} selecionado(s)
          </Badge>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PIZZA_SIZES.map(size => {
              const isSelected = sizes.includes(size.key);
              return (
                <div
                  key={size.key}
                  onClick={() => toggleSize(size.key)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all select-none',
                    isSelected 
                      ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">{size.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {size.slices} fatias, {size.maxFlavors} sabor(es)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* PRICING MODEL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Circle className="w-4 h-4" />
            Modelo de Preço
          </CardTitle>
          <CardDescription>Como calcular o preço com múltiplos sabores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {PRICING_OPTIONS.map(opt => {
              const isSelected = pricingModel === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setPricingModel(opt.value)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors select-none',
                    isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    isSelected ? 'border-primary' : 'border-muted-foreground'
                  )}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* 2. FLAVORS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            2. Sabores
          </CardTitle>
          <CardDescription>Sabores vêm de Cardápio → Sabores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button type="button" variant="outline" size="sm" onClick={selectAllFlavors}>
              Selecionar Todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearFlavors}>
              Limpar
            </Button>
            <Badge variant="secondary">{flavorIds.length} selecionado(s)</Badge>
          </div>
          
          {data.allFlavors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum sabor cadastrado. Crie sabores em Cardápio → Sabores.
            </p>
          ) : (
            <ScrollArea className="h-[200px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.allFlavors.map(flavor => {
                  const isSelected = flavorIds.includes(flavor.id);
                  return (
                    <div
                      key={flavor.id}
                      onClick={() => toggleFlavor(flavor.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm flex-1 truncate">{flavor.name}</span>
                      {flavor.group && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {flavor.group}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 3. BORDERS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Circle className="w-4 h-4" />
            3. Bordas
          </CardTitle>
          <CardDescription>Bordas são sabores com "borda" no nome</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="mb-4">
            {borderIds.length} selecionada(s)
          </Badge>
          
          {data.allBorders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma borda cadastrada. Crie sabores com "borda" no nome.
            </p>
          ) : (
            <ScrollArea className="h-[150px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.allBorders.map(border => {
                  const isSelected = borderIds.includes(border.id);
                  return (
                    <div
                      key={border.id}
                      onClick={() => toggleBorder(border.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm flex-1">{border.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        R$ {border.price.toFixed(2)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 3b. TIPOS DE MASSA */}
      {allDoughTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="w-4 h-4" />
              Tipos de Massa
            </CardTitle>
            <CardDescription>Selecione os tipos de massa disponíveis para esta pizza</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-4">
              {selectedDoughTypeIds.length} selecionado(s)
            </Badge>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allDoughTypes.map(dt => {
                const isSelected = selectedDoughTypeIds.includes(dt.id);
                return (
                  <div
                    key={dt.id}
                    onClick={() => toggleDoughType(dt.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    )}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm flex-1">{dt.name}</span>
                    {dt.price_delta > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        +R$ {dt.price_delta.toFixed(2)}
                      </Badge>
                    )}
                    {dt.is_default && (
                      <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3c. TIPOS DE BORDA */}
      {allBorderTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="w-4 h-4" />
              Tipos de Borda
            </CardTitle>
            <CardDescription>Selecione os tipos de borda disponíveis para esta pizza</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-4">
              {selectedBorderTypeIds.length} selecionado(s)
            </Badge>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allBorderTypes.map(bt => {
                const isSelected = selectedBorderTypeIds.includes(bt.id);
                return (
                  <div
                    key={bt.id}
                    onClick={() => toggleBorderType(bt.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none',
                      isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    )}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm flex-1">{bt.name}</span>
                    {bt.price_delta > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        +R$ {bt.price_delta.toFixed(2)}
                      </Badge>
                    )}
                    {bt.is_default && (
                      <Badge variant="secondary" className="text-xs shrink-0">Padrão</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. OPTIONAL GROUPS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            4. Grupos de Opcionais
          </CardTitle>
          <CardDescription>Vincule grupos de opcionais existentes</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="mb-4">
            {optionalIds.length} selecionado(s)
          </Badge>
          
          {data.allOptionals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum grupo de opcionais cadastrado.
            </p>
          ) : (
            <ScrollArea className="h-[150px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.allOptionals.map(group => {
                  const isSelected = optionalIds.includes(group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => toggleOptional(group.id)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none',
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      )}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm flex-1">{group.name}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
