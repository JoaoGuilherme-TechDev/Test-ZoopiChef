import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckSquare, Square, Package } from 'lucide-react';
import type { ProductForBatch } from '../types';

interface Props {
  products: ProductForBatch[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
}

export function ProductSelectionTable({ products, selectedIds, onSelectionChange, isLoading }: Props) {
  const allSelected = products.length > 0 && selectedIds.length === products.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < products.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum produto encontrado</p>
        <p className="text-sm">Selecione uma categoria ou subcategoria</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="gap-2"
          >
            {allSelected ? (
              <>
                <Square className="h-4 w-4" />
                Desmarcar todos
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Selecionar todos
              </>
            )}
          </Button>
          <Badge variant="secondary" className="text-sm">
            {selectedIds.length} de {products.length} selecionados
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className={someSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Pesado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow 
                key={product.id}
                className={selectedIds.includes(product.id) ? 'bg-primary/5' : ''}
              >
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(product.id)}
                    onCheckedChange={() => toggleOne(product.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {product.subcategory?.name || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {product.sale_price ? (
                    <div>
                      <span className="line-through text-muted-foreground text-xs">
                        {formatCurrency(product.price)}
                      </span>
                      <br />
                      <span className="text-green-600">{formatCurrency(product.sale_price)}</span>
                    </div>
                  ) : (
                    formatCurrency(product.price)
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{product.ncm_code || '-'}</TableCell>
                <TableCell>
                  {product.is_weighted ? (
                    <Badge variant="secondary">Sim</Badge>
                  ) : (
                    <span className="text-muted-foreground">Não</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
