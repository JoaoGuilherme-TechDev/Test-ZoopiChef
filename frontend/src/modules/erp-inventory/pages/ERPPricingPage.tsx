import { useState, useEffect } from 'react';
import { ERPInventoryLayout } from '../components/ERPInventoryLayout';
import { useERPPricing } from '../hooks/useERPPricing';
import { useERPItems } from '../hooks/useERPItems';
import { useERPRecipes } from '../hooks/useERPRecipes';
import { useERPProductMap } from '../hooks/useERPProductMap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calculator, Loader2, RefreshCw } from 'lucide-react';

export default function ERPPricingPage() {
  const { items: saleItems, isLoading: itemsLoading } = useERPItems('sale');
  const { recipes, calculateRecipeCost } = useERPRecipes();
  const { mappings } = useERPProductMap();
  const { pricing, updatePricing, recalculateAllPricing, getPricingAnalysis } = useERPPricing();

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editMarkup, setEditMarkup] = useState<number>(0);
  const [editMargin, setEditMargin] = useState<number>(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleStartEdit = (itemId: string) => {
    const existingPricing = pricing.find((p) => p.sale_item_id === itemId);
    setEditingItem(itemId);
    setEditMarkup(existingPricing?.target_markup_percent || 0);
    setEditMargin(existingPricing?.target_margin_percent || 0);
  };

  const handleSavePricing = async () => {
    if (!editingItem) return;
    await updatePricing.mutateAsync({
      sale_item_id: editingItem,
      target_markup_percent: editMarkup || undefined,
      target_margin_percent: editMargin || undefined,
    });
    setEditingItem(null);
  };

  // Calculate pricing data for each sale item
  const pricingData = saleItems.map((item) => {
    const recipe = recipes.find((r) => r.sale_item_id === item.id && r.active);
    const mapping = mappings.find((m) => m.erp_item_id === item.id);
    const pricingRecord = pricing.find((p) => p.sale_item_id === item.id);

    let currentCost = 0;
    if (recipe) {
      const costData = calculateRecipeCost(recipe);
      currentCost = costData.total_cost;
    }

    const currentPrice = mapping?.product?.price || 0;
    const currentMarkup = currentCost > 0 ? ((currentPrice - currentCost) / currentCost) * 100 : 0;
    const currentMargin = currentPrice > 0 ? ((currentPrice - currentCost) / currentPrice) * 100 : 0;

    let suggestedPriceByMarkup: number | null = null;
    let suggestedPriceByMargin: number | null = null;

    if (pricingRecord?.target_markup_percent && currentCost > 0) {
      suggestedPriceByMarkup = currentCost * (1 + pricingRecord.target_markup_percent / 100);
    }
    if (pricingRecord?.target_margin_percent && pricingRecord.target_margin_percent < 100) {
      suggestedPriceByMargin = currentCost / (1 - pricingRecord.target_margin_percent / 100);
    }

    const isBelowCost = currentPrice > 0 && currentPrice < currentCost;
    const marginAlert = currentMargin < 10 && currentMargin >= 0;

    return {
      id: item.id,
      name: item.name,
      hasRecipe: !!recipe,
      hasMapping: !!mapping,
      currentCost,
      currentPrice,
      currentMarkup,
      currentMargin,
      targetMarkup: pricingRecord?.target_markup_percent,
      targetMargin: pricingRecord?.target_margin_percent,
      suggestedPriceByMarkup,
      suggestedPriceByMargin,
      isBelowCost,
      marginAlert,
    };
  });

  const itemsBelowCost = pricingData.filter((p) => p.isBelowCost);
  const itemsWithMarginAlert = pricingData.filter((p) => p.marginAlert && !p.isBelowCost);

  if (itemsLoading) {
    return (
      <ERPInventoryLayout title="Precificação">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </ERPInventoryLayout>
    );
  }

  return (
    <ERPInventoryLayout title="Precificação">
      {/* Alerts */}
      {itemsBelowCost.length > 0 && (
        <Card className="p-4 border-red-500 bg-red-500/10 mb-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {itemsBelowCost.length} produto(s) vendendo ABAIXO DO CUSTO!
            </span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            {itemsBelowCost.map((p) => p.name).join(', ')}
          </p>
        </Card>
      )}

      {itemsWithMarginAlert.length > 0 && (
        <Card className="p-4 border-yellow-500 bg-yellow-500/10 mb-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {itemsWithMarginAlert.length} produto(s) com margem abaixo de 10%
            </span>
          </div>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Configure markup e margem alvo para cada produto. O preço sugerido é calculado automaticamente.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => recalculateAllPricing.mutate()}
            disabled={recalculateAllPricing.isPending}
          >
            {recalculateAllPricing.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Recalcular Todos
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Custo (CMV)</TableHead>
              <TableHead className="text-right">Preço Atual</TableHead>
              <TableHead className="text-right">Markup Atual</TableHead>
              <TableHead className="text-right">Margem Atual</TableHead>
              <TableHead className="text-right">Markup Alvo</TableHead>
              <TableHead className="text-right">Margem Alvo</TableHead>
              <TableHead className="text-right">Preço Sugerido</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingData.map((item) => (
              <TableRow
                key={item.id}
                className={item.isBelowCost ? 'bg-red-500/10' : item.marginAlert ? 'bg-yellow-500/10' : ''}
              >
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="flex gap-1 mt-1">
                    {!item.hasRecipe && (
                      <Badge variant="outline" className="text-xs">Sem ficha</Badge>
                    )}
                    {!item.hasMapping && (
                      <Badge variant="outline" className="text-xs">Sem mapeamento</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.currentCost)}</TableCell>
                <TableCell className="text-right">
                  {item.currentPrice > 0 ? formatCurrency(item.currentPrice) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {item.currentPrice > 0 ? formatPercent(item.currentMarkup) : '-'}
                </TableCell>
                <TableCell className={`text-right ${item.isBelowCost ? 'text-red-600 font-bold' : item.marginAlert ? 'text-yellow-600' : ''}`}>
                  {item.currentPrice > 0 ? formatPercent(item.currentMargin) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {editingItem === item.id ? (
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      className="w-20 text-right"
                      value={editMarkup}
                      onChange={(e) => setEditMarkup(parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    item.targetMarkup ? `${item.targetMarkup}%` : '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingItem === item.id ? (
                    <Input
                      type="number"
                      min={0}
                      max={99}
                      step="1"
                      className="w-20 text-right"
                      value={editMargin}
                      onChange={(e) => setEditMargin(parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    item.targetMargin ? `${item.targetMargin}%` : '-'
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {item.suggestedPriceByMarkup
                    ? formatCurrency(item.suggestedPriceByMarkup)
                    : item.suggestedPriceByMargin
                    ? formatCurrency(item.suggestedPriceByMargin)
                    : '-'}
                </TableCell>
                <TableCell>
                  {editingItem === item.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleSavePricing} disabled={updatePricing.isPending}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => handleStartEdit(item.id)}>
                      <Calculator className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pricingData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum produto de venda cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </ERPInventoryLayout>
  );
}
