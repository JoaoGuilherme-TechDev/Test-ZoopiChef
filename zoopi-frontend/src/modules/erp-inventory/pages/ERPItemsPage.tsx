import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { ItemFormDialog } from '../components/ItemFormDialog';
import { SupplierFormDialog } from '../components/SupplierFormDialog';
import { StockAdjustDialog } from '../components/StockAdjustDialog';
import { useERPItems } from '../hooks/useERPItems';
import { useERPSuppliers } from '../hooks/useERPSuppliers';
import { useERPProductMap } from '../hooks/useERPProductMap';
import { useERPStock } from '../hooks/useERPStock';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Truck, Link, AlertTriangle, Loader2, Pencil, SlidersHorizontal } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../types';
import type { ERPItemFormData, ERPSupplierFormData, ERPItemType } from '../types';

export default function ERPItemsPage() {
  const { items, isLoading, createItem, updateItem, lowStockItems } = useERPItems();
  const { adjustStock } = useERPStock();
  const { suppliers, createSupplier } = useERPSuppliers();
  const { mappings, createMapping, deleteMapping } = useERPProductMap();
  const { data: products = [] } = useProducts();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [filterType, setFilterType] = useState<ERPItemType | 'all'>('all');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedAdjustItemId, setSelectedAdjustItemId] = useState<string | undefined>(undefined);

  const filteredItems = filterType === 'all' 
    ? items 
    : items.filter(item => item.item_type === filterType);

  const handleCreateItem = async (data: ERPItemFormData) => {
    await createItem.mutateAsync(data);
    setItemDialogOpen(false);
  };

  const handleUpdateItem = async (data: ERPItemFormData) => {
    if (!editingItem?.id) return;
    await updateItem.mutateAsync({ id: editingItem.id, ...data });
    setEditingItem(null);
  };

  const openEdit = (item: any) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      item_type: item.item_type,
      base_unit_id: item.base_unit_id ?? undefined,
      track_stock: !!item.track_stock,
      min_stock: item.min_stock ?? 0,
    });
    setItemDialogOpen(true);
  };

  const openAdjust = (itemId: string) => {
    setSelectedAdjustItemId(itemId);
    setAdjustDialogOpen(true);
  };

  const handleCreateSupplier = async (data: ERPSupplierFormData) => {
    await createSupplier.mutateAsync(data);
    setSupplierDialogOpen(false);
  };

  // Get unmapped sale items for product mapping
  const unmappedProducts = products.filter(
    (p) => !mappings.some((m) => m.product_id === p.id)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Itens ERP">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Itens ERP">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 border-orange-500 bg-orange-500/10">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {lowStockItems.length} item(ns) abaixo do estoque mínimo
            </span>
          </div>
        </Card>
      )}

      <Tabs defaultValue="items">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="items">
              <Package className="w-4 h-4 mr-2" />
              Itens ({items.length})
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              <Truck className="w-4 h-4 mr-2" />
              Fornecedores ({suppliers.length})
            </TabsTrigger>
            <TabsTrigger value="mapping">
              <Link className="w-4 h-4 mr-2" />
              Mapeamento ({mappings.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setItemDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Item
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">Último Custo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    className={item.current_stock <= item.min_stock ? 'bg-orange-500/10' : ''}
                  >
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.sku || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ITEM_TYPE_LABELS[item.item_type]}</Badge>
                    </TableCell>
                    <TableCell>{item.base_unit?.symbol || '-'}</TableCell>
                    <TableCell className="text-right">
                      {item.track_stock ? (
                        <span className={item.current_stock <= item.min_stock ? 'text-orange-600 font-medium' : ''}>
                          {item.current_stock}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.avg_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.last_cost)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!item.track_stock}
                          onClick={() => openAdjust(item.id)}
                          title={!item.track_stock ? 'Ative “Controlar Estoque” para usar' : undefined}
                        >
                          <SlidersHorizontal className="w-4 h-4 mr-2" />
                          Ajustar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum item cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <div className="p-4 border-b flex items-center justify-end">
              <Button onClick={() => setSupplierDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Fornecedor
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.doc || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Mapeamento de Produtos</h3>
              <p className="text-sm text-muted-foreground">
                Vincule produtos de venda do cardápio aos itens ERP para controle de estoque e CMV.
              </p>
              <div className="mt-3 p-3 bg-blue-500/10 rounded-lg text-sm space-y-1">
                <p><strong>• Revenda:</strong> Produtos que são comprados e vendidos diretamente (ex: refrigerante, água, vinho). O estoque é controlado automaticamente.</p>
                <p><strong>• Venda (Ficha Técnica):</strong> Produtos preparados (ex: pizza, lanche, pratos). Precisam de ficha técnica com os insumos.</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Existing Mappings */}
              <div>
                <h3 className="font-medium mb-3">Mapeamentos Ativos ({mappings.length})</h3>
                {mappings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum mapeamento criado</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {mappings.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="text-sm flex-1">
                          <span className="font-medium">{m.product?.name}</span>
                          <span className="text-muted-foreground"> → </span>
                          <span>{m.erp_item?.name}</span>
                          {m.erp_item && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {ITEM_TYPE_LABELS[m.erp_item.item_type]}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMapping.mutate(m.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Mapping */}
              <div>
                <h3 className="font-medium mb-3">Produtos Sem Mapeamento ({unmappedProducts.length})</h3>
                {unmappedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todos os produtos estão mapeados</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {unmappedProducts.slice(0, 30).map((product) => {
                      // Allow mapping to sale or resale items
                      const mappableItems = items.filter((i) => i.item_type === 'sale' || i.item_type === 'resale');
                      return (
                        <div key={product.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <span className="text-sm flex-1 truncate">{product.name}</span>
                          <Select
                            onValueChange={(erpItemId) => {
                              createMapping.mutate({ product_id: product.id, erp_item_id: erpItemId });
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Vincular item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mappableItems.length === 0 ? (
                                <SelectItem value="" disabled>Crie itens de Venda ou Revenda</SelectItem>
                              ) : (
                                mappableItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({ITEM_TYPE_LABELS[item.item_type]})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                    {unmappedProducts.length > 30 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        +{unmappedProducts.length - 30} produtos...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ItemFormDialog
        open={itemDialogOpen}
        onOpenChange={(open) => {
          setItemDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        onSubmit={editingItem?.id ? handleUpdateItem : handleCreateItem}
        initialData={editingItem || undefined}
        isLoading={createItem.isPending || updateItem.isPending}
      />

      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSubmit={handleCreateSupplier}
        isLoading={createSupplier.isPending}
      />

      <StockAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={(open) => {
          setAdjustDialogOpen(open);
          if (!open) setSelectedAdjustItemId(undefined);
        }}
        preselectedItemId={selectedAdjustItemId}
        isLoading={adjustStock.isPending}
        onSubmit={async (data) => {
          await adjustStock.mutateAsync(data);
          setAdjustDialogOpen(false);
          setSelectedAdjustItemId(undefined);
        }}
      />
    </ERPInventoryLayout>
  );
}
