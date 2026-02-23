/**
 * Admin CRUD for Pizza Dough Types and Border Types
 * Used in Settings > Pizza page
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  usePizzaDoughTypes,
  usePizzaBorderTypes,
  useUpsertPizzaDoughType,
  useUpsertPizzaBorderType,
  useDeletePizzaDoughType,
  useDeletePizzaBorderType,
  type PizzaDoughType,
  type PizzaBorderType,
} from '@/hooks/usePizzaDoughBorderTypes';

// ─── Generic Item Form ───

interface ItemFormData {
  id?: string;
  name: string;
  description: string;
  price_delta: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

const emptyForm: ItemFormData = {
  name: '',
  description: '',
  price_delta: 0,
  is_active: true,
  is_default: false,
  sort_order: 0,
};

function ItemFormDialog({
  open,
  onClose,
  title,
  item,
  onSave,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  item: ItemFormData;
  onSave: (data: ItemFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<ItemFormData>(item);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Massa Pan"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label>Valor Adicional (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price_delta}
              onChange={(e) => setForm({ ...form, price_delta: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Ordem de Exibição</Label>
            <Input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Padrão</Label>
            <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={isPending || !form.name.trim()}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dough Types Section ───

export function PizzaDoughTypesAdmin() {
  const { data: items = [], isLoading } = usePizzaDoughTypes();
  const upsert = useUpsertPizzaDoughType();
  const remove = useDeletePizzaDoughType();
  const [editItem, setEditItem] = useState<ItemFormData | null>(null);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tipos de Massa</CardTitle>
            <CardDescription>Configure os tipos de massa disponíveis para pizzas</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditItem({ ...emptyForm })}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum tipo de massa cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.name}</span>
                  {item.price_delta > 0 && (
                    <Badge variant="outline" className="text-xs">+{formatCurrency(item.price_delta)}</Badge>
                  )}
                  {item.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                  {!item.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditItem({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price_delta: item.price_delta,
                    is_active: item.is_active,
                    is_default: item.is_default,
                    sort_order: item.sort_order,
                  })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editItem && (
          <ItemFormDialog
            open={!!editItem}
            onClose={() => setEditItem(null)}
            title={editItem.id ? 'Editar Tipo de Massa' : 'Novo Tipo de Massa'}
            item={editItem}
            isPending={upsert.isPending}
            onSave={(data) => {
              upsert.mutate(data, { onSuccess: () => setEditItem(null) });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Border Types Section ───

export function PizzaBorderTypesAdmin() {
  const { data: items = [], isLoading } = usePizzaBorderTypes();
  const upsert = useUpsertPizzaBorderType();
  const remove = useDeletePizzaBorderType();
  const [editItem, setEditItem] = useState<ItemFormData | null>(null);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tipos de Borda</CardTitle>
            <CardDescription>Configure os tipos de borda disponíveis para pizzas</CardDescription>
          </div>
          <Button size="sm" onClick={() => setEditItem({ ...emptyForm })}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum tipo de borda cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.name}</span>
                  {item.price_delta > 0 && (
                    <Badge variant="outline" className="text-xs">+{formatCurrency(item.price_delta)}</Badge>
                  )}
                  {item.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                  {!item.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditItem({
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price_delta: item.price_delta,
                    is_active: item.is_active,
                    is_default: item.is_default,
                    sort_order: item.sort_order,
                  })}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editItem && (
          <ItemFormDialog
            open={!!editItem}
            onClose={() => setEditItem(null)}
            title={editItem.id ? 'Editar Tipo de Borda' : 'Novo Tipo de Borda'}
            item={editItem}
            isPending={upsert.isPending}
            onSave={(data) => {
              upsert.mutate(data, { onSuccess: () => setEditItem(null) });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
