import { useState } from 'react';
import { useERPCostCenters } from '../hooks';
import { ERPDataTable } from '../components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export function ERPCostCentersPage() {
  const { costCenters, isLoading, createCostCenter, updateCostCenter } = useERPCostCenters();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '' });

  const handleCreate = async () => {
    if (!form.code || !form.name) {
      toast.error('Código e nome são obrigatórios');
      return;
    }
    await createCostCenter.mutateAsync(form);
    setForm({ code: '', name: '', description: '' });
    setOpen(false);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateCostCenter.mutateAsync({ id, is_active: !isActive });
  };

  // Export configuration
  const exportData = costCenters.map(cc => ({
    codigo: cc.code,
    nome: cc.name,
    descricao: cc.description || '',
    status: cc.is_active ? 'Ativo' : 'Inativo',
  }));

  const exportColumns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nome', label: 'Nome' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'status', label: 'Status' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Centros de Custo">
        <div className="space-y-6 animate-in fade-in duration-500">
          <SkeletonTable rows={8} columns={5} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Centros de Custo">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between gap-4">
          <ExportDropdown
            data={exportData}
            columns={exportColumns}
            filename="centros-custo"
            title="Centros de Custo"
            disabled={costCenters.length === 0}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Centro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Centro de Custo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Código</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="Ex: CC001"
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Cozinha"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrição opcional"
                  />
                </div>
                <Button onClick={handleCreate} disabled={createCostCenter.isPending} className="w-full">
                  Criar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Centros de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            {costCenters.length === 0 ? (
              <EmptyData entity="centros de custo" type="table" />
            ) : (
              <ERPDataTable
                columns={[
                  { key: 'code', header: 'Código' },
                  { key: 'name', header: 'Nome' },
                  { key: 'description', header: 'Descrição' },
                  {
                    key: 'is_active',
                    header: 'Status',
                    render: (item) => (
                      <Badge variant={(item as { is_active: boolean }).is_active ? 'default' : 'secondary'}>
                        {(item as { is_active: boolean }).is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Ações',
                    render: (item) => {
                      const cc = item as { id: string; is_active: boolean };
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(cc.id, cc.is_active)}
                        >
                          {cc.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                      );
                    },
                  },
                ]}
                data={costCenters}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
