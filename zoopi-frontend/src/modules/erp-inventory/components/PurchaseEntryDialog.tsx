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
import { useERPSuppliers } from '../hooks/useERPSuppliers';
import { useERPUnits } from '../hooks/useERPUnits';
import type { ERPPurchaseEntryFormData } from '../types';

interface PurchaseEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ERPPurchaseEntryFormData) => void;
  isLoading?: boolean;
}

export function PurchaseEntryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: PurchaseEntryDialogProps) {
  const { items } = useERPItems(['raw', 'consumable']);
  const { suppliers } = useERPSuppliers();
  const { units } = useERPUnits();

  const [formData, setFormData] = useState<ERPPurchaseEntryFormData>({
    supplier_id: undefined,
    entry_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    freight: 0,
    taxes: 0,
    notes: '',
    items: [],
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { erp_item_id: '', qty: 1, unit_id: undefined, unit_cost: 0 },
      ],
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const totalItems = formData.items.reduce((sum, item) => sum + item.qty * item.unit_cost, 0);
  const totalEntry = totalItems + (formData.freight || 0) + (formData.taxes || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      alert('Adicione pelo menos um item');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Entrada de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={formData.supplier_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, supplier_id: value === 'none' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nº Nota</Label>
              <Input
                value={formData.invoice_number || ''}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formData.freight}
                onChange={(e) => setFormData({ ...formData, freight: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Items */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg">Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum item adicionado
              </p>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Item</Label>
                      <Select
                        value={item.erp_item_id || 'none'}
                        onValueChange={(value) =>
                          updateItem(index, 'erp_item_id', value === 'none' ? '' : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={item.qty}
                        onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Unidade</Label>
                      <Select
                        value={item.unit_id || 'none'}
                        onValueChange={(value) =>
                          updateItem(index, 'unit_id', value === 'none' ? undefined : value)
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
                      <Label className="text-xs">Custo Un</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-1 text-right text-sm font-medium pt-5">
                      R$ {(item.qty * item.unit_cost).toFixed(2)}
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Totals */}
          <div className="flex justify-end gap-8 text-sm">
            <div>
              <span className="text-muted-foreground">Subtotal:</span>{' '}
              <span className="font-medium">R$ {totalItems.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-bold text-lg">R$ {totalEntry.toFixed(2)}</span>
            </div>
          </div>

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
              {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
