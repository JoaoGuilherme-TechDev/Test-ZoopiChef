import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Scale, Droplet, Box } from 'lucide-react';
import { useERPUnits } from '@/modules/erp-inventory/hooks/useERPUnits';

const UNIT_TYPES = [
  { value: 'weight', label: 'Peso', icon: Scale },
  { value: 'volume', label: 'Volume', icon: Droplet },
  { value: 'unit', label: 'Unidade', icon: Box },
] as const;

interface UnitForm {
  name: string;
  symbol: string;
  unit_type: string;
}

const defaultForm: UnitForm = {
  name: '',
  symbol: '',
  unit_type: 'unit',
};

export default function SettingsUnits() {
  const { units, isLoading, createUnit } = useERPUnits();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<UnitForm>(defaultForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.symbol) {
      toast.error('Preencha nome e símbolo');
      return;
    }

    try {
      await createUnit.mutateAsync({
        name: form.name,
        symbol: form.symbol,
        unit_type: form.unit_type,
      });
      setForm(defaultForm);
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getTypeIcon = (type: string) => {
    const found = UNIT_TYPES.find(t => t.value === type);
    if (!found) return Box;
    return found.icon;
  };

  const getTypeLabel = (type: string) => {
    const found = UNIT_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <DashboardLayout title="Unidades de Medida">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Unidades Cadastradas
              </CardTitle>
              <CardDescription>
                {units.length} unidade(s) disponível(is)
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Unidade de Medida</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova unidade para uso nos produtos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Quilograma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Símbolo</Label>
                    <Input
                      id="symbol"
                      value={form.symbol}
                      onChange={(e) => setForm(prev => ({ ...prev, symbol: e.target.value }))}
                      placeholder="Ex: kg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Tipo</Label>
                    <Select value={form.unit_type} onValueChange={(v) => setForm(prev => ({ ...prev, unit_type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createUnit.isPending}>
                      {createUnit.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : units.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Scale className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma unidade cadastrada</p>
                <p className="text-sm">Clique em "Nova Unidade" para adicionar</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {units.map((unit) => {
                  const TypeIcon = getTypeIcon(unit.unit_type);
                  return (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{unit.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{unit.symbol}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {getTypeLabel(unit.unit_type)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
