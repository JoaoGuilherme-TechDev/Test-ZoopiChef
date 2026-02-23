import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import { useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { 
  useBatchUpdateProductionLocation,
  useBatchToggleVisibility,
  useBatchToggleActive
} from '@/hooks/useBatchActions';
import { 
  useOptionGroupsForBatch,
  useBatchDirectLinkOptionGroups,
  useBatchRemoveOptionGroups,
  BatchOptionGroupLink 
} from '@/hooks/useBatchLinkOptionGroups';
import { CALC_MODE_LABELS, type OptionalCalcMode } from '@/hooks/useProductOptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Layers, Package, Settings2, CheckSquare, Building2, Printer, Eye, Power, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SelectionMode = 'category' | 'subcategory' | 'products';
type ActionType = 'linkOptionalGroups' | 'removeOptionalGroups' | 'visibility' | 'active' | 'production';

const PRODUCTION_LOCATIONS = [
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'chapa', label: 'Chapa' },
  { value: 'fritadeira', label: 'Fritadeira' },
  { value: 'forno', label: 'Forno' },
  { value: 'bar', label: 'Bar / Bebidas' },
  { value: 'frio', label: 'Frio / Saladas' },
  { value: 'montagem', label: 'Montagem' },
  { value: 'pizzaria', label: 'Pizzaria' },
];

export default function BatchActions() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: userRole } = useUserRole();
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: subcategories } = useSubcategories();
  const { data: optionGroupsForBatch } = useOptionGroupsForBatch();
  const { sectors } = usePrintSectors();

  // Batch mutations
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
  
  // Action-specific state - Optional Groups (for link and remove)
  const [selectedGroupLinks, setSelectedGroupLinks] = useState<BatchOptionGroupLink[]>([]);
  const [selectedGroupsToRemove, setSelectedGroupsToRemove] = useState<string[]>([]);
  
  // Action-specific state - Other
  const [productionLocation, setProductionLocation] = useState<string>('');
  const [visibilitySettings, setVisibilitySettings] = useState({
    aparece_delivery: true,
    aparece_garcom: true,
    aparece_totem: true,
    aparece_tablet: true,
    aparece_mesa: true,
    aparece_comanda: true,
    aparece_tv: true,
  });
  const [activeStatus, setActiveStatus] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'all') return subcategories;
    return subcategories?.filter(s => s.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  // Get products based on selection mode
  const targetProducts = useMemo(() => {
    if (selectionMode === 'products') {
      return products?.filter(p => selectedProductIds.includes(p.id)) || [];
    }
    
    if (selectionMode === 'subcategory' && selectedSubcategoryId) {
      return products?.filter(p => p.subcategory_id === selectedSubcategoryId) || [];
    }
    
    if (selectionMode === 'category' && selectedCategoryId) {
      const subIds = subcategories?.filter(s => s.category_id === selectedCategoryId).map(s => s.id) || [];
      return products?.filter(p => subIds.includes(p.subcategory_id)) || [];
    }
    
    return [];
  }, [selectionMode, selectedCategoryId, selectedSubcategoryId, selectedProductIds, products, subcategories]);

  // Show calc_mode option when products are selected (let user decide if applicable)
  const showCalcModeOption = targetProducts.length > 0;

  const handleSelectAll = () => {
    if (products) {
      if (selectedProductIds.length === products.length) {
        setSelectedProductIds([]);
      } else {
        setSelectedProductIds(products.map(p => p.id));
      }
    }
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleToggleGroupSelection = (groupId: string) => {
    setSelectedGroupLinks(prev => {
      const exists = prev.find(g => g.groupId === groupId);
      if (exists) {
        return prev.filter(g => g.groupId !== groupId);
      }
      return [...prev, { groupId }];
    });
  };

  const handleUpdateGroupLink = (groupId: string, field: keyof BatchOptionGroupLink, value: any) => {
    setSelectedGroupLinks(prev => prev.map(g => 
      g.groupId === groupId ? { ...g, [field]: value } : g
    ));
  };

  const handleToggleGroupToRemove = (groupId: string) => {
    setSelectedGroupsToRemove(prev => 
      prev.includes(groupId)
        ? prev.filter(n => n !== groupId)
        : [...prev, groupId]
    );
  };

  const handleExecuteBatch = async () => {
    if (targetProducts.length === 0) {
      toast.error('Selecione ao menos um produto');
      return;
    }

    setIsProcessing(true);

    try {
      const productIds = targetProducts.map(p => p.id);

      switch (actionType) {
        case 'linkOptionalGroups':
          if (selectedGroupLinks.length === 0) {
            toast.error('Selecione ao menos um grupo opcional');
            setIsProcessing(false);
            return;
          }
          await batchDirectLinkOptionals.mutateAsync({ productIds, groupLinks: selectedGroupLinks });
          toast.success(`Grupos opcionais vinculados a ${productIds.length} produto(s)`);
          break;

        case 'removeOptionalGroups':
          if (selectedGroupsToRemove.length === 0) {
            toast.error('Selecione ao menos um grupo opcional para remover');
            setIsProcessing(false);
            return;
          }
          await batchRemoveOptionals.mutateAsync({ productIds, groupIds: selectedGroupsToRemove });
          toast.success(`Grupos opcionais removidos de ${productIds.length} produto(s)`);
          break;

        case 'visibility':
          await batchToggleVisibility.mutateAsync({ productIds, visibility: visibilitySettings });
          toast.success(`Visibilidade atualizada em ${productIds.length} produto(s)`);
          break;

        case 'active':
          await batchToggleActive.mutateAsync({ 
            entityType: 'product', 
            entityIds: productIds, 
            active: activeStatus 
          });
          toast.success(`${productIds.length} produto(s) ${activeStatus ? 'ativado(s)' : 'desativado(s)'}`);
          break;

        case 'production':
          if (!productionLocation) {
            toast.error('Selecione o local de produção');
            setIsProcessing(false);
            return;
          }
          await batchUpdateProduction.mutateAsync({ 
            entityType: 'product', 
            entityIds: productIds, 
            productionLocation 
          });
          toast.success(`Local de produção definido para ${productIds.length} produto(s)`);
          break;
      }

      // Reset selections
      setSelectedGroupLinks([]);
      setSelectedGroupsToRemove([]);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao executar ação em lote');
    } finally {
      setIsProcessing(false);
    }
  };

  if (companyLoading) {
    return (
      <DashboardLayout title="Ações em Lote">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Ações em Lote">
        <Card className="max-w-lg mx-auto border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="w-5 h-5 text-warning" />
              Empresa não configurada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure sua empresa primeiro.
            </p>
            <Button onClick={() => navigate('/company')}>
              Configurar empresa
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Ações em Lote">
        <Card className="max-w-lg mx-auto border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apenas administradores podem executar ações em lote.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ações em Lote">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Seleção de Produtos
            </CardTitle>
            <CardDescription>
              Escolha como selecionar os produtos que receberão a ação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modo de Seleção</Label>
              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as SelectionMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="category">Por Categoria</TabsTrigger>
                  <TabsTrigger value="subcategory">Por Subcategoria</TabsTrigger>
                  <TabsTrigger value="products">Selecionar Produtos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {selectionMode === 'category' && (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({products?.filter(p => 
                          subcategories?.find(s => s.id === p.subcategory_id)?.category_id === cat.id
                        ).length || 0} produtos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectionMode === 'subcategory' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria (filtro)</Label>
                  <Select value={selectedCategoryId} onValueChange={(v) => {
                    setSelectedCategoryId(v);
                    setSelectedSubcategoryId('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subcategoria</Label>
                  <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.category?.name} → {sub.name} ({products?.filter(p => p.subcategory_id === sub.id).length || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {selectionMode === 'products' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Produtos</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedProductIds.length === products?.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {products?.map((product) => (
                      <div 
                        key={product.id} 
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted"
                      >
                        <Checkbox
                          id={product.id}
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => handleToggleProduct(product.id)}
                        />
                        <label htmlFor={product.id} className="flex-1 text-sm cursor-pointer">
                          {product.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                <span className="font-medium">{targetProducts.length}</span>
                <span className="text-muted-foreground">produto(s) selecionado(s)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Ação em Lote
            </CardTitle>
            <CardDescription>
              Vincule grupos opcionais (sabores, bordas, bebidas) aos produtos selecionados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkOptionalGroups">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Vincular Grupo Opcional
                    </div>
                  </SelectItem>
                  <SelectItem value="removeOptionalGroups">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Remover Grupo Opcional
                    </div>
                  </SelectItem>
                  <SelectItem value="visibility">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Alterar Visibilidade
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <Power className="w-4 h-4" />
                      Ativar / Desativar
                    </div>
                  </SelectItem>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      Local de Produção
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* VINCULAR GRUPO OPCIONAL */}
            {actionType === 'linkOptionalGroups' && (
              <div className="space-y-4">
                 <Label>Grupos Opcionais disponíveis</Label>
                 <p className="text-xs text-muted-foreground">
                   Passo a passo: selecione os grupos (ex: “Escolha o sabor”, “Escolha a borda”, “Escolha o refri”) e defina ordem/min/max.
                 </p>
                <ScrollArea className="h-[350px] border rounded-lg p-3">
                  <div className="space-y-3">
                    {(!optionGroupsForBatch || optionGroupsForBatch.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum grupo opcional cadastrado
                      </p>
                    )}
                    {optionGroupsForBatch?.map((group) => {
                      const isSelected = selectedGroupLinks.some(g => g.groupId === group.id);
                      const linkConfig = selectedGroupLinks.find(g => g.groupId === group.id);
                      
                      return (
                        <div 
                          key={group.id} 
                          className={`border rounded-lg p-3 transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`group-${group.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleGroupSelection(group.id)}
                            />
                            <label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{group.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {group.items_count} itens
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {group.max_select === 1 ? 'Única escolha' : 'Múltipla escolha'} • 
                                Min: {group.min_select} • Max: {group.max_select}
                              </p>
                            </label>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Min Select</Label>
                                <Input 
                                  type="number" 
                                  min={0}
                                  placeholder={String(group.min_select)}
                                  value={linkConfig?.minSelect ?? ''}
                                  onChange={(e) => handleUpdateGroupLink(group.id, 'minSelect', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Max Select</Label>
                                <Input 
                                  type="number" 
                                  min={1}
                                  placeholder={String(group.max_select)}
                                  value={linkConfig?.maxSelect ?? ''}
                                  onChange={(e) => handleUpdateGroupLink(group.id, 'maxSelect', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Ordem de Exibição</Label>
                                <Input 
                                  type="number" 
                                  min={0}
                                  step={10}
                                  placeholder="10"
                                  value={linkConfig?.sortOrder ?? ''}
                                  onChange={(e) => handleUpdateGroupLink(group.id, 'sortOrder', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="h-8"
                                />
                              </div>
                                 {showCalcModeOption && (
                                 <div className="space-y-1">
                                   <Label className="text-xs">Modo de Cálculo (Pizza)</Label>
                                  <Select 
                                    value={linkConfig?.calcMode || ''} 
                                    onValueChange={(v) => handleUpdateGroupLink(group.id, 'calcMode', v as OptionalCalcMode)}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Padrão" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(CALC_MODE_LABELS).map(([mode, label]) => (
                                        <SelectItem key={mode} value={mode}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedGroupLinks.length} grupo(s) selecionado(s) para vincular
                </p>
              </div>
            )}

            {/* REMOVER GRUPO OPCIONAL */}
            {actionType === 'removeOptionalGroups' && (
              <div className="space-y-4">
                <Label>Grupos Opcionais para remover</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione os grupos que serão removidos dos produtos selecionados
                </p>
                <ScrollArea className="h-[350px] border rounded-lg p-3">
                  <div className="space-y-2">
                    {optionGroupsForBatch?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum grupo opcional cadastrado
                      </p>
                    )}
                    {optionGroupsForBatch?.map((group) => {
                      const isSelected = selectedGroupsToRemove.includes(group.id);
                      
                      return (
                        <div 
                          key={group.id} 
                          className={`border rounded-lg p-3 transition-colors ${isSelected ? 'border-destructive bg-destructive/5' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`remove-group-${group.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleGroupToRemove(group.id)}
                            />
                            <label htmlFor={`remove-group-${group.id}`} className="flex-1 cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{group.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {group.items_count} itens
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {group.max_select === 1 ? 'Única escolha' : 'Múltipla escolha'}
                              </p>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {selectedGroupsToRemove.length} grupo(s) selecionado(s) para remover
                </p>
              </div>
            )}

            {/* VISIBILIDADE */}
            {actionType === 'visibility' && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'aparece_delivery', label: 'Delivery', desc: 'Exibir no cardápio delivery' },
                  { key: 'aparece_garcom', label: 'App Garçom', desc: 'Exibir no app do garçom' },
                  { key: 'aparece_totem', label: 'Totem', desc: 'Exibir no totem autoatendimento' },
                  { key: 'aparece_tablet', label: 'Tablet', desc: 'Exibir no tablet de mesa' },
                  { key: 'aparece_mesa', label: 'Mesa', desc: 'Exibir em pedidos de mesa' },
                  { key: 'aparece_comanda', label: 'Comanda', desc: 'Exibir em comandas' },
                  { key: 'aparece_tv', label: 'TV', desc: 'Exibir na TV do estabelecimento' },
                ].map((channel) => (
                  <div key={channel.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>{channel.label}</Label>
                      <p className="text-xs text-muted-foreground">{channel.desc}</p>
                    </div>
                    <Switch
                      checked={visibilitySettings[channel.key as keyof typeof visibilitySettings]}
                      onCheckedChange={(checked) => 
                        setVisibilitySettings(prev => ({ ...prev, [channel.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ATIVAR/DESATIVAR */}
            {actionType === 'active' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Status</Label>
                    <p className="text-xs text-muted-foreground">
                      {activeStatus ? 'Ativar todos os produtos selecionados' : 'Desativar todos os produtos selecionados'}
                    </p>
                  </div>
                  <Switch
                    checked={activeStatus}
                    onCheckedChange={setActiveStatus}
                  />
                </div>
              </div>
            )}

            {/* LOCAL DE PRODUÇÃO */}
            {actionType === 'production' && (
              <div className="space-y-2">
                <Label>Local de Produção</Label>
                <Select value={productionLocation} onValueChange={setProductionLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_LOCATIONS.map((loc) => (
                      <SelectItem key={loc.value} value={loc.value}>
                        {loc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="pt-4">
              <Button 
                onClick={handleExecuteBatch} 
                disabled={isProcessing || targetProducts.length === 0}
                className="w-full"
                size="lg"
              >
                {isProcessing ? 'Processando...' : `Executar em ${targetProducts.length} produto(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
