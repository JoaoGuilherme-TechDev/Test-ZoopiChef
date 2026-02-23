import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Layers, Settings2, Copy, FolderTree, Package, GripVertical } from 'lucide-react';
import {
  useOptionalGroups,
  useCreateOptionalGroup,
  useSyncProductsToGroup,
} from '@/hooks/useOptionalGroups';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useProducts } from '@/hooks/useProducts';
import { 
  useProductOptionalGroupLinks, 
  useLinkOptionalGroupToProduct, 
  useUnlinkOptionalGroupFromProduct,
  useUpdateProductOptionalGroupLink,
  ProductOptionalGroupLink
} from '@/hooks/useProductOptionalGroups';
import { useUpdateOptionalGroupItem } from '@/hooks/useOptionalGroups';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable accordion item component
interface SortableGroupItemProps {
  link: ProductOptionalGroupLink;
  itemPrices: Record<string, string>;
  onItemPriceChange: (itemId: string, value: string) => void;
  onSaveItemPrice: (link: ProductOptionalGroupLink, item: any) => void;
  onUnlink: (linkId: string) => void;
}

function SortableGroupItem({ link, itemPrices, onItemPriceChange, onSaveItemPrice, onUnlink }: SortableGroupItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem 
        value={link.id}
        className="border rounded-lg px-3"
      >
        <AccordionTrigger className="py-2 hover:no-underline">
          <div className="flex items-center gap-2 flex-1">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-medium">{link.optional_group?.name}</span>
            <Badge variant="secondary" className="ml-2">
              {link.optional_group?.items?.length || 0} itens
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-3">
          <div className="space-y-3">
            {/* Items with prices */}
            <div className="space-y-2">
              {link.optional_group?.items?.filter(i => i.active).map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                >
                  <span className="flex-1 text-sm">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="text"
                      value={itemPrices[item.id] ?? (item.price_override ?? item.price_delta ?? 0).toString().replace('.', ',')}
                      onChange={(e) => onItemPriceChange(item.id, e.target.value)}
                      onBlur={() => onSaveItemPrice(link, item)}
                      className="w-20 h-8 text-sm"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              ))}
              {(!link.optional_group?.items || link.optional_group.items.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Nenhum item neste grupo. Adicione itens em Grupos Opcionais.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUnlink(link.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Desvincular
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

interface Props {
  productId: string;
  productName: string;
  subcategoryId?: string | null;
}

export function ProductOptionalsTab({ productId, productName, subcategoryId }: Props) {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  const { data: allOptionalGroups, isLoading: groupsLoading } = useOptionalGroups();
  const { data: linkedGroups, isLoading: linksLoading } = useProductOptionalGroupLinks(productId);
  const { data: categories } = useCategories();
  const { data: subcategories } = useSubcategories();
  const { data: products } = useProducts();

  const createOptionalGroup = useCreateOptionalGroup();
  const syncProductsToGroup = useSyncProductsToGroup();
  
  const linkGroup = useLinkOptionalGroupToProduct();
  const unlinkGroup = useUnlinkOptionalGroupFromProduct();
  const updateLink = useUpdateProductOptionalGroupLink();
  const updateItem = useUpdateOptionalGroupItem();
  
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<'category' | 'subcategory' | 'products'>('subcategory');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  const [quickSubcategoryId, setQuickSubcategoryId] = useState<string>('');
  const [quickShowInactiveSubcategories, setQuickShowInactiveSubcategories] = useState(false);
  const [isCreatingFromSubcategory, setIsCreatingFromSubcategory] = useState(false);

  const [showInactiveCategories, setShowInactiveCategories] = useState(false);
  const [showInactiveSubcategories, setShowInactiveSubcategories] = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);

  const filteredCategories = showInactiveCategories ? categories : categories?.filter(c => c.active);

  // Filter subcategories based on showInactive toggle
  const filteredSubcategories = showInactiveSubcategories 
    ? subcategories 
    : subcategories?.filter(s => s.active);

  const quickFilteredSubcategories = quickShowInactiveSubcategories
    ? subcategories
    : subcategories?.filter(s => s.active);

  const filteredProducts = showInactiveProducts
    ? products?.filter(p => p.id !== productId)
    : products?.filter(p => p.id !== productId && p.active);

  const isLoading = groupsLoading || linksLoading;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sorted linked groups for display
  const sortedLinkedGroups = useMemo(() => {
    if (!linkedGroups) return [];
    return [...linkedGroups].sort((a, b) => a.sort_order - b.sort_order);
  }, [linkedGroups]);

  // Handle drag end - reorder groups
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !sortedLinkedGroups) return;

    const oldIndex = sortedLinkedGroups.findIndex(g => g.id === active.id);
    const newIndex = sortedLinkedGroups.findIndex(g => g.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedLinkedGroups, oldIndex, newIndex);
    
    // Update sort_order for all affected items
    try {
      await Promise.all(
        reordered.map((link, index) => 
          updateLink.mutateAsync({
            id: link.id,
            product_id: productId,
            sort_order: index,
          })
        )
      );
      toast.success('Ordem atualizada!');
    } catch (e: any) {
      toast.error('Erro ao reordenar grupos');
    }
  };

  const handleCreateGroupFromSubcategory = async () => {
    if (!quickSubcategoryId) {
      toast.error('Selecione uma subcategoria');
      return;
    }

    const sub = (subcategories || []).find(s => s.id === quickSubcategoryId);
    const groupName = sub?.category?.name
      ? `${sub.category.name} → ${sub.name}`
      : (sub?.name || 'Subcategoria');

    setIsCreatingFromSubcategory(true);
    try {
      const created = await createOptionalGroup.mutateAsync({
        name: groupName,
        active: true,
        min_select: 0,
        max_select: 1,
        required: false,
        selection_unique: false,
        calc_mode: null,
        source_type: 'products',
        subcategory_id: quickSubcategoryId,
        flavor_group_id: null,
      } as any);

      await syncProductsToGroup.mutateAsync({
        groupId: created.id,
        subcategoryId: quickSubcategoryId,
      });

      await linkGroup.mutateAsync({
        product_id: productId,
        optional_group_id: created.id,
        min_select: 0,
        max_select: 1,
        sort_order: linkedGroups?.length ?? 0,
      });

      toast.success('Grupo criado e vinculado ao produto!');
      setQuickSubcategoryId('');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao criar grupo pela subcategoria');
    } finally {
      setIsCreatingFromSubcategory(false);
    }
  };

  // Groups not yet linked to this product
  const linkedGroupIds = linkedGroups?.map(l => l.optional_group_id) || [];
  const availableGroups = allOptionalGroups?.filter(g => !linkedGroupIds.includes(g.id) && g.active) || [];

  // Get products in same subcategory for copy dialog
  const productsInSameSubcategory = products?.filter(
    p => p.subcategory_id === subcategoryId && p.id !== productId && p.active
  ) || [];

  // Toggle group selection
  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleLinkGroups = async () => {
    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    try {
      for (let i = 0; i < selectedGroups.length; i++) {
        const groupId = selectedGroups[i];
        const group = allOptionalGroups?.find(g => g.id === groupId);
        await linkGroup.mutateAsync({
          product_id: productId,
          optional_group_id: groupId,
          min_select: group?.min_select ?? 1,
          max_select: group?.max_select ?? 1,
          sort_order: (linkedGroups?.length ?? 0) + i,
        });
      }
      toast.success(`${selectedGroups.length} grupo(s) vinculado(s)!`);
      setSelectedGroups([]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao vincular grupos');
    }
  };

  const handleUnlinkGroup = async (linkId: string) => {
    try {
      await unlinkGroup.mutateAsync({ id: linkId, product_id: productId });
      toast.success('Grupo desvinculado!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao desvincular grupo');
    }
  };

  const handleItemPriceChange = (itemId: string, value: string) => {
    setItemPrices(prev => ({ ...prev, [itemId]: value }));
  };

  const extractSizeFromProductName = (name: string): string => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('grande')) return 'grande';
    if (lower.includes('média') || lower.includes('media')) return 'média';
    if (lower.includes('broto') || lower.includes('pequena')) return 'broto';
    if (lower.includes('família') || lower.includes('familia')) return 'família';
    return 'grande';
  };

  const parseBRL = (value: string) => {
    const normalized = (value || '').trim().replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSaveItemPrice = async (link: ProductOptionalGroupLink, item: any) => {
    const priceStr = itemPrices[item.id];
    if (priceStr === undefined) return;

    const price = parseBRL(priceStr);

    try {
      // Flavor-based groups: price is stored in flavor_prices (per size)
      if (link.optional_group?.source_type === 'flavors') {
        if (!company?.id) throw new Error('Empresa não encontrada');

        const sizeName = extractSizeFromProductName(productName);
        const flavorId = item.flavor_id ?? item.id;

        const { data: existing, error: findErr } = await supabase
          .from('flavor_prices')
          .select('id')
          .eq('company_id', company.id)
          .eq('flavor_id', flavorId)
          .eq('size_name', sizeName)
          .maybeSingle();

        if (findErr) throw findErr;

        if (existing?.id) {
          const { error: updErr } = await supabase
            .from('flavor_prices')
            .update({ price_full: price })
            .eq('id', existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('flavor_prices')
            .insert({
              company_id: company.id,
              flavor_id: flavorId,
              size_name: sizeName,
              price_full: price,
            } as any);
          if (insErr) throw insErr;
        }

        queryClient.invalidateQueries({ queryKey: ['product-optional-group-links', productId] });
        queryClient.invalidateQueries({ queryKey: ['public-product-optional-group-links', productId, company.id] });
        queryClient.invalidateQueries({ queryKey: ['flavor-prices-editor', link.optional_group.flavor_group_id] });

        toast.success('Valor atualizado!');
        return;
      }

      // Regular groups: price_override is stored in optional_group_items
      await updateItem.mutateAsync({
        id: item.id,
        price_override: price,
      });
      toast.success('Valor atualizado!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar valor');
    }
  };

  // Copy linked groups to other products
  const handleCopyToProducts = async () => {
    if (!linkedGroups || linkedGroups.length === 0) {
      toast.error('Nenhum grupo para copiar');
      return;
    }

    let targetProductIds: string[] = [];

    if (copyTarget === 'products') {
      targetProductIds = selectedProductIds;
    } else if (copyTarget === 'subcategory' && selectedSubcategoryId) {
      targetProductIds = products
        ?.filter(p => p.subcategory_id === selectedSubcategoryId && p.id !== productId && p.active)
        .map(p => p.id) || [];
    } else if (copyTarget === 'category' && selectedCategoryId) {
      const subIds = subcategories
        ?.filter(s => s.category_id === selectedCategoryId)
        .map(s => s.id) || [];
      targetProductIds = products
        ?.filter(p => p.subcategory_id && subIds.includes(p.subcategory_id) && p.id !== productId && p.active)
        .map(p => p.id) || [];
    }

    if (targetProductIds.length === 0) {
      toast.error('Nenhum produto selecionado');
      return;
    }

    setIsCopying(true);
    try {
      let successCount = 0;
      for (const targetProductId of targetProductIds) {
        for (const link of linkedGroups) {
          try {
            await linkGroup.mutateAsync({
              product_id: targetProductId,
              optional_group_id: link.optional_group_id,
              min_select: link.min_select,
              max_select: link.max_select,
              sort_order: link.sort_order,
            });
            successCount++;
          } catch {
            // Group might already be linked, skip
          }
        }
      }
      toast.success(`Grupos copiados para ${targetProductIds.length} produto(s)!`);
      setCopyDialogOpen(false);
      setSelectedProductIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao copiar grupos');
    } finally {
      setIsCopying(false);
    }
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        Vincule grupos opcionais ao produto <strong>{productName}</strong>. 
        Os valores são definidos nos itens de cada grupo.
      </div>

      {/* Add new groups - Multi-select */}
      <Card className="border-dashed">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Vincular Grupos Opcionais
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-3">
          {/* Quick create: subcategory -> optional group */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Adicionar opções por subcategoria</p>
                <p className="text-xs text-muted-foreground">Cria um grupo puxando os produtos da subcategoria (ex.: Bebidas → Refrigerantes).</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={quickShowInactiveSubcategories}
                  onChange={(e) => setQuickShowInactiveSubcategories(e.target.checked)}
                  className="rounded border-muted"
                />
                Mostrar inativas
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={quickSubcategoryId} onValueChange={setQuickSubcategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {(quickFilteredSubcategories || []).map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.category?.name ? `${sub.category.name} → ${sub.name}` : sub.name}
                      {!sub.active && ' (inativa)'}
                    </SelectItem>
                  ))}
                  {(!quickFilteredSubcategories || quickFilteredSubcategories.length === 0) && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {quickShowInactiveSubcategories
                        ? 'Nenhuma subcategoria cadastrada'
                        : 'Nenhuma subcategoria ativa. Marque "Mostrar inativas"'}
                    </div>
                  )}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="secondary"
                onClick={handleCreateGroupFromSubcategory}
                disabled={isCreatingFromSubcategory || createOptionalGroup.isPending || syncProductsToGroup.isPending || linkGroup.isPending || !quickSubcategoryId}
              >
                Criar e vincular
              </Button>
            </div>
          </div>

          {availableGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os grupos já estão vinculados.</p>
          ) : (
            <>
              <ScrollArea className="h-[150px] border rounded-lg p-2">
                <div className="space-y-2">
                  {availableGroups.map((group) => (
                    <label 
                      key={group.id}
                      htmlFor={`group-${group.id}`}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedGroups.includes(group.id) 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                      <div className="flex-1">
                        <span className="font-medium">{group.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {group.items?.length || 0} itens
                        </Badge>
                      </div>
                      {group.source_type === 'flavors' && (
                        <Badge variant="secondary" className="text-xs">Sabores</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
              <Button 
                type="button" 
                onClick={handleLinkGroups} 
                disabled={selectedGroups.length === 0 || linkGroup.isPending}
                className="w-full"
              >
                Vincular {selectedGroups.length > 0 ? `(${selectedGroups.length})` : ''} Grupo(s)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Linked groups */}
      {sortedLinkedGroups && sortedLinkedGroups.length > 0 ? (
        <>
          {/* Copy to other products button */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Arraste pelo ícone ⋮⋮ para reordenar
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCopyDialogOpen(true)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar para outros produtos
            </Button>
          </div>

          <ScrollArea className="h-[300px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedLinkedGroups.map(l => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <Accordion type="multiple" className="space-y-2">
                  {sortedLinkedGroups.map((link) => (
                    <SortableGroupItem
                      key={link.id}
                      link={link}
                      itemPrices={itemPrices}
                      onItemPriceChange={handleItemPriceChange}
                      onSaveItemPrice={handleSaveItemPrice}
                      onUnlink={handleUnlinkGroup}
                    />
                  ))}
                </Accordion>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum grupo opcional vinculado.</p>
            <p className="text-xs">Vincule grupos como "Escolha seu sabor", "Escolha sua borda", etc.</p>
          </CardContent>
        </Card>
      )}

      {/* Copy Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Grupos para Outros Produtos</DialogTitle>
            <DialogDescription>
              Copie os {linkedGroups?.length || 0} grupo(s) vinculado(s) para outros produtos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Copiar para:</Label>
              <Select value={copyTarget} onValueChange={(v) => setCopyTarget(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcategory">
                    <span className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4" />
                      Toda uma Subcategoria
                    </span>
                  </SelectItem>
                  <SelectItem value="category">
                    <span className="flex items-center gap-2">
                      <FolderTree className="w-4 h-4" />
                      Toda uma Categoria
                    </span>
                  </SelectItem>
                  <SelectItem value="products">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Produtos específicos
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {copyTarget === 'category' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Categoria</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInactiveCategories}
                      onChange={(e) => setShowInactiveCategories(e.target.checked)}
                      className="rounded border-muted"
                    />
                    Mostrar inativas
                  </label>
                </div>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} {!cat.active && '(inativa)'}
                      </SelectItem>
                    ))}
                    {(!filteredCategories || filteredCategories.length === 0) && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {showInactiveCategories
                          ? 'Nenhuma categoria cadastrada'
                          : 'Nenhuma categoria ativa. Marque "Mostrar inativas"'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {copyTarget === 'subcategory' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Subcategoria</Label>
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
                <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma subcategoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories?.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.category?.name ? `${sub.category.name} → ${sub.name}` : sub.name}
                        {!sub.active && ' (inativa)'}
                      </SelectItem>
                    ))}
                    {(!filteredSubcategories || filteredSubcategories.length === 0) && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {showInactiveSubcategories 
                          ? 'Nenhuma subcategoria cadastrada' 
                          : 'Nenhuma ativa. Marque "Mostrar inativas"'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {copyTarget === 'products' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Produtos ({selectedProductIds.length} selecionados)</Label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInactiveProducts}
                      onChange={(e) => setShowInactiveProducts(e.target.checked)}
                      className="rounded border-muted"
                    />
                    Mostrar inativos
                  </label>
                </div>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {filteredProducts?.map((prod) => (
                      <label 
                        key={prod.id}
                        htmlFor={`prod-${prod.id}`}
                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                          selectedProductIds.includes(prod.id) 
                            ? 'bg-primary/10' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          id={`prod-${prod.id}`}
                          checked={selectedProductIds.includes(prod.id)}
                          onCheckedChange={() => {
                            setSelectedProductIds(prev => 
                              prev.includes(prod.id)
                                ? prev.filter(id => id !== prod.id)
                                : [...prev, prod.id]
                            );
                          }}
                        />
                        <span className="text-sm">
                          {prod.name} {!prod.active && <span className="text-muted-foreground">(inativo)</span>}
                        </span>
                      </label>
                    ))}
                    {(!filteredProducts || filteredProducts.length === 0) && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {showInactiveProducts ? 'Nenhum produto cadastrado' : 'Nenhum produto ativo. Marque "Mostrar inativos"'}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCopyToProducts} disabled={isCopying}>
              {isCopying ? 'Copiando...' : 'Copiar Grupos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}