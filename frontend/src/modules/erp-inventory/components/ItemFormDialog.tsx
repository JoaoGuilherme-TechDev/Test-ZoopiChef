import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useERPUnits } from '../hooks/useERPUnits';
import type { ERPItemFormData, ERPItemType } from '../types';
import { ITEM_TYPE_LABELS } from '../types';

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ERPItemFormData) => void;
  initialData?: ERPItemFormData & { id?: string };
  isLoading?: boolean;
}

export function ItemFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: ItemFormDialogProps) {
  const { units } = useERPUnits();
  const [formData, setFormData] = useState<ERPItemFormData>(
    initialData || {
      name: '',
      sku: '',
      item_type: 'raw',
      base_unit_id: undefined,
      track_stock: true,
      min_stock: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Editar Item' : 'Novo Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU / Código</Label>
            <Input
              id="sku"
              value={formData.sku || ''}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={formData.item_type}
              onValueChange={(value) => setFormData({ ...formData, item_type: value as ERPItemType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.item_type === 'sale' && 'Produtos preparados como pizza, lanche, pratos (usam ficha técnica)'}
              {formData.item_type === 'resale' && 'Produtos comprados e vendidos diretamente (refrigerante, água, vinho)'}
              {formData.item_type === 'raw' && 'Ingredientes e insumos (farinha, arroz, feijão, carne)'}
              {formData.item_type === 'consumable' && 'Materiais de uso interno (escritório, descartáveis)'}
              {formData.item_type === 'service' && 'Serviços prestados ou contratados'}
              {formData.item_type === 'cleaning' && 'Produtos de limpeza e higiene'}
              {formData.item_type === 'fixed_asset' && 'Bens duráveis (equipamentos, móveis, máquinas)'}
              {formData.item_type === 'packaging' && 'Embalagens para delivery e take-away'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Unidade Base</Label>
            <Select
              value={formData.base_unit_id || 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, base_unit_id: value === 'none' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name} ({unit.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="track_stock"
                checked={formData.track_stock}
                onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
              />
              <Label htmlFor="track_stock">Controlar Estoque</Label>
            </div>
          </div>

          {formData.track_stock && (
            <div className="space-y-2">
              <Label htmlFor="min_stock">Estoque Mínimo</Label>
              <Input
                id="min_stock"
                type="number"
                min={0}
                step="0.01"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
