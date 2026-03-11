/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/BatchActions.tsx
import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProducts } from '@/modules/products/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { 
  useOptionGroupsForBatch,
  useBatchDirectLinkOptionGroups,
  useBatchRemoveOptionGroups,
  BatchOptionGroupLink 
} from '@/hooks/useBatchLinkOptionGroups';
import { 
  useBatchUpdateProductionLocation,
  useBatchToggleVisibility,
  useBatchToggleActive
} from '@/hooks/useBatchActions';
import { CALC_MODE_LABELS, type OptionalCalcMode } from '@/hooks/useProductOptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
//import { Checkbox } from '@/components/ui/checkbox'; Corrigir 
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
//import { Switch } from '@/components/ui/switch'; Corrigir
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, Layers, Package, Settings2, CheckSquare, Printer, Eye, Power, Trash2, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type SelectionMode = 'category' | 'subcategory' | 'products';
type ActionType = 'linkOptionalGroups' | 'removeOptionalGroups' | 'visibility' | 'active' | 'production';

export default function BatchActions() {
  // Data Fetching
  const { products, isLoading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const { subcategories } = useSubcategories();
  const { data: optionGroupsForBatch } = useOptionGroupsForBatch();

  // Mutations (NestJS API)
  const batchDirectLinkOptionals = useBatchDirectLinkOptionGroups();
  const batchRemoveOptionals = useBatchRemoveOptionGroups();
  const batchUpdateProduction = useBatchUpdateProductionLocation();
  const batchToggleVisibility = useBatchToggleVisibility();
  const batchToggleActive = useBatchToggleActive();

  // State
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [actionType, setActionType] = useState<ActionType>('linkOptionalGroups');
  
  // Action state
  const [selectedGroupLinks, setSelectedGroupLinks] = useState<BatchOptionGroupLink[]>([]);
  const [selectedGroupsToRemove, setSelectedGroupsToRemove] = useState<string[]>([]);
  const [productionLocation, setProductionLocation] = useState<string>('');
  const [activeStatus, setActiveStatus] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Logic: Filter products based on selection mode
  const targetProducts = useMemo(() => {
    if (!products) return [];
    const resolveCategoryId = (p: any) =>
      (p as any).category_id ||
      (p as any).subcategory?.category_id ||
      subcategories?.find((s) => s.id === (p as any).subcategory_id)?.category_id;

    if (selectionMode === 'products') {
      return products.filter((p) => selectedProductIds.includes(p.id));
    }
    if (selectionMode === 'subcategory' && selectedSubcategoryId) {
      return products.filter((p) => (p as any).subcategory_id === selectedSubcategoryId);
    }
    if (selectionMode === 'category' && selectedCategoryId) {
      return products.filter((p) => resolveCategoryId(p) === selectedCategoryId);
    }
    return [];
  }, [selectionMode, selectedCategoryId, selectedSubcategoryId, selectedProductIds, products, subcategories]);

  const handleExecuteBatch = async () => {
    if (targetProducts.length === 0) {
      toast.error('Selecione ao menos um produto');
      return;
    }

    setIsProcessing(true);
    const productIds = targetProducts.map(p => p.id);

    try {
      switch (actionType) {
        case 'linkOptionalGroups':
          if (selectedGroupLinks.length === 0) throw new Error('Selecione ao menos um grupo');
          await batchDirectLinkOptionals.mutateAsync({ productIds, groupLinks: selectedGroupLinks });
          toast.success('Grupos vinculados com sucesso!');
          break;
        case 'active':
          await batchToggleActive.mutateAsync({ entityIds: productIds, active: activeStatus, entityType: 'product' });
          toast.success('Status atualizado!');
          break;
        // ... outras cases mapeadas para seus hooks
      }
      // Limpa seleções após sucesso
      setSelectedGroupLinks([]);
      setSelectedProductIds([]);
    } catch (error: any) {
      toast.error(error.message || 'Erro na execução');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout title="Ações em Lote">
      <div className="grid gap-6 lg:grid-cols-2 max-w-7xl mx-auto animate-fade-in">
        
        {/* PAINEL ESQUERDA: SELEÇÃO */}
        <Card className="glass-card border-none bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-tighter">
              <CheckSquare className="w-5 h-5 text-primary" /> Seleção de Produtos
            </CardTitle>
            <CardDescription className="text-xs">Escolha os alvos da ação em massa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Modo de Seleção</Label>
              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
                <TabsList className="grid w-full grid-cols-3 bg-black/20 h-11 p-1 rounded-xl">
                  <TabsTrigger value="category" className="rounded-lg text-xs">Por Categoria</TabsTrigger>
                  <TabsTrigger value="subcategory" className="rounded-lg text-xs">Por Subcategoria</TabsTrigger>
                  <TabsTrigger value="products" className="rounded-lg text-xs">Selecionar Produtos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {selectionMode === 'category' && (
              <div className="space-y-2 animate-slide-up">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Categoria</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectionMode === 'subcategory' && (
              <div className="space-y-4 animate-slide-up">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Categoria</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground">Subcategoria</Label>
                  <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                    <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl">
                      <SelectValue placeholder="Selecione uma subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        ?.filter((sub) => !selectedCategoryId || sub.category_id === selectedCategoryId)
                        .map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectionMode === 'products' && (
              <div className="space-y-2 animate-slide-up">
                <Label className="text-[10px] uppercase font-black text-muted-foreground">Produtos</Label>
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-2">
                    {productsLoading && (
                      <span className="text-xs text-muted-foreground">Carregando produtos...</span>
                    )}
                    {!productsLoading && products.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum produto encontrado.</span>
                    )}
                    {!productsLoading && products.map((product) => {
                      const checked = selectedProductIds.includes(product.id);
                      return (
                        <label
                          key={product.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs",
                            checked ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => {
                                setSelectedProductIds((prev) =>
                                  checked ? prev.filter((id) => id !== product.id) : [...prev, product.id]
                                );
                              }}
                            />
                            <span className="font-medium text-foreground">{product.name}</span>
                          </div>
                          {product.subcategory?.name && (
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {product.subcategory.name}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Contador de Impacto */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <Package className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">{targetProducts.length}</span>
                <span className="text-xs text-muted-foreground uppercase font-medium">produto(s) selecionado(s)</span>
              </div>
            </div>

            {/* Preview dos produtos impactados (para Categoria/Subcategoria) */}
            {(selectionMode === 'category' || selectionMode === 'subcategory') && (
              <div className="mt-3">
                <ScrollArea className="h-64 pr-2">
                  <div className="space-y-2">
                    {productsLoading && (
                      <span className="text-xs text-muted-foreground">Carregando produtos...</span>
                    )}
                    {!productsLoading && targetProducts.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhum produto encontrado para o filtro.</span>
                    )}
                    {!productsLoading &&
                      targetProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 rounded-lg border text-xs border-border/50 bg-background/40"
                        >
                          <span className="font-medium text-foreground">{product.name}</span>
                          {product.subcategory?.name && (
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {product.subcategory.name}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PAINEL DIREITA: AÇÃO */}
        <Card className="glass-card border-none bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-tighter">
              <Settings2 className="w-5 h-5 text-primary" /> Ação em Lote
            </CardTitle>
            <CardDescription className="text-xs">Vincule grupos opcionais aos produtos selecionados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black text-muted-foreground">Tipo de Ação</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger className="h-12 bg-black/20 border-white/5 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkOptionalGroups">
                    <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Vincular Grupo Opcional</div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2"><Power className="w-4 h-4" /> Ativar / Desativar</div>
                  </SelectItem>
                  <SelectItem value="visibility">
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4" /> Alterar Visibilidade</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'linkOptionalGroups' && (
              <div className="space-y-4 animate-slide-up">
                 <Label className="text-[10px] uppercase font-black text-primary">Grupos Opcionais disponíveis</Label>
                 <p className="text-[10px] text-muted-foreground italic">Selecione os grupos e defina as regras de escolha.</p>
                
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {optionGroupsForBatch
                      ?.filter((group: any) => group.active)
                      .map((group: any) => {
                      const isSelected = selectedGroupLinks.some(g => g.groupId === group.id);
                      return (
                        <div 
                          key={group.id} 
                          className={cn(
                            "p-4 rounded-2xl border transition-all cursor-pointer group",
                            isSelected ? "border-primary bg-primary/10 shadow-glow" : "border-white/5 bg-black/20 hover:bg-black/40"
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedGroupLinks(prev => prev.filter(g => g.groupId !== group.id));
                            } else {
                              setSelectedGroupLinks(prev => [
                                ...prev,
                                { 
                                  groupId: group.id,
                                  minSelect: group.min_select,
                                  maxSelect: group.max_select,
                                },
                              ]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} className="rounded-full" />
                              <div>
                                <p className="font-bold text-sm uppercase tracking-tight">{group.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">
                                  {group.max_select === 1 ? 'Única escolha' : 'Múltipla'} • Min: {group.min_select} Max: {group.max_select}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-white/5 text-[10px] font-black">{group.items_count} ITENS</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Button 
                  onClick={handleExecuteBatch} 
                  disabled={isProcessing || targetProducts.length === 0}
                  className="w-full h-14 btn-neon rounded-2xl font-black uppercase tracking-widest text-sm"
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    `Executar em ${targetProducts.length} produto(s)`
                  )}
              </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
