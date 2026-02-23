import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAssetMaintenance } from '../hooks/useAssetMaintenance';
import { useAssets } from '../hooks/useAssets';
import { MAINTENANCE_TYPE_LABELS, MAINTENANCE_STATUS_LABELS, MaintenanceFormData, MaintenanceType } from '../types';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wrench, 
  Plus, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from 'lucide-react';

const STATUS_CONFIG = {
  scheduled: { color: 'bg-blue-500', icon: Calendar },
  in_progress: { color: 'bg-yellow-500', icon: Clock },
  completed: { color: 'bg-green-500', icon: CheckCircle },
  cancelled: { color: 'bg-red-500', icon: AlertTriangle },
};

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
  { value: 'inspection', label: 'Inspeção' },
];

export function AssetMaintenancePage() {
  const { maintenance: maintenanceRecords, isLoading, completeMaintenance, createMaintenance } = useAssetMaintenance();
  const { assets } = useAssets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    asset_id: '',
    maintenance_type: 'preventive',
    description: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    provider_name: '',
    provider_phone: '',
    cost_cents: 0,
    recurrence_days: undefined,
  });

  const resetForm = () => {
    setFormData({
      asset_id: '',
      maintenance_type: 'preventive',
      description: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      provider_name: '',
      provider_phone: '',
      cost_cents: 0,
      recurrence_days: undefined,
    });
    setDialogOpen(false);
  };

  const handleCreateMaintenance = () => {
    if (!formData.asset_id || !formData.scheduled_date) return;
    createMaintenance.mutate(formData, {
      onSuccess: resetForm,
    });
  };

  const getAssetName = (assetId: string) => {
    return assets.find(a => a.id === assetId)?.name || 'Ativo';
  };

  const formatCurrency = (cents: number | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const upcomingMaintenance = maintenanceRecords.filter(m => 
    m.status === 'scheduled' && 
    m.scheduled_date && 
    new Date(m.scheduled_date) > new Date()
  );

  const overdueMaintenance = maintenanceRecords.filter(m => 
    m.status === 'scheduled' && 
    m.scheduled_date && 
    new Date(m.scheduled_date) < new Date()
  );

  const totalCost = maintenanceRecords
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + (m.cost_cents || 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Manutenções">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Manutenções">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manutenções de Ativos</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Manutenção
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{upcomingMaintenance.length}</div>
            </CardContent>
          </Card>

          <Card className={overdueMaintenance.length > 0 ? 'border-red-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overdueMaintenance.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {maintenanceRecords.filter(m => m.status === 'completed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Alert */}
        {overdueMaintenance.length > 0 && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Manutenções Atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {overdueMaintenance.map((maintenance) => (
                  <div key={maintenance.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-medium">{getAssetName(maintenance.asset_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        {MAINTENANCE_TYPE_LABELS[maintenance.maintenance_type as keyof typeof MAINTENANCE_TYPE_LABELS]}
                        {' - '}Agendada: {formatDate(maintenance.scheduled_date)}
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => completeMaintenance.mutate({ id: maintenance.id, cost_cents: 0 })}
                    >
                      Concluir
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Manutenções</CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma manutenção registrada
              </div>
            ) : (
              <div className="space-y-3">
                {maintenanceRecords.map((maintenance) => {
                  const status = maintenance.status || 'scheduled';
                  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = config?.icon || Calendar;
                  
                  return (
                    <div key={maintenance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{getAssetName(maintenance.asset_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {MAINTENANCE_TYPE_LABELS[maintenance.maintenance_type as keyof typeof MAINTENANCE_TYPE_LABELS]}
                          </p>
                          {maintenance.description && (
                            <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Agendada</p>
                          <p>{formatDate(maintenance.scheduled_date)}</p>
                        </div>
                        {maintenance.cost_cents && (
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Custo</p>
                            <p className="font-medium">{formatCurrency(maintenance.cost_cents)}</p>
                          </div>
                        )}
                        <Badge className={config?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {MAINTENANCE_STATUS_LABELS[status as keyof typeof MAINTENANCE_STATUS_LABELS]}
                        </Badge>
                        
                        {status === 'scheduled' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => completeMaintenance.mutate({ id: maintenance.id, cost_cents: 0 })}
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para criar nova manutenção */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar Manutenção</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ativo *</Label>
              <Select
                value={formData.asset_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ativo" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} {asset.code && `(${asset.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.maintenance_type}
                  onValueChange={(value) => setFormData({ ...formData, maintenance_type: value as MaintenanceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAINTENANCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Agendada *</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do serviço..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prestador</Label>
                <Input
                  value={formData.provider_name || ''}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Nome do prestador"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.provider_phone || ''}
                  onChange={(e) => setFormData({ ...formData, provider_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo Estimado (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.cost_cents ? (formData.cost_cents / 100).toFixed(2) : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    const numValue = parseFloat(value || '0');
                    setFormData({ ...formData, cost_cents: Math.round((isNaN(numValue) ? 0 : numValue) * 100) });
                  }}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Recorrência (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.recurrence_days || ''}
                  onChange={(e) => setFormData({ ...formData, recurrence_days: parseInt(e.target.value) || undefined })}
                  placeholder="Ex: 30"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateMaintenance} 
                disabled={createMaintenance.isPending || !formData.asset_id || !formData.scheduled_date}
              >
                {createMaintenance.isPending ? 'Agendando...' : 'Agendar Manutenção'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
