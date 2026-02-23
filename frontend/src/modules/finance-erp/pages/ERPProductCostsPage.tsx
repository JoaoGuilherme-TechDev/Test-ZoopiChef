import { useState } from 'react';
import { useERPProductCosts } from '../hooks';
import { ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ExportDropdown } from '@/components/export/ExportDropdown';
import { SkeletonTable } from '@/components/ui/skeleton-table';
import { EmptyData } from '@/components/ui/empty-state';

export function ERPProductCostsPage() {
  const { productCosts, isLoading, setProductCost } = useERPProductCosts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    unit_cost: '',
    optional_cost: '',
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);

  const handleCreate = async () => {
    if (!form.product_id || !form.unit_cost) {
      toast.error('Produto e custo unitário são obrigatórios');
      return;
    }
    await setProductCost.mutateAsync({
      product_id: form.product_id,
      unit_cost_cents: Math.round(parseFloat(form.unit_cost) * 100),
      optional_cost_cents: form.optional_cost ? Math.round(parseFloat(form.optional_cost) * 100) : 0,
    });
    setForm({ product_id: '', unit_cost: '', optional_cost: '' });
    setOpen(false);
  };

  // Export configuration
  const exportData = productCosts.map(c => ({
    produto: c.product_name,
    custo_unitario: c.unit_cost_cents,
    custo_opcionais: c.optional_cost_cents,
    vigencia_inicio: c.effective_from,
    vigencia_fim: c.effective_to || 'Atual',
  }));

  const exportColumns = [
    { key: 'produto', label: 'Produto' },
    { key: 'custo_unitario', label: 'Custo Unitário', format: (v: number) => formatCurrency(v) },
    { key: 'custo_opcionais', label: 'Custo Opcionais', format: (v: number) => formatCurrency(v) },
    { key: 'vigencia_inicio', label: 'Vigência Início' },
    { key: 'vigencia_fim', label: 'Vigência Fim' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Custos de Produtos">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonTable rows={8} columns={4} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Custos de Produtos">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between gap-4">
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="custos-produtos"
            title="Custos de Produtos"
            disabled={productCosts.length === 0}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Custo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Custo de Produto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>ID do Produto</Label>
                  <Input
                    value={form.product_id}
                    onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                    placeholder="UUID do produto"
                  />
                </div>
                <div>
                  <Label>Custo Unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Custo Opcionais (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.optional_cost}
                    onChange={(e) => setForm({ ...form, optional_cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={handleCreate} disabled={setProductCost.isPending} className="w-full">
                  Cadastrar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Custos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {productCosts.length === 0 ? (
              <EmptyData entity="custos" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'product_name', header: 'Produto' },
                  {
                    key: 'unit_cost_cents',
                    header: 'Custo Unitário',
                    align: 'right',
                    render: (item) => formatCurrency((item as { unit_cost_cents: number }).unit_cost_cents),
                  },
                  {
                    key: 'optional_cost_cents',
                    header: 'Custo Opcionais',
                    align: 'right',
                    render: (item) => formatCurrency((item as { optional_cost_cents: number }).optional_cost_cents),
                  },
                  {
                    key: 'effective_from',
                    header: 'Vigência',
                    render: (item) => {
                      const c = item as { effective_from: string; effective_to: string | null };
                      return c.effective_to ? `${c.effective_from} - ${c.effective_to}` : `Desde ${c.effective_from}`;
                    },
                  },
                ]}
                data={productCosts}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
