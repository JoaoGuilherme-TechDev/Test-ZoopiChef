import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Plus, Edit2, Trash2, Copy, ChefHat, UtensilsCrossed, 
  Package, DollarSign, Users, FileImage, AlertCircle, Check, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import {
  useRodizioTypes,
  useCreateRodizioType,
  useUpdateRodizioType,
  useDeleteRodizioType,
  useRodizioMenus,
  useCreateRodizioMenu,
  useUpdateRodizioMenu,
  useDeleteRodizioMenu,
  useCopyRodizioMenu,
  useRodizioMenuItems,
  useCreateRodizioMenuItem,
  useUpdateRodizioMenuItem,
  useDeleteRodizioMenuItem,
  useImportProductsToRodizio,
  RodizioType,
  RodizioMenu,
  RodizioMenuItem,
} from '@/hooks/useRodizio';
import { useActiveProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

export default function RodizioConfig() {
  const [selectedType, setSelectedType] = useState<RodizioType | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<RodizioMenu | null>(null);
  
  const { data: types = [], isLoading: loadingTypes } = useRodizioTypes();
  const { data: menus = [] } = useRodizioMenus(selectedType?.id);
  const { data: items = [] } = useRodizioMenuItems(selectedMenu?.id);
  const { data: products = [] } = useActiveProducts();
  const { activeSectors = [] } = usePrintSectors();
  
  const createType = useCreateRodizioType();
  const updateType = useUpdateRodizioType();
  const deleteType = useDeleteRodizioType();
  const createMenu = useCreateRodizioMenu();
  const updateMenu = useUpdateRodizioMenu();
  const deleteMenu = useDeleteRodizioMenu();
  const copyMenu = useCopyRodizioMenu();
  const createItem = useCreateRodizioMenuItem();
  const updateItem = useUpdateRodizioMenuItem();
  const deleteItem = useDeleteRodizioMenuItem();
  const importProducts = useImportProductsToRodizio();

  // Dialog states
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  
  // Form states
  const [editingType, setEditingType] = useState<RodizioType | null>(null);
  const [editingMenu, setEditingMenu] = useState<RodizioMenu | null>(null);
  const [editingItem, setEditingItem] = useState<RodizioMenuItem | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [copyTargetTypeId, setCopyTargetTypeId] = useState<string>('');
  
  // Image upload and print sector states
  const [typeImageUrl, setTypeImageUrl] = useState<string | null>(null);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [itemImageUrl, setItemImageUrl] = useState<string | null>(null);
  const [menuPrintSectorId, setMenuPrintSectorId] = useState<string | null>(null);

  // Reset image states when editing changes
  useEffect(() => {
    setTypeImageUrl(editingType?.image_url || null);
  }, [editingType]);
  
  useEffect(() => {
    setMenuImageUrl(editingMenu?.image_url || null);
    setMenuPrintSectorId(editingMenu?.print_sector_id || null);
  }, [editingMenu]);
  
  useEffect(() => {
    setItemImageUrl(editingItem?.image_url || null);
  }, [editingItem]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handlers for Type
  const handleSaveType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      price_cents: Math.round(parseFloat(formData.get('price') as string || '0') * 100),
      image_url: typeImageUrl,
      is_active: true,
      display_order: types.length,
    };

    if (editingType) {
      await updateType.mutateAsync({ id: editingType.id, ...data });
    } else {
      await createType.mutateAsync(data);
    }
    setTypeDialogOpen(false);
    setEditingType(null);
    setTypeImageUrl(null);
  };

  const handleDeleteType = async (type: RodizioType) => {
    if (confirm(`Excluir "${type.name}"? Todos os menus e itens serão excluídos.`)) {
      await deleteType.mutateAsync(type.id);
      if (selectedType?.id === type.id) setSelectedType(null);
    }
  };

  // Handlers for Menu
  const handleSaveMenu = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedType) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      rodizio_type_id: selectedType.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      icon: formData.get('icon') as string || null,
      image_url: menuImageUrl,
      print_sector_id: menuPrintSectorId,
      is_active: true,
      display_order: menus.length,
    };

    if (editingMenu) {
      await updateMenu.mutateAsync({ id: editingMenu.id, ...data });
    } else {
      await createMenu.mutateAsync(data);
    }
    setMenuDialogOpen(false);
    setEditingMenu(null);
    setMenuImageUrl(null);
    setMenuPrintSectorId(null);
  };

  const handleDeleteMenu = async (menu: RodizioMenu) => {
    if (confirm(`Excluir menu "${menu.name}"? Todos os itens serão excluídos.`)) {
      await deleteMenu.mutateAsync(menu.id);
      if (selectedMenu?.id === menu.id) setSelectedMenu(null);
    }
  };

  const handleCopyMenu = async () => {
    if (!selectedMenu || !copyTargetTypeId) return;
    await copyMenu.mutateAsync({ sourceMenuId: selectedMenu.id, targetRodizioTypeId: copyTargetTypeId });
    setCopyDialogOpen(false);
    setCopyTargetTypeId('');
  };

  // Handlers for Item
  const handleSaveItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMenu) return;
    
    const formData = new FormData(e.currentTarget);
    const maxQty = formData.get('max_quantity') as string;
    const data = {
      rodizio_menu_id: selectedMenu.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      image_url: itemImageUrl,
      max_quantity_per_session: maxQty ? parseInt(maxQty) : null,
      product_id: formData.get('product_id') as string || null,
      is_active: true,
      display_order: items.length,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...data });
    } else {
      await createItem.mutateAsync(data);
    }
    setItemDialogOpen(false);
    setEditingItem(null);
    setItemImageUrl(null);
  };

  const handleDeleteItem = async (item: RodizioMenuItem) => {
    if (confirm(`Excluir "${item.name}"?`)) {
      await deleteItem.mutateAsync(item.id);
    }
  };

  const handleImportProducts = async () => {
    if (!selectedMenu || selectedProductIds.length === 0) return;
    await importProducts.mutateAsync({ menuId: selectedMenu.id, productIds: selectedProductIds });
    setImportDialogOpen(false);
    setSelectedProductIds([]);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  if (loadingTypes) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-primary" />
              Configuração de Rodízio
            </h1>
            <p className="text-muted-foreground">
              Configure tipos, menus e itens do rodízio japonês
            </p>
          </div>
        </div>

        <Tabs defaultValue="types" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="types" className="gap-2">
              <Users className="w-4 h-4" />
              Tipos de Rodízio
            </TabsTrigger>
            <TabsTrigger value="menus" className="gap-2" disabled={!selectedType}>
              <UtensilsCrossed className="w-4 h-4" />
              Menus
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2" disabled={!selectedMenu}>
              <Package className="w-4 h-4" />
              Itens
            </TabsTrigger>
          </TabsList>

          {/* TIPOS DE RODÍZIO */}
          <TabsContent value="types" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingType(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Tipo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingType ? 'Editar' : 'Novo'} Tipo de Rodízio</DialogTitle>
                    <DialogDescription>
                      Configure o nome e preço do rodízio
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveType} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Ex: Rodízio Master"
                        defaultValue={editingType?.name}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Descrição do rodízio..."
                        defaultValue={editingType?.description || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço por pessoa (R$) *</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        defaultValue={editingType ? (editingType.price_cents / 100).toFixed(2) : ''}
                        required
                      />
                    </div>
                    <ImageUpload
                      value={typeImageUrl}
                      onChange={setTypeImageUrl}
                      folder="types"
                      label="Imagem"
                      aspectRatio="video"
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createType.isPending || updateType.isPending}>
                        {createType.isPending || updateType.isPending ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {types.map(type => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg overflow-hidden",
                    selectedType?.id === type.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  {type.image_url && (
                    <div className="aspect-video bg-muted">
                      <img src={type.image_url} alt={type.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{type.name}</CardTitle>
                        {type.description && (
                          <CardDescription className="mt-1">{type.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant={type.is_active ? 'default' : 'secondary'}>
                        {type.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                        <DollarSign className="w-5 h-5" />
                        {formatCurrency(type.price_cents)}
                        <span className="text-sm font-normal text-muted-foreground">/pessoa</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingType(type);
                            setTypeDialogOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteType(type);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {types.length === 0 && (
                <Card className="col-span-full py-12">
                  <CardContent className="text-center text-muted-foreground">
                    <ChefHat className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum tipo de rodízio cadastrado</p>
                    <p className="text-sm">Crie tipos como "Master", "Prêmio" ou "Criança"</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {selectedType && (
              <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                <Check className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedType.name}</span> selecionado.
                <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[data-state="inactive"][value="menus"]')?.click()}>
                  Gerenciar Menus →
                </Button>
              </div>
            )}
          </TabsContent>

          {/* MENUS */}
          <TabsContent value="menus" className="space-y-4">
            {selectedType && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {selectedType.name}
                    </Badge>
                  </div>
                  <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingMenu(null)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Menu
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingMenu ? 'Editar' : 'Novo'} Menu</DialogTitle>
                        <DialogDescription>
                          Ex: Sashimis, Niguiris, Hot Rolls
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSaveMenu} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="menu-name">Nome *</Label>
                          <Input
                            id="menu-name"
                            name="name"
                            placeholder="Ex: Sashimis"
                            defaultValue={editingMenu?.name}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="menu-description">Descrição</Label>
                          <Textarea
                            id="menu-description"
                            name="description"
                            placeholder="Descrição do menu..."
                            defaultValue={editingMenu?.description || ''}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="menu-icon">Ícone (emoji)</Label>
                            <Input
                              id="menu-icon"
                              name="icon"
                              placeholder="🍣"
                              defaultValue={editingMenu?.icon || ''}
                            />
                          </div>
                          <ImageUpload
                            value={menuImageUrl}
                            onChange={setMenuImageUrl}
                            folder="menus"
                            label="Imagem"
                            aspectRatio="video"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Printer className="w-4 h-4" />
                            Local de Produção / Impressão
                          </Label>
                          <Select 
                            value={menuPrintSectorId || 'none'} 
                            onValueChange={(v) => setMenuPrintSectorId(v === 'none' ? null : v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (usar padrão)</SelectItem>
                              {activeSectors.map(sector => (
                                <SelectItem key={sector.id} value={sector.id}>
                                  {sector.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Define para qual impressora/KDS os itens deste menu serão enviados
                          </p>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={createMenu.isPending || updateMenu.isPending}>
                            {createMenu.isPending || updateMenu.isPending ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {menus.map(menu => (
                    <Card
                      key={menu.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg overflow-hidden",
                        selectedMenu?.id === menu.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setSelectedMenu(menu)}
                    >
                      {menu.image_url && (
                        <div className="aspect-video bg-muted">
                          <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {menu.icon && <span className="text-2xl">{menu.icon}</span>}
                            <div>
                              <CardTitle className="text-lg">{menu.name}</CardTitle>
                              {menu.description && (
                                <CardDescription className="mt-1">{menu.description}</CardDescription>
                              )}
                            </div>
                          </div>
                        </div>
                        {menu.print_sector_id && (
                          <Badge variant="outline" className="mt-2 text-xs gap-1 w-fit">
                            <Printer className="w-3 h-3" />
                            {activeSectors.find(s => s.id === menu.print_sector_id)?.name || 'Setor'}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMenu(menu);
                              setCopyDialogOpen(true);
                            }}
                            title="Copiar para outro tipo"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMenu(menu);
                              setMenuDialogOpen(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMenu(menu);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {menus.length === 0 && (
                    <Card className="col-span-full py-12">
                      <CardContent className="text-center text-muted-foreground">
                        <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum menu cadastrado para {selectedType.name}</p>
                        <p className="text-sm">Crie menus como "Sashimis", "Niguiris", "Hot Rolls"</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedMenu && (
                  <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-4">
                    <Check className="w-5 h-5 text-primary" />
                    Menu <span className="font-medium">{selectedMenu.name}</span> selecionado.
                    <Button variant="outline" size="sm" onClick={() => document.querySelector<HTMLButtonElement>('[data-state="inactive"][value="items"]')?.click()}>
                      Gerenciar Itens →
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Copy Menu Dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Copiar Menu</DialogTitle>
                  <DialogDescription>
                    Selecione o tipo de rodízio de destino
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Copiar "{selectedMenu?.name}" para:</Label>
                    <Select value={copyTargetTypeId} onValueChange={setCopyTargetTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de rodízio" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.filter(t => t.id !== selectedType?.id).map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCopyMenu} disabled={!copyTargetTypeId || copyMenu.isPending}>
                    {copyMenu.isPending ? 'Copiando...' : 'Copiar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ITENS */}
          <TabsContent value="items" className="space-y-4">
            {selectedMenu && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {selectedType?.name} → {selectedMenu.name}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => setSelectedProductIds([])}>
                          <Package className="w-4 h-4 mr-2" />
                          Importar Produtos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Importar Produtos</DialogTitle>
                          <DialogDescription>
                            Selecione os produtos para adicionar ao menu
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-96 border rounded-md p-4">
                          <div className="space-y-2">
                            {products.map(product => (
                              <div
                                key={product.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                  selectedProductIds.includes(product.id)
                                    ? "bg-primary/10 border border-primary"
                                    : "hover:bg-muted"
                                )}
                                onClick={() => toggleProductSelection(product.id)}
                              >
                                {product.image_url && (
                                  <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{product.name}</p>
                                  {product.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                                  )}
                                </div>
                                {selectedProductIds.includes(product.id) && (
                                  <Check className="w-5 h-5 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        <DialogFooter>
                          <div className="flex items-center gap-4 w-full justify-between">
                            <span className="text-sm text-muted-foreground">
                              {selectedProductIds.length} selecionado(s)
                            </span>
                            <Button onClick={handleImportProducts} disabled={selectedProductIds.length === 0 || importProducts.isPending}>
                              {importProducts.isPending ? 'Importando...' : 'Importar'}
                            </Button>
                          </div>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setEditingItem(null)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingItem ? 'Editar' : 'Novo'} Item</DialogTitle>
                          <DialogDescription>
                            Configure o item do menu
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSaveItem} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="item-name">Nome *</Label>
                            <Input
                              id="item-name"
                              name="name"
                              placeholder="Ex: Sashimi de Salmão"
                              defaultValue={editingItem?.name}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="item-description">Descrição</Label>
                            <Textarea
                              id="item-description"
                              name="description"
                              placeholder="Descrição do item..."
                              defaultValue={editingItem?.description || ''}
                            />
                          </div>
                          <ImageUpload
                            value={itemImageUrl}
                            onChange={setItemImageUrl}
                            folder="items"
                            label="Imagem"
                            aspectRatio="square"
                          />
                          <div className="space-y-2">
                            <Label htmlFor="max_quantity">Limite por Sessão</Label>
                            <Input
                              id="max_quantity"
                              name="max_quantity"
                              type="number"
                              min="1"
                              placeholder="Deixe vazio para ilimitado"
                              defaultValue={editingItem?.max_quantity_per_session || ''}
                            />
                            <p className="text-xs text-muted-foreground">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Quantidade máxima que o cliente pode pedir durante toda a sessão
                            </p>
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                              {createItem.isPending || updateItem.isPending ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map(item => (
                    <Card key={item.id} className="overflow-hidden">
                      {item.image_url && (
                        <div className="aspect-video bg-muted">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{item.name}</CardTitle>
                            {item.description && (
                              <CardDescription className="mt-1 line-clamp-2">{item.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            {item.max_quantity_per_session ? (
                              <Badge variant="secondary">
                                Máx: {item.max_quantity_per_session}/sessão
                              </Badge>
                            ) : (
                              <Badge variant="outline">Ilimitado</Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingItem(item);
                                setItemDialogOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {items.length === 0 && (
                    <Card className="col-span-full py-12">
                      <CardContent className="text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum item cadastrado em {selectedMenu.name}</p>
                        <p className="text-sm">Adicione itens manualmente ou importe produtos</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
