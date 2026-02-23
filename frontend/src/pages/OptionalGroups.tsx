import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompany } from '@/hooks/useCompany';
import {
  useOptionalGroups,
  useCreateOptionalGroup,
  useUpdateOptionalGroup,
  useDeleteOptionalGroup,
  useCreateOptionalGroupItem,
  useUpdateOptionalGroupItem,
  useDeleteOptionalGroupItem,
  useSyncProductsToGroup,
  OptionalGroup,
  OptionalGroupItem,
  OptionalGroupSourceType,
} from '@/hooks/useOptionalGroups';
import { useActiveFlavorGroups, FlavorGroup } from '@/hooks/useFlavorGroups';
import { useFlavors, Flavor } from '@/hooks/useFlavors';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useProducts } from '@/hooks/useProducts';
import { CreateFlavorGroupDialog } from '@/components/flavors/CreateFlavorGroupDialog';
import { FlavorPricesEditor } from '@/components/flavors/FlavorPricesEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Layers, Plus, Pencil, Trash2, GripVertical, Package, Pizza, Download, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function OptionalGroups() {
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: groups, isLoading: groupsLoading } = useOptionalGroups();
  const { data: flavorGroups = [] } = useActiveFlavorGroups();
  const { data: allFlavors = [] } = useFlavors();
  const { data: subcategories = [] } = useSubcategories();
  const { data: allProducts = [] } = useProducts();
  
  const createGroup = useCreateOptionalGroup();
  const updateGroup = useUpdateOptionalGroup();
  const deleteGroup = useDeleteOptionalGroup();
  const createItem = useCreateOptionalGroupItem();
  const updateItem = useUpdateOptionalGroupItem();
  const deleteItem = useDeleteOptionalGroupItem();
  const syncProducts = useSyncProductsToGroup();

  // Group form state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionalGroup | null>(null);
  const [showInactiveSubcategories, setShowInactiveSubcategories] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    min_select: 0,
    max_select: 1,
    required: false,
    selection_unique: false,
    active: true,
    source_type: 'manual' as OptionalGroupSourceType,
    flavor_group_id: '',
    subcategory_id: '',
    calc_mode: '' as string,
  });

  // Filter subcategories based on showInactive toggle
  const filteredSubcategories = showInactiveSubcategories 
    ? subcategories 
    : subcategories.filter(s => s.active);

  // Item form state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OptionalGroupItem | null>(null);
  const [itemGroupId, setItemGroupId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    label: '',
    price_delta: 0,
    price_override: null as number | null,
    sort_order: 10,
    active: true,
  });

  const resetGroupForm = () => {
    setGroupForm({
      name: '',
      min_select: 0,
      max_select: 1,
      required: false,
      selection_unique: false,
      active: true,
      source_type: 'manual',
      flavor_group_id: '',
      subcategory_id: '',
      calc_mode: '',
    });
    setEditingGroup(null);
  };

  const resetItemForm = () => {
    setItemForm({
      label: '',
      price_delta: 0,
      price_override: null,
      sort_order: 10,
      active: true,
    });
    setEditingItem(null);
    setItemGroupId(null);
  };

  const handleOpenGroupDialog = (group?: OptionalGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        min_select: group.min_select,
        max_select: group.max_select,
        required: group.required,
        selection_unique: group.selection_unique,
        active: group.active,
        source_type: group.source_type || 'manual',
        flavor_group_id: group.flavor_group_id || '',
        subcategory_id: group.subcategory_id || '',
        calc_mode: (group as any).calc_mode || '',
      });
    } else {
      resetGroupForm();
    }
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    if (groupForm.source_type === 'flavors' && !groupForm.flavor_group_id) {
      toast.error('Selecione um grupo de sabor');
      return;
    }

    if (groupForm.source_type === 'products' && !groupForm.subcategory_id) {
      toast.error('Selecione uma subcategoria');
      return;
    }

    try {
      const dataToSave = {
        ...groupForm,
        flavor_group_id: groupForm.source_type === 'flavors' ? groupForm.flavor_group_id : null,
        subcategory_id: groupForm.source_type === 'products' ? groupForm.subcategory_id : null,
        calc_mode: groupForm.source_type === 'flavors' && groupForm.calc_mode ? groupForm.calc_mode : null,
      };

      if (editingGroup) {
        await updateGroup.mutateAsync({ id: editingGroup.id, ...dataToSave });
        toast.success('Grupo atualizado');
      } else {
        await createGroup.mutateAsync(dataToSave);
        toast.success('Grupo criado');
      }
      setGroupDialogOpen(false);
      resetGroupForm();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar grupo');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteGroup.mutateAsync(id);
      toast.success('Grupo excluído');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir grupo');
    }
  };

  const handleOpenItemDialog = (groupId: string, item?: OptionalGroupItem) => {
    setItemGroupId(groupId);
    if (item) {
      setEditingItem(item);
      setItemForm({
        label: item.label,
        price_delta: item.price_delta,
        price_override: item.price_override ?? null,
        sort_order: item.sort_order,
        active: item.active,
      });
    } else {
      // Calculate next sort_order
      const group = groups?.find(g => g.id === groupId);
      const maxOrder = group?.items?.reduce((max, i) => Math.max(max, i.sort_order), 0) || 0;
      setItemForm({
        label: '',
        price_delta: 0,
        price_override: null,
        sort_order: maxOrder + 10,
        active: true,
      });
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.label.trim() || !itemGroupId) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    try {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, ...itemForm });
        toast.success('Item atualizado');
      } else {
        await createItem.mutateAsync({
          optional_group_id: itemGroupId,
          flavor_id: null,
          product_id: null,
          price_override: null,
          ...itemForm,
        });
        toast.success('Item criado');
      }
      setItemDialogOpen(false);
      resetItemForm();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success('Item excluído');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir item');
    }
  };

  // Toggle rápido de ativo/inativo do item
  const handleQuickToggleItemActive = async (itemId: string, currentActive: boolean) => {
    try {
      await updateItem.mutateAsync({ id: itemId, active: !currentActive });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar item');
    }
  };

  if (companyLoading || groupsLoading) {
    return (
      <DashboardLayout title="Grupos Opcionais">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout title="Grupos Opcionais">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Empresa não configurada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configure sua empresa primeiro.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Grupos Opcionais">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Grupos Opcionais (Master)
              </CardTitle>
              <CardDescription>
                Cadastre grupos como "Escolha sua borda", "Escolha seu refri" e adicione os itens de cada grupo.
                Depois vincule-os aos produtos via "Ações em Lote".
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenGroupDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
          </CardHeader>
          <CardContent>
            {(!groups || groups.length === 0) ? (
              <div className="text-center py-12 space-y-3">
                <Layers className="w-12 h-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhum grupo opcional cadastrado</p>
                <Button variant="outline" onClick={() => handleOpenGroupDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro grupo
                </Button>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-2">
                {groups.map((group) => (
                  <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{group.name}</span>
                        <Badge variant={group.active ? 'default' : 'secondary'}>
                          {group.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline">
                          {group.items?.length || 0} itens
                        </Badge>
                        <Badge variant="outline">
                          Min: {group.min_select} / Max: {group.max_select}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenGroupDialog(group)}>
                              <Pencil className="w-3 h-3 mr-1" />
                              Editar Grupo
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Todos os itens do grupo serão excluídos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {/* Import products button for source_type = 'products' */}
                          {group.source_type === 'products' && group.subcategory_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  const result = await syncProducts.mutateAsync({ 
                                    groupId: group.id, 
                                    subcategoryId: group.subcategory_id! 
                                  });
                                  if (result.inserted > 0) {
                                    toast.success(`${result.inserted} produto(s) importado(s)!`);
                                  } else {
                                    toast.info('Todos os produtos já estão no grupo.');
                                  }
                                } catch (e: any) {
                                  toast.error(e.message || 'Erro ao importar produtos');
                                }
                              }}
                              disabled={syncProducts.isPending}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Importar Produtos
                            </Button>
                          )}
                          <Button size="sm" onClick={() => handleOpenItemDialog(group.id)}>
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar Item
                          </Button>
                        </div>

                        <div className="border rounded-lg">
                          {(!group.items || group.items.length === 0) ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Nenhum item cadastrado neste grupo
                            </div>
                          ) : (
                            <ScrollArea className="max-h-[300px]">
                              <div className="divide-y">
                                {group.items
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map((item) => {
                                    const displayPrice = item.price_override ?? item.price_delta;
                                    return (
                                    <div key={item.id} className={`flex items-center justify-between p-3 hover:bg-muted/50 ${!item.active ? 'opacity-60' : ''}`}>
                                      <div className="flex items-center gap-3">
                                        {/* Botão de toggle rápido - Joinha */}
                                        <button
                                          type="button"
                                          onClick={() => handleQuickToggleItemActive(item.id, item.active)}
                                          className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
                                            item.active 
                                              ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' 
                                              : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                                          }`}
                                          title={item.active ? 'Ativo - Clique para desativar' : 'Inativo - Clique para ativar'}
                                        >
                                          {item.active ? (
                                            <ThumbsUp className="w-4 h-4" />
                                          ) : (
                                            <ThumbsDown className="w-4 h-4" />
                                          )}
                                        </button>
                                        <span className={!item.active ? 'text-muted-foreground line-through' : ''}>
                                          {item.label}
                                        </span>
                                        {item.product_id && (
                                          <Badge variant="secondary" className="text-xs">
                                            <Package className="w-3 h-3 mr-1" />
                                            Produto
                                          </Badge>
                                        )}
                                        {displayPrice !== 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            R$ {displayPrice.toFixed(2)}
                                          </Badge>
                                        )}
                                        {displayPrice === 0 && (
                                          <Badge variant="outline" className="text-xs text-emerald-600">
                                            Grátis
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenItemDialog(group.id, item)}>
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Excluir item?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Esta ação não pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                                Excluir
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar Grupo' : 'Novo Grupo Opcional'}</DialogTitle>
            <DialogDescription>
              Grupos são as perguntas como "Escolha sua borda", "Escolha seu refri", etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Grupo *</Label>
              <Input
                placeholder="Ex: Escolha sua borda"
                value={groupForm.name}
                onChange={(e) => setGroupForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Origem dos itens</Label>
              <Select 
                value={groupForm.source_type} 
                onValueChange={(v) => setGroupForm(f => ({ ...f, source_type: v as OptionalGroupSourceType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (cadastrar itens um a um)</SelectItem>
                  <SelectItem value="flavors">Sabores (de um Grupo de Sabor)</SelectItem>
                  <SelectItem value="products">Produtos (de uma Subcategoria)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {groupForm.source_type === 'manual' && 'Você cadastra cada item manualmente (ex: Catupiry, Cheddar)'}
                {groupForm.source_type === 'flavors' && 'Importa sabores de um Grupo de Sabor cadastrado'}
                {groupForm.source_type === 'products' && 'Importa produtos de uma Subcategoria (ex: Refrigerantes, Bebidas)'}
              </p>
            </div>

            {groupForm.source_type === 'flavors' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Grupo de Sabor *</Label>
                    <CreateFlavorGroupDialog
                      triggerLabel="Criar grupo de sabor"
                      onCreated={(id) => setGroupForm((f) => ({ ...f, flavor_group_id: id }))}
                    />
                  </div>
                  <Select
                    value={groupForm.flavor_group_id}
                    onValueChange={(v) => setGroupForm((f) => ({ ...f, flavor_group_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo de sabor" />
                    </SelectTrigger>
                    <SelectContent>
                      {flavorGroups.map((fg) => (
                        <SelectItem key={fg.id} value={fg.id}>
                          <span className="flex items-center gap-2">
                            <Pizza className="w-4 h-4" />
                            {fg.name}
                          </span>
                        </SelectItem>
                      ))}
                      {flavorGroups.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum grupo de sabor cadastrado (crie um acima)
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Os itens deste grupo serão importados automaticamente (os nomes você define no cadastro de sabores).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fórmula de Cálculo</Label>
                  <Select 
                    value={groupForm.calc_mode} 
                    onValueChange={(v) => setGroupForm(f => ({ ...f, calc_mode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de cálculo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max_part_value">
                        Pela maior (mais comum)
                      </SelectItem>
                      <SelectItem value="sum_each_part">
                        Soma = Valor de cada parte
                      </SelectItem>
                      <SelectItem value="proportional">
                        Proporcional = Base + Sabor
                      </SelectItem>
                      <SelectItem value="pizza_total_split">
                        Total no item = Exibe valor da pizza
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {groupForm.calc_mode === 'max_part_value' && 'Cobra o valor do sabor mais caro (ex: 1/2 R$60 + 1/2 R$80 = R$80)'}
                    {groupForm.calc_mode === 'sum_each_part' && 'Soma o valor proporcional de cada parte (ex: 1/2 R$60 + 1/2 R$80 = R$70)'}
                    {groupForm.calc_mode === 'proportional' && 'Preço base do produto + valor proporcional do sabor'}
                    {groupForm.calc_mode === 'pizza_total_split' && 'Mostra o valor total e o sistema exibe a divisão por parte'}
                    {!groupForm.calc_mode && 'Escolha como o sistema calculará o valor quando o cliente selecionar múltiplos sabores'}
                  </p>
                </div>

                {/* Flavor prices editor */}
                {groupForm.flavor_group_id && (
                  <FlavorPricesEditor 
                    key={groupForm.flavor_group_id} 
                    flavorGroupId={groupForm.flavor_group_id} 
                  />
                )}
              </>
            )}

            {groupForm.source_type === 'products' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subcategoria *</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInactiveSubcategories}
                      onChange={(e) => setShowInactiveSubcategories(e.target.checked)}
                      className="rounded border-muted"
                    />
                    Mostrar inativas
                  </label>
                </div>
                <Select
                  value={groupForm.subcategory_id}
                  onValueChange={(v) => setGroupForm((f) => ({ ...f, subcategory_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        <span className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          {sub.category?.name ? `${sub.category.name} → ${sub.name}` : sub.name}
                          {!sub.active && <Badge variant="secondary" className="text-xs ml-1">Inativa</Badge>}
                        </span>
                      </SelectItem>
                    ))}
                    {filteredSubcategories.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {showInactiveSubcategories 
                          ? 'Nenhuma subcategoria cadastrada' 
                          : 'Nenhuma subcategoria ativa. Marque "Mostrar inativas" ou crie uma nova.'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Todos os produtos ativos dessa subcategoria serão importados como opções.
                </p>
                {/* Preview products */}
                {groupForm.subcategory_id && (
                  <div className="bg-muted/50 rounded p-3 mt-2">
                    <p className="text-xs font-medium mb-2">Produtos que serão importados:</p>
                    <div className="flex flex-wrap gap-1">
                      {allProducts.filter(p => p.subcategory_id === groupForm.subcategory_id && p.active).map(p => (
                        <Badge key={p.id} variant="outline" className="text-xs">{p.name}</Badge>
                      ))}
                      {allProducts.filter(p => p.subcategory_id === groupForm.subcategory_id && p.active).length === 0 && (
                        <span className="text-xs text-muted-foreground">Nenhum produto encontrado</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mínimo de seleções</Label>
                <Input
                  type="number"
                  min={0}
                  value={groupForm.min_select}
                  onChange={(e) => setGroupForm(f => ({ ...f, min_select: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo de seleções</Label>
                <Input
                  type="number"
                  min={1}
                  value={groupForm.max_select}
                  onChange={(e) => setGroupForm(f => ({ ...f, max_select: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Obrigatório</Label>
              <Switch
                checked={groupForm.required}
                onCheckedChange={(v) => setGroupForm(f => ({ ...f, required: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Seleção única por item</Label>
              <Switch
                checked={groupForm.selection_unique}
                onCheckedChange={(v) => setGroupForm(f => ({ ...f, selection_unique: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={groupForm.active}
                onCheckedChange={(v) => setGroupForm(f => ({ ...f, active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveGroup} disabled={createGroup.isPending || updateGroup.isPending}>
              {editingGroup ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            <DialogDescription>
              Itens são as opções como "Catupiry", "Cheddar", "Coca-Cola", etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input
                placeholder="Ex: Catupiry"
                value={itemForm.label}
                onChange={(e) => setItemForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor no Grupo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0,00 = grátis"
                  value={itemForm.price_override ?? ''}
                  onChange={(e) => setItemForm(f => ({ 
                    ...f, 
                    price_override: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Valor cobrado quando selecionado como adicional
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={1}
                  value={itemForm.sort_order}
                  onChange={(e) => setItemForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={itemForm.active}
                onCheckedChange={(v) => setItemForm(f => ({ ...f, active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={createItem.isPending || updateItem.isPending}>
              {editingItem ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
