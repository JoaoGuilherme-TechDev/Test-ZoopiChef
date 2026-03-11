import { useState } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { StockAdjustDialog } from '../components/StockAdjustDialog';
import { useERPItems } from '../hooks/useERPItems';
import { useERPStock } from '../hooks/useERPStock';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import type { ERPStockAdjustFormData } from '../types';

export default function ERPInventoryCountPage() {
  const { items, isLoading } = useERPItems(['raw', 'consumable']);
  const { adjustStock } = useERPStock();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedAdjust, setSelectedAdjust] = useState<{
    itemId: string;
    itemName: string;
    difference: number;
  } | null>(null);

  const handleCountChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setCounts({ ...counts, [itemId]: numValue });
    } else {
      const newCounts = { ...counts };
      delete newCounts[itemId];
      setCounts(newCounts);
    }
  };

  const getDifference = (itemId: string, currentStock: number) => {
    if (counts[itemId] === undefined) return null;
    return counts[itemId] - currentStock;
  };

  const handleApplyAdjust = (itemId: string, itemName: string, difference: number) => {
    setSelectedAdjust({ itemId, itemName, difference });
    setAdjustDialogOpen(true);
  };

  const handleAdjust = async (data: ERPStockAdjustFormData) => {
    await adjustStock.mutateAsync(data);
    setAdjustDialogOpen(false);
    setSelectedAdjust(null);
    // Clear the count for this item
    if (data.erp_item_id) {
      const newCounts = { ...counts };
      delete newCounts[data.erp_item_id];
      setCounts(newCounts);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Calculate total difference value
  const totalDifferenceValue = items.reduce((sum, item) => {
    const diff = getDifference(item.id, item.current_stock);
    if (diff !== null) {
      return sum + diff * item.avg_cost;
    }
    return sum;
  }, 0);

  const itemsWithDifference = items.filter((item) => {
    const diff = getDifference(item.id, item.current_stock);
    return diff !== null && diff !== 0;
  });

  if (isLoading) {
    return (
      <ERPInventoryLayout title="Inventário / Contagem">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Inventário / Contagem">
      {/* Summary */}
      {itemsWithDifference.length > 0 && (
        <Card className={`p-4 mb-4 ${totalDifferenceValue < 0 ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${totalDifferenceValue < 0 ? 'text-red-600' : 'text-green-600'}`} />
              <span className="font-medium">
                {itemsWithDifference.length} item(ns) com divergência
              </span>
            </div>
            <div className={`text-lg font-bold ${totalDifferenceValue < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalDifferenceValue >= 0 ? '+' : ''}{formatCurrency(totalDifferenceValue)}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground">
            Insira a contagem física de cada item. Diferenças serão destacadas para ajuste.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque Sistema</TableHead>
              <TableHead className="text-right w-32">Contagem Física</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead className="text-right">Valor Dif.</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const difference = getDifference(item.id, item.current_stock);
              const hasDifference = difference !== null && difference !== 0;
              const diffValue = difference !== null ? difference * item.avg_cost : 0;

              return (
                <TableRow key={item.id} className={hasDifference ? (difference < 0 ? 'bg-red-500/10' : 'bg-green-500/10') : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.base_unit?.symbol || '-'}</TableCell>
                  <TableCell className="text-right">{item.current_stock}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      placeholder="—"
                      className="w-24 text-right ml-auto"
                      value={counts[item.id] ?? ''}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className={`text-right font-medium ${hasDifference ? (difference! < 0 ? 'text-red-600' : 'text-green-600') : ''}`}>
                    {difference !== null ? (
                      <>
                        {difference >= 0 ? '+' : ''}{difference}
                      </>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${hasDifference ? (diffValue < 0 ? 'text-red-600' : 'text-green-600') : ''}`}>
                    {difference !== null ? formatCurrency(diffValue) : '-'}
                  </TableCell>
                  <TableCell>
                    {hasDifference && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyAdjust(item.id, item.name, difference!)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Ajustar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum item com controle de estoque
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pre-filled adjust dialog */}
      {selectedAdjust && (
        <StockAdjustDialog
          open={adjustDialogOpen}
          onOpenChange={(open) => {
            setAdjustDialogOpen(open);
            if (!open) setSelectedAdjust(null);
          }}
          onSubmit={handleAdjust}
          preselectedItemId={selectedAdjust.itemId}
          isLoading={adjustStock.isPending}
        />
      )}
    </ERPInventoryLayout>
  );
}
