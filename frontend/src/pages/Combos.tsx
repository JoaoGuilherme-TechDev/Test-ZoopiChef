import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProducts } from '@/hooks/useProducts';
import { useCompany } from '@/hooks/useCompany';
import {
  useCombos,
  useCreateCombo,
  useUpdateCombo,
  useDeleteCombo,
  useCreateComboGroup,
  useUpdateComboGroup,
  useDeleteComboGroup,
  useAddProductsToGroup,
  useUpdateComboGroupItem,
  useDeleteComboGroupItem,
  COMBO_TYPE_LABELS,
  FISCAL_MODE_LABELS,
  type Combo,
  type ComboType,
  type FiscalMode,
  type ComboGroup,
  type ComboGroupItem,
} from '@/hooks/useCombos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Layers,
  DollarSign,
  FileText,
  ChevronRight,
  GripVertical,
  Search,
  Image as ImageIcon,
} from 'lucide-react';

interface ComboFormState {
  name: string;
  description: string;
  image_url: string;
  combo_type: ComboType;
  price: string;
  fiscal_mode: FiscalMode;
  active: boolean;
}

const defaultFormState: ComboFormState = {
  name: '',
  description: '',
  image_url: '',
  combo_type: 'fixed',
  price: '',
  fiscal_mode: 'auto',
  active: true,
};

export default function Combos() {
  const { data: company } = useCompany();
  const { data: combos, isLoading } = useCombos();
  const { data: products } = useProducts();
  const createCombo = useCreateCombo();
  const updateCombo = useUpdateCombo();
  const deleteCombo = useDeleteCombo();
  const createGroup = useCreateComboGroup();
  const updateGroup = useUpdateComboGroup();
  const deleteGroup = useDeleteComboGroup();
  const addProductsToGroup = useAddProductsToGroup();
  const updateItem = useUpdateComboGroupItem();
  const deleteItem = useDeleteComboGroupItem();

  // Dialog states
  const [isComboDialogOpen, setIsComboDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboForm, setComboForm] = useState<ComboFormState>(defaultFormState);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Group dialog
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    min_select: 1,
    max_select: 1,
    required: true,
  });
  const [editingGroup, setEditingGroup] = useState<ComboGroup | null>(null);

  // Product selection dialog
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Item edit dialog
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ComboGroupItem | null>(null);
  const [editingItemComboType, setEditingItemComboType] = useState<ComboType>('fixed');
  const [editingItemFiscalMode, setEditingItemFiscalMode] = useState<FiscalMode>('auto');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const search = productSearch.toLowerCase();
    return products.filter(p => 
      p.active && 
      (p.name.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search))
    );
  }, [products, productSearch]);

  // ============ Combo Handlers ============

  const handleOpenComboDialog = (combo?: Combo) => {
    if (combo) {
      setEditingCombo(combo);
      setComboForm({
        name: combo.name,
        description: combo.description || '',
        image_url: combo.image_url || '',
        combo_type: combo.combo_type,
        price: combo.price.toString().replace('.', ','),
        fiscal_mode: combo.fiscal_mode,
        active: combo.active,
      });
    } else {
      setEditingCombo(null);
      setComboForm(defaultFormState);
    }
    setIsComboDialogOpen(true);
  };

  const handleSaveCombo = async () => {
    if (!comboForm.name.trim()) {
      toast.error('Nome do combo é obrigatório');
      return;
    }

    const priceNumber = parseFloat(comboForm.price.replace(',', '.')) || 0;

    try {
      if (editingCombo) {
        await updateCombo.mutateAsync({
          id: editingCombo.id,
          name: comboForm.name,
          description: comboForm.description || null,
          image_url: comboForm.image_url || null,
          combo_type: comboForm.combo_type,
          price: priceNumber,
          fiscal_mode: comboForm.fiscal_mode,
          active: comboForm.active,
        });
      } else {
        await createCombo.mutateAsync({
          name: comboForm.name,
          description: comboForm.description || undefined,
          image_url: comboForm.image_url || undefined,
          combo_type: comboForm.combo_type,
          price: priceNumber,
          fiscal_mode: comboForm.fiscal_mode,
          active: comboForm.active,
        });
      }
      setIsComboDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteCombo = async () => {
    if (!deleteConfirmId) return;
    await deleteCombo.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // ============ Group Handlers ============

  const handleOpenGroupDialog = (comboId: string, group?: ComboGroup) => {
    setSelectedComboId(comboId);
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        name: group.name,
        description: group.description || '',
        min_select: group.min_select,
        max_select: group.max_select,
        required: group.required,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        name: '',
        description: '',
        min_select: 1,
        max_select: 1,
        required: true,
      });
    }
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim() || !selectedComboId) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          name: groupForm.name,
          description: groupForm.description || undefined,
          min_select: groupForm.min_select,
          max_select: groupForm.max_select,
          required: groupForm.required,
        });
      } else {
        await createGroup.mutateAsync({
          combo_id: selectedComboId,
          name: groupForm.name,
          description: groupForm.description || undefined,
          min_select: groupForm.min_select,
          max_select: groupForm.max_select,
          required: groupForm.required,
        });
      }
      setIsGroupDialogOpen(false);
      toast.success(editingGroup ? 'Grupo atualizado!' : 'Grupo criado!');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup.mutateAsync(groupId);
  };

  // ============ Product Selection Handlers ============

  const handleOpenProductDialog = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedProductIds([]);
    setProductSearch('');
    setIsProductDialogOpen(true);
  };

  const handleAddProducts = async () => {
    if (!selectedGroupId || selectedProductIds.length === 0) return;

    await addProductsToGroup.mutateAsync({
      groupId: selectedGroupId,
      productIds: selectedProductIds,
    });
    setIsProductDialogOpen(false);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // ============ Item Edit Handlers ============

  const handleOpenItemDialog = (item: ComboGroupItem, comboType: ComboType, fiscalMode: FiscalMode) => {
    setEditingItem(item);
    setEditingItemComboType(comboType);
    setEditingItemFiscalMode(fiscalMode);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async (updates: Partial<ComboGroupItem>) => {
    if (!editingItem) return;

    await updateItem.mutateAsync({
      id: editingItem.id,
      ...updates,
    });
    setIsItemDialogOpen(false);
    toast.success('Item atualizado!');
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem.mutateAsync(itemId);
  };

  // ============ Render ============

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="h-8 w-8 text-primary" />
              Combos
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie combos promocionais com configuração fiscal inteligente
            </p>
          </div>
          <Button onClick={() => handleOpenComboDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Combo
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{combos?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Combos Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Package className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {combos?.filter(c => c.active).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {combos?.filter(c => c.fiscal_mode === 'auto').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Fiscal Automático</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combos List */}
        {combos?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum combo cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie combos para agrupar produtos com preço especial
              </p>
              <Button onClick={() => handleOpenComboDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Combo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {combos?.map((combo) => (
              <Card key={combo.id} className={!combo.active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {combo.image_url ? (
                        <img
                          src={combo.image_url}
                          alt={combo.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {combo.name}
                          {!combo.active && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{combo.description}</CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {COMBO_TYPE_LABELS[combo.combo_type]}
                          </Badge>
                          <Badge variant="outline" className="text-orange-600">
                            {FISCAL_MODE_LABELS[combo.fiscal_mode]}
                          </Badge>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(combo.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenComboDialog(combo)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(combo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Groups Accordion */}
                  <Accordion type="multiple" className="w-full">
                    {combo.groups?.map((group) => (
                      <AccordionItem key={group.id} value={group.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{group.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({group.min_select === group.max_select 
                                  ? `Escolha ${group.min_select}` 
                                  : `${group.min_select} a ${group.max_select}`})
                              </span>
                              {group.required && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Obrigatório
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-7 space-y-2">
                            {/* Group Actions */}
                            <div className="flex items-center gap-2 mb-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenProductDialog(group.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Importar Produtos
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenGroupDialog(combo.id, group)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar Grupo
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDeleteGroup(group.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Excluir Grupo
                              </Button>
                            </div>

                            {/* Items */}
                            {group.items?.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4">
                                Nenhum produto neste grupo. Clique em "Importar Produtos" para adicionar.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {group.items?.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      {item.product?.image_url ? (
                                        <img
                                          src={item.product.image_url}
                                          alt={item.product.name}
                                          className="h-10 w-10 rounded object-cover"
                                        />
                                      ) : (
                                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-medium">{item.product?.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          {combo.combo_type === 'selectable' && item.additional_price > 0 && (
                                            <span className="text-orange-600">
                                              +{formatCurrency(item.additional_price)}
                                            </span>
                                          )}
                                          {combo.combo_type === 'aggregate' && (
                                            <span>
                                              {item.inherit_price 
                                                ? `Herda: ${formatCurrency(item.product?.price || 0)}`
                                                : `Valor: ${formatCurrency(item.custom_price || 0)}`
                                              }
                                            </span>
                                          )}
                                          {combo.fiscal_mode === 'manual' && item.fiscal_override && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.fiscal_override.toUpperCase()}
                                            </Badge>
                                          )}
                                          {item.is_default && (
                                            <Badge className="text-xs">Padrão</Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenItemDialog(item, combo.combo_type, combo.fiscal_mode)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteItem(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  {/* Add Group Button */}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleOpenGroupDialog(combo.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Grupo de Seleção
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Combo Dialog */}
        <Dialog open={isComboDialogOpen} onOpenChange={setIsComboDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCombo ? 'Editar Combo' : 'Novo Combo'}
              </DialogTitle>
              <DialogDescription>
                Configure as informações do combo promocional
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Combo *</Label>
                  <Input
                    id="name"
                    value={comboForm.name}
                    onChange={(e) => setComboForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Combo Família"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço Base</Label>
                  <Input
                    id="price"
                    value={comboForm.price}
                    onChange={(e) => setComboForm(prev => ({ ...prev, price: e.target.value.replace(/[^\d,]/g, '') }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={comboForm.description}
                  onChange={(e) => setComboForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do combo..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  value={comboForm.image_url}
                  onChange={(e) => setComboForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo do Combo</Label>
                  <Select
                    value={comboForm.combo_type}
                    onValueChange={(v) => setComboForm(prev => ({ ...prev, combo_type: v as ComboType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">
                        <div>
                          <p className="font-medium">Preço Fixo (Não Altera)</p>
                          <p className="text-xs text-muted-foreground">Itens definidos, sem escolha</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="selectable">
                        <div>
                          <p className="font-medium">Preço Fixo (Escolhe Itens)</p>
                          <p className="text-xs text-muted-foreground">Cliente escolhe entre opções</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="aggregate">
                        <div>
                          <p className="font-medium">Agrega Valor</p>
                          <p className="text-xs text-muted-foreground">Soma dos itens escolhidos</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modo Fiscal</Label>
                  <Select
                    value={comboForm.fiscal_mode}
                    onValueChange={(v) => setComboForm(prev => ({ ...prev, fiscal_mode: v as FiscalMode }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div>
                          <p className="font-medium">Automático</p>
                          <p className="text-xs text-muted-foreground">Maior valor = ST, menor = ICMS</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div>
                          <p className="font-medium">Manual</p>
                          <p className="text-xs text-muted-foreground">Defina ST/ICMS por item</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={comboForm.active}
                  onCheckedChange={(checked) => setComboForm(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Combo Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComboDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveCombo}
                disabled={createCombo.isPending || updateCombo.isPending}
              >
                {editingCombo ? 'Salvar' : 'Criar Combo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Group Dialog */}
        <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo de Seleção'}
              </DialogTitle>
              <DialogDescription>
                Configure as regras de seleção do grupo
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nome do Grupo *</Label>
                <Input
                  id="group-name"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Escolha seu lanche"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Descrição</Label>
                <Input
                  id="group-description"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Instruções para o cliente..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-select">Mínimo de Seleções</Label>
                  <Input
                    id="min-select"
                    type="number"
                    min={0}
                    value={groupForm.min_select}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, min_select: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-select">Máximo de Seleções</Label>
                  <Input
                    id="max-select"
                    type="number"
                    min={1}
                    value={groupForm.max_select}
                    onChange={(e) => setGroupForm(prev => ({ ...prev, max_select: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="required"
                  checked={groupForm.required}
                  onCheckedChange={(checked) => setGroupForm(prev => ({ ...prev, required: checked }))}
                />
                <Label htmlFor="required">Grupo Obrigatório</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveGroup}
                disabled={createGroup.isPending || updateGroup.isPending}
              >
                {editingGroup ? 'Salvar' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Selection Dialog */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Importar Produtos</DialogTitle>
              <DialogDescription>
                Selecione os produtos cadastrados para adicionar ao grupo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedProductIds.includes(product.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleProductSelection(product.id)}
                    >
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {filteredProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum produto encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <div className="flex items-center gap-4 w-full">
                <span className="text-sm text-muted-foreground">
                  {selectedProductIds.length} produto(s) selecionado(s)
                </span>
                <div className="flex-1" />
                <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddProducts}
                  disabled={selectedProductIds.length === 0 || addProductsToGroup.isPending}
                >
                  Adicionar Produtos
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Edit Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Item</DialogTitle>
              <DialogDescription>
                Ajuste as configurações do produto dentro do combo
              </DialogDescription>
            </DialogHeader>

            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {editingItem.product?.image_url ? (
                    <img
                      src={editingItem.product.image_url}
                      alt={editingItem.product.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-background flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{editingItem.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Preço original: {formatCurrency(editingItem.product?.price || 0)}
                    </p>
                  </div>
                </div>

                {editingItemComboType === 'selectable' && (
                  <div className="space-y-2">
                    <Label>Valor Adicional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingItem.additional_price}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, additional_price: parseFloat(e.target.value) || 0 } : null)}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor extra cobrado se o cliente escolher este item
                    </p>
                  </div>
                )}

                {editingItemComboType === 'aggregate' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="inherit-price"
                        checked={editingItem.inherit_price}
                        onCheckedChange={(checked) => setEditingItem(prev => prev ? { ...prev, inherit_price: checked } : null)}
                      />
                      <Label htmlFor="inherit-price">Herdar preço do produto</Label>
                    </div>

                    {!editingItem.inherit_price && (
                      <div className="space-y-2">
                        <Label>Preço Customizado no Combo</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingItem.custom_price || ''}
                          onChange={(e) => setEditingItem(prev => prev ? { ...prev, custom_price: parseFloat(e.target.value) || null } : null)}
                          placeholder="0,00"
                        />
                      </div>
                    )}
                  </>
                )}

                {editingItemFiscalMode === 'manual' && (
                  <div className="space-y-2">
                    <Label>Classificação Fiscal</Label>
                    <Select
                      value={editingItem.fiscal_override || 'none'}
                      onValueChange={(v) => setEditingItem(prev => prev ? { ...prev, fiscal_override: v === 'none' ? null : v as 'st' | 'icms' } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não definido</SelectItem>
                        <SelectItem value="st">ST (Substituição Tributária)</SelectItem>
                        <SelectItem value="icms">ICMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Configure manualmente a classificação fiscal deste item
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Switch
                    id="is-default"
                    checked={editingItem.is_default}
                    onCheckedChange={(checked) => setEditingItem(prev => prev ? { ...prev, is_default: checked } : null)}
                  />
                  <Label htmlFor="is-default">Item padrão (pré-selecionado)</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => editingItem && handleSaveItem({
                  additional_price: editingItem.additional_price,
                  custom_price: editingItem.custom_price,
                  inherit_price: editingItem.inherit_price,
                  fiscal_override: editingItem.fiscal_override,
                  is_default: editingItem.is_default,
                })}
                disabled={updateItem.isPending}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Combo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este combo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCombo}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
