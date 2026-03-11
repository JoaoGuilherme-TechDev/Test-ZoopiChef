import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useERPItems } from '../hooks/useERPItems';
import type { ERPStockAdjustFormData } from '../types';

interface StockAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ERPStockAdjustFormData) => void;
  preselectedItemId?: string;
  isLoading?: boolean;
}

export function StockAdjustDialog({
  open,
  onOpenChange,
  onSubmit,
  preselectedItemId,
  isLoading,
}: StockAdjustDialogProps) {
  const { items } = useERPItems(['raw', 'consumable']);

  const [formData, setFormData] = useState<ERPStockAdjustFormData>({
    erp_item_id: preselectedItemId || '',
    adjustment_type: 'adjust_in',
    qty: 0,
    reason: '',
  });

  const selectedItem = items.find((i) => i.id === formData.erp_item_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.erp_item_id) {
      alert('Selecione o item');
      return;
    }
    if (formData.qty <= 0) {
      alert('Quantidade deve ser maior que zero');
      return;
    }
    if (!formData.reason.trim()) {
      alert('Informe o motivo do ajuste');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste de Estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item *</Label>
            <Select
              value={formData.erp_item_id || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, erp_item_id: value === 'none' ? '' : value })
              }
              disabled={!!preselectedItemId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} (Atual: {item.current_stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <strong>Estoque atual:</strong> {selectedItem.current_stock}{' '}
                {selectedItem.base_unit?.symbol}
              </p>
              <p>
                <strong>Custo médio:</strong> R$ {selectedItem.avg_cost?.toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Ajuste *</Label>
            <Select
              value={formData.adjustment_type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  adjustment_type: value as 'adjust_in' | 'adjust_out' | 'waste_out',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_in">Entrada (+) - Ajuste positivo</SelectItem>
                <SelectItem value="adjust_out">Saída (-) - Ajuste negativo</SelectItem>
                <SelectItem value="waste_out">Perda / Desperdício (-)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              min={0.001}
              step="0.001"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Ex: Conferência de inventário, produto vencido, quebra..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar Ajuste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
