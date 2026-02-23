import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, Percent, DollarSign, ArrowRight } from 'lucide-react';
import { CategorySubcategorySelector } from './CategorySubcategorySelector';
import { useBatchProducts, useBatchUpdatePrices } from '../hooks/useBatchOperations';
import type { BatchPriceChange, ProductForBatch } from '../types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BatchPriceEditor() {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<string, { price?: number; salePrice?: number | null }>>({});
  const [percentChange, setPercentChange] = useState<number>(0);
  const [applyToSalePrice, setApplyToSalePrice] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: products = [], isLoading } = useBatchProducts(
    categoryId || undefined,
    subcategoryId || undefined
  );
  const batchUpdate = useBatchUpdatePrices();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePriceChange = (productId: string, field: 'price' | 'salePrice', value: string) => {
    const numValue = parseFloat(value) || 0;
    setPriceChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numValue > 0 ? numValue : undefined,
      },
    }));
  };

  const applyPercentToSelected = () => {
    if (!percentChange || selectedIds.length === 0) return;

    const newChanges = { ...priceChanges };
    selectedIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        const multiplier = 1 + percentChange / 100;
        newChanges[id] = {
          price: Math.round(product.price * multiplier * 100) / 100,
          salePrice: applyToSalePrice && product.sale_price
            ? Math.round(product.sale_price * multiplier * 100) / 100
            : product.sale_price,
        };
      }
    });
    setPriceChanges(newChanges);
    toast.success(`Percentual aplicado a ${selectedIds.length} produtos`);
  };

  const pendingChanges: BatchPriceChange[] = useMemo(() => {
    return Object.entries(priceChanges)
      .filter(([id, changes]) => changes.price !== undefined)
      .map(([productId, changes]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          productName: product?.name || '',
          currentPrice: product?.price || 0,
          newPrice: changes.price || product?.price || 0,
          currentSalePrice: product?.sale_price,
          newSalePrice: changes.salePrice,
        };
      })
      .filter(change => change.newPrice !== change.currentPrice || change.newSalePrice !== change.currentSalePrice);
  }, [priceChanges, products]);

  const handleConfirm = () => {
    batchUpdate.mutate(pendingChanges, {
      onSuccess: () => {
        setShowPreview(false);
        setPriceChanges({});
        setSelectedIds([]);
        setPercentChange(0);
      },
    });
  };

  const hasChanges = pendingChanges.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Alteração em Lote de Preços
        </CardTitle>
        <CardDescription>
          Ajuste preços de múltiplos produtos por categoria, subcategoria ou percentual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor */}
        <CategorySubcategorySelector
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          onCategoryChange={setCategoryId}
          onSubcategoryChange={setSubcategoryId}
        />

        {/* Aplicar percentual em lote */}
        {products.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="text-sm font-medium">Ajuste percentual:</span>
            </div>
            <Input
              type="number"
              value={percentChange || ''}
              onChange={e => setPercentChange(parseFloat(e.target.value) || 0)}
              placeholder="+10 ou -5"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <div className="flex items-center gap-2">
              <Checkbox
                id="applyToSale"
                checked={applyToSalePrice}
                onCheckedChange={(v) => setApplyToSalePrice(!!v)}
              />
              <label htmlFor="applyToSale" className="text-sm">Aplicar ao preço promocional</label>
            </div>
            <Button
              variant="secondary"
              onClick={applyPercentToSelected}
              disabled={!percentChange || selectedIds.length === 0}
            >
              Aplicar aos Selecionados ({selectedIds.length})
            </Button>
          </div>
        )}

        {/* Tabela de preços */}
        {products.length > 0 ? (
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.length === products.length && products.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço Atual</TableHead>
                  <TableHead className="text-center w-[50px]"></TableHead>
                  <TableHead>Novo Preço</TableHead>
                  <TableHead className="text-right">Promo Atual</TableHead>
                  <TableHead className="text-center w-[50px]"></TableHead>
                  <TableHead>Nova Promo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => {
                  const change = priceChanges[product.id];
                  const hasChange = change?.price !== undefined && change.price !== product.price;
                  const hasSaleChange = change?.salePrice !== undefined && change.salePrice !== product.sale_price;

                  return (
                    <TableRow key={product.id} className={hasChange || hasSaleChange ? 'bg-warning/10' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasChange && <ArrowRight className="h-4 w-4 text-warning" />}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={change?.price ?? ''}
                          onChange={e => handlePriceChange(product.id, 'price', e.target.value)}
                          placeholder={String(product.price)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {product.sale_price ? formatCurrency(product.sale_price) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasSaleChange && <ArrowRight className="h-4 w-4 text-warning" />}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={change?.salePrice ?? ''}
                          onChange={e => handlePriceChange(product.id, 'salePrice', e.target.value)}
                          placeholder={product.sale_price ? String(product.sale_price) : '-'}
                          className="w-28"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : !isLoading && categoryId ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum produto encontrado nesta categoria
          </div>
        ) : !categoryId ? (
          <div className="text-center py-8 text-muted-foreground">
            Selecione uma categoria para visualizar produtos
          </div>
        ) : null}

        {/* Ações */}
        {hasChanges && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium">
                {pendingChanges.length} produto(s) com alterações pendentes
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPriceChanges({});
                  setSelectedIds([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => setShowPreview(true)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Pré-visualizar
              </Button>
            </div>
          </div>
        )}

        {/* Dialog de confirmação */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Confirmar Alterações de Preços
              </DialogTitle>
              <DialogDescription>
                Revise as alterações antes de confirmar. Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Preço Atual</TableHead>
                    <TableHead className="text-right">Novo Preço</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingChanges.map(change => (
                    <TableRow key={change.productId}>
                      <TableCell>{change.productName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(change.currentPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(change.newPrice)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={change.newPrice > change.currentPrice ? 'default' : 'destructive'}>
                          {change.newPrice > change.currentPrice ? '+' : ''}
                          {formatCurrency(change.newPrice - change.currentPrice)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={batchUpdate.isPending}>
                {batchUpdate.isPending ? 'Salvando...' : `Confirmar ${pendingChanges.length} Alterações`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
