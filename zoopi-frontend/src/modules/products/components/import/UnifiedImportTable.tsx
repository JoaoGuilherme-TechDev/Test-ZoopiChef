// src/modules/products/components/import/UnifiedImportTable.tsx
import { useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { PendingProduct } from '../../hooks/useDataHub';

interface Props {
  products: PendingProduct[];
  onSave: (finalProducts: PendingProduct[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function UnifiedImportTable({ products, onSave, onCancel, isSaving }: Props) {
  const [list, setList] = useState<PendingProduct[]>(products);

  const updateItem = (index: number, field: keyof PendingProduct, value: any) => {
    const newList = [...list];
    newList[index] = { ...newList[index], [field]: value };
    setList(newList);
  };

  const removeItem = (index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const totalValue = list.reduce((acc, curr) => acc + (curr.price || 0), 0);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-black uppercase tracking-tight">
            Conferência de Importação
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Revise os dados abaixo. Você pode editar qualquer campo diretamente na tabela.
          </p>
        </div>
        <Badge variant="outline" className="h-6 border-primary/50 text-primary font-black">
          {list.length} ITENS IDENTIFICADOS
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[30%]">Produto</TableHead>
                <TableHead className="w-[20%]">Categoria</TableHead>
                <TableHead className="w-[20%]">Subcategoria</TableHead>
                <TableHead className="w-[15%]">Preço (R$)</TableHead>
                <TableHead className="w-[10%] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item, index) => (
                <TableRow key={index} className="hover:bg-primary/5 transition-colors">
                  <TableCell>
                    <Input 
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="h-8 text-sm font-bold bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={item.category_name}
                      onChange={(e) => updateItem(index, 'category_name', e.target.value)}
                      className="h-8 text-sm bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={item.subcategory_name || ''}
                      onChange={(e) => updateItem(index, 'subcategory_name', e.target.value)}
                      placeholder="Geral"
                      className="h-8 text-sm bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                      className="h-8 text-sm font-black text-primary bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 mx-auto text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-6 border-t">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground uppercase font-bold text-[10px] block">Valor Estimado do Lote</span>
            <span className="text-xl font-black text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={() => onSave(list)} 
            className="btn-neon px-8 gap-2"
            disabled={isSaving || list.length === 0}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4 animate-pulse" /> Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Confirmar e Salvar no Banco
              </span>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}