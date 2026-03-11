import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { StockAdjustDialog } from '../components/StockAdjustDialog';
import { useERPItems } from '../hooks/useERPItems';
import { useERPStock } from '../hooks/useERPStock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../types';
import type { ERPStockAdjustFormData } from '../types';

export default function ERPStockPage() {
  const { items, isLoading, lowStockItems } = useERPItems(['raw', 'consumable']);
  const { adjustStock } = useERPStock();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();

  const handleAdjust = async (data: ERPStockAdjustFormData) => {
    await adjustStock.mutateAsync(data);
    setAdjustDialogOpen(false);
    setSelectedItemId(undefined);
  };

  const openAdjustDialog = (itemId?: string) => {
    setSelectedItemId(itemId);
    setAdjustDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calculate stock value
  const totalStockValue = items.reduce((sum, item) => {
    return sum + item.current_stock * item.avg_cost;
  }, 0);

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Estoque">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Estoque">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total de Itens</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Valor em Estoque</p>
          <p className="text-2xl font-bold">{formatCurrency(totalStockValue)}</p>
        </Card>
        <Card className={`p-4 ${lowStockItems.length > 0 ? 'border-orange-500 bg-orange-500/10' : ''}`}>
          <p className="text-sm text-muted-foreground">Abaixo do Mínimo</p>
          <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-orange-600' : ''}`}>
            {lowStockItems.length}
          </p>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 border-orange-500 bg-orange-500/10 mb-4">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Itens abaixo do estoque mínimo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <Badge key={item.id} variant="outline" className="text-orange-600 border-orange-500">
                {item.name}: {item.current_stock} (mín: {item.min_stock})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Stock Table */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Visualize o saldo de estoque de todos os insumos.
          </p>
          <Button onClick={() => openAdjustDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Ajustar Estoque
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque Atual</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="w-32">Nível</TableHead>
              <TableHead className="text-right">Custo Médio</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const stockValue = item.current_stock * item.avg_cost;
              const stockLevel = item.min_stock > 0 
                ? Math.min((item.current_stock / item.min_stock) * 100, 100)
                : 100;
              const isLow = item.current_stock <= item.min_stock;

              return (
                <TableRow key={item.id} className={isLow ? 'bg-orange-500/10' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ITEM_TYPE_LABELS[item.item_type]}</Badge>
                  </TableCell>
                  <TableCell>{item.base_unit?.symbol || '-'}</TableCell>
                  <TableCell className={`text-right font-medium ${isLow ? 'text-orange-600' : ''}`}>
                    {item.current_stock}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.min_stock}</TableCell>
                  <TableCell>
                    <Progress 
                      value={stockLevel} 
                      className={`h-2 ${isLow ? '[&>div]:bg-orange-500' : ''}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.avg_cost)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(stockValue)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAdjustDialog(item.id)}
                    >
                      Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum item com controle de estoque
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <StockAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        onSubmit={handleAdjust}
        preselectedItemId={selectedItemId}
        isLoading={adjustStock.isPending}
      />
    </ERPInventoryLayout>
  );
}
