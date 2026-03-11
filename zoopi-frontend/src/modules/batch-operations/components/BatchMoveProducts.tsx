import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, ArrowRightLeft, ArrowRight, Package } from 'lucide-react';
import { useBatchProducts, useBatchMoveProducts } from '../hooks/useBatchOperations';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BatchMoveProducts() {
  // Origem
  const [originCategoryId, setOriginCategoryId] = useState('');
  const [originSubcategoryId, setOriginSubcategoryId] = useState('');
  // Destino
  const [destCategoryId, setDestCategoryId] = useState('');
  const [destSubcategoryId, setDestSubcategoryId] = useState('');
  // Seleção
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: allSubcategories = [] } = useSubcategories();
  const { data: products = [], isLoading } = useBatchProducts(
    originCategoryId || undefined,
    originSubcategoryId && originSubcategoryId !== 'ALL_SUBCATS' ? originSubcategoryId : undefined
  );
  const batchMove = useBatchMoveProducts();

  // Subcategorias filtradas por categoria
  const originSubcategories = useMemo(() => {
    if (!originCategoryId) return [];
    return allSubcategories.filter(s => s.category_id === originCategoryId);
  }, [allSubcategories, originCategoryId]);

  const destSubcategories = useMemo(() => {
    if (!destCategoryId) return [];
    return allSubcategories.filter(s => s.category_id === destCategoryId);
  }, [allSubcategories, destCategoryId]);

  // Produtos selecionados com detalhes
  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  // Subcategoria de destino selecionada
  const destSubcategory = useMemo(() => {
    return allSubcategories.find(s => s.id === destSubcategoryId);
  }, [allSubcategories, destSubcategoryId]);

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

  const handleConfirm = () => {
    if (!destCategoryId) {
      toast.error('Selecione uma categoria de destino');
      return;
    }

    batchMove.mutate(
      { 
        productIds: selectedIds, 
        targetCategoryId: destCategoryId,
        targetSubcategoryId: destSubcategoryId || undefined 
      },
      {
        onSuccess: () => {
          setShowPreview(false);
          setSelectedIds([]);
          // Limpar origem para forçar recarregar
          setOriginCategoryId('');
          setOriginSubcategoryId('');
        },
      }
    );
  };

  const canProceed = selectedIds.length > 0 && destCategoryId && (destCategoryId !== originCategoryId || destSubcategoryId !== originSubcategoryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Mover Produtos de Subcategoria
        </CardTitle>
        <CardDescription>
          Mova produtos em massa de uma subcategoria para outra, mantendo todos os dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seletor de Origem e Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Origem */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Origem (de onde sairão)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select value={originCategoryId} onValueChange={(v) => {
                  setOriginCategoryId(v);
                  setOriginSubcategoryId('');
                  setSelectedIds([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Subcategoria</label>
                <Select
                  value={originSubcategoryId}
                  onValueChange={(v) => {
                    setOriginSubcategoryId(v);
                    setSelectedIds([]);
                  }}
                  disabled={!originCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={originCategoryId ? "Todas as subcategorias" : "Selecione categoria primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_SUBCATS">Todas as subcategorias</SelectItem>
                    {originSubcategories.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Destino */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Destino (para onde irão)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select value={destCategoryId} onValueChange={(v) => {
                  setDestCategoryId(v);
                  setDestSubcategoryId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Subcategoria</label>
                <Select
                  value={destSubcategoryId}
                  onValueChange={setDestSubcategoryId}
                  disabled={!destCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={destCategoryId ? "Selecione a subcategoria (opcional)" : "Selecione categoria primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {destSubcategories.map(sub => (
                      <SelectItem
                        key={sub.id}
                        value={sub.id}
                        disabled={sub.id === originSubcategoryId && destCategoryId === originCategoryId}
                      >
                        {sub.name}
                        {sub.id === originSubcategoryId && destCategoryId === originCategoryId && ' (mesma origem)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de produtos */}
        {products.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Produtos da subcategoria de origem ({products.length})
              </h3>
              <Badge variant="outline">
                {selectedIds.length} selecionado(s)
              </Badge>
            </div>
            <ScrollArea className="h-[300px] border rounded-lg">
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
                    <TableHead>Subcategoria Atual</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id} className={selectedIds.includes(product.id) ? 'bg-primary/10' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.subcategory?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        ) : originCategoryId && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Nenhum produto encontrado nesta categoria/subcategoria
          </div>
        ) : !originCategoryId ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            Selecione uma categoria de origem para visualizar produtos
          </div>
        ) : null}

        {/* Ações */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium">
                {selectedIds.length} produto(s) selecionado(s) para mover
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedIds([])}>
                Limpar Seleção
              </Button>
              <Button
                onClick={() => setShowPreview(true)}
                disabled={!canProceed}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Pré-visualizar Movimentação
              </Button>
            </div>
          </div>
        )}

        {/* Dialog de confirmação */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-warning" />
                Confirmar Movimentação
              </DialogTitle>
              <DialogDescription>
                Você está prestes a mover {selectedIds.length} produto(s) para outra subcategoria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">De</p>
                  <p className="font-semibold">
                    {originSubcategories.find(s => s.id === originSubcategoryId)?.name || '-'}
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-primary" />
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-semibold text-primary">
                    {destSubcategory?.name || '-'}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Produtos a serem movidos:</h4>
                <ScrollArea className="max-h-[200px]">
                  <ul className="space-y-1">
                    {selectedProducts.map(product => (
                      <li key={product.id} className="text-sm flex items-center gap-2">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {product.name}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm">
                  Todos os demais dados dos produtos serão mantidos. Apenas a subcategoria será alterada.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={batchMove.isPending}>
                {batchMove.isPending ? 'Movendo...' : `Mover ${selectedIds.length} Produtos`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
