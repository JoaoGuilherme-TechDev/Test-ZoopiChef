import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useERPItems } from '../hooks/useERPItems';
import { useERPUnits } from '../hooks/useERPUnits';
import type { ERPRecipeFormData } from '../types';

interface RecipeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ERPRecipeFormData) => void;
  initialSaleItemId?: string;
  isLoading?: boolean;
}

export function RecipeEditorDialog({
  open,
  onOpenChange,
  onSubmit,
  initialSaleItemId,
  isLoading,
}: RecipeEditorDialogProps) {
  const { items: saleItems } = useERPItems('sale');
  const { items: componentItems } = useERPItems(['raw', 'consumable']);
  const { units } = useERPUnits();

  const [formData, setFormData] = useState<ERPRecipeFormData>({
    sale_item_id: initialSaleItemId || '',
    yield_qty: 1,
    notes: '',
    lines: [],
  });

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { component_item_id: '', qty: 1, unit_id: undefined, waste_percent: 0 },
      ],
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  // Calculate total cost
  const totalCost = formData.lines.reduce((sum, line) => {
    const component = componentItems.find((i) => i.id === line.component_item_id);
    const componentCost = component?.avg_cost || 0;
    const wasteFactor = 1 + (line.waste_percent || 0) / 100;
    return sum + line.qty * componentCost * wasteFactor;
  }, 0);

  const costPerUnit = formData.yield_qty > 0 ? totalCost / formData.yield_qty : totalCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sale_item_id) {
      alert('Selecione o produto de venda');
      return;
    }
    if (formData.lines.length === 0) {
      alert('Adicione pelo menos um componente');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha Técnica / Receita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto de Venda *</Label>
              <Select
                value={formData.sale_item_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, sale_item_id: value === 'none' ? '' : value })
                }
                disabled={!!initialSaleItemId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {saleItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rendimento (quantidade produzida)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={formData.yield_qty}
                onChange={(e) =>
                  setFormData({ ...formData, yield_qty: parseFloat(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Components */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg">Componentes / Insumos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            {formData.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum componente adicionado
              </p>
            ) : (
              <div className="space-y-3">
                {formData.lines.map((line, index) => {
                  const component = componentItems.find((i) => i.id === line.component_item_id);
                  const lineCost =
                    (component?.avg_cost || 0) * line.qty * (1 + (line.waste_percent || 0) / 100);

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">Insumo</Label>
                        <Select
                          value={line.component_item_id || 'none'}
                          onValueChange={(value) =>
                            updateLine(index, 'component_item_id', value === 'none' ? '' : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {componentItems.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} (R$ {i.avg_cost?.toFixed(2) || '0.00'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          min={0.001}
                          step="0.001"
                          value={line.qty}
                          onChange={(e) => updateLine(index, 'qty', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={line.unit_id || 'none'}
                          onValueChange={(value) =>
                            updateLine(index, 'unit_id', value === 'none' ? undefined : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Un" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {units.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.symbol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Perda %</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={line.waste_percent}
                          onChange={(e) =>
                            updateLine(index, 'waste_percent', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>

                      <div className="col-span-1 text-right text-sm font-medium pt-5">
                        R$ {lineCost.toFixed(2)}
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Cost Summary */}
          <Card className="p-4 bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Custo Total da Receita</p>
                <p className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Custo por Unidade (CMV)</p>
                <p className="text-2xl font-bold text-primary">R$ {costPerUnit.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Ficha Técnica'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
