import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssets } from '../hooks/useAssets';
import { STATUS_LABELS, CATEGORY_LABELS, Asset, AssetFormData, AssetCategory } from '../types';
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
  Package, 
  Plus, 
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

const STATUS_ICONS = {
  operational: CheckCircle,
  maintenance: Wrench,
  broken: XCircle,
  disposed: AlertTriangle,
};

const STATUS_COLORS = {
  operational: 'bg-green-500',
  maintenance: 'bg-yellow-500',
  broken: 'bg-gray-500',
  disposed: 'bg-red-500',
};

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'kitchen', label: 'Cozinha' },
  { value: 'refrigeration', label: 'Refrigeração' },
  { value: 'furniture', label: 'Móveis' },
  { value: 'electronics', label: 'Eletrônicos' },
  { value: 'vehicle', label: 'Veículo' },
  { value: 'other', label: 'Outros' },
];

export function AssetsPage() {
  const { assets, isLoading, createAsset } = useAssets();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AssetFormData>({
    name: '',
    code: '',
    category: 'kitchen',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    purchase_date: '',
    purchase_value_cents: 0,
    warranty_expires_at: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'kitchen',
      brand: '',
      model: '',
      serial_number: '',
      location: '',
      purchase_date: '',
      purchase_value_cents: 0,
      warranty_expires_at: '',
      notes: '',
    });
    setDialogOpen(false);
  };

  const handleCreateAsset = () => {
    if (!formData.name.trim()) return;
    createAsset.mutate(formData, {
      onSuccess: resetForm,
    });
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (cents: number | null) => {
    if (!cents) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const statusCounts = assets.reduce((acc, asset) => {
    const status = asset.status || 'operational';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalValue = assets.reduce((sum, a) => sum + (a.purchase_value_cents || 0), 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Ativos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Ativos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Gestão de Ativos</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ativo
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operacionais</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statusCounts.operational || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
              <Wrench className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{statusCounts.maintenance || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quebrados</CardTitle>
              <XCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{statusCounts.broken || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ativo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Assets List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum ativo encontrado</p>
              </CardContent>
            </Card>
          ) : (
            filteredAssets.map((asset) => {
              const status = asset.status || 'operational';
              const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] || CheckCircle;
              return (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{asset.name}</CardTitle>
                        {asset.code && (
                          <p className="text-sm text-muted-foreground">Cód: {asset.code}</p>
                        )}
                      </div>
                      <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {asset.category && (
                        <div>
                          <p className="text-muted-foreground">Categoria</p>
                          <p className="font-medium">{CATEGORY_LABELS[asset.category as keyof typeof CATEGORY_LABELS] || asset.category}</p>
                        </div>
                      )}
                      {asset.brand && (
                        <div>
                          <p className="text-muted-foreground">Marca</p>
                          <p className="font-medium">{asset.brand}</p>
                        </div>
                      )}
                      {asset.location && (
                        <div>
                          <p className="text-muted-foreground">Local</p>
                          <p className="font-medium">{asset.location}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Valor</p>
                        <p className="font-medium">{formatCurrency(asset.purchase_value_cents)}</p>
                      </div>
                    </div>
                    
                    {asset.warranty_expires_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Garantia até: {formatDate(asset.warranty_expires_at)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog para criar novo ativo */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ativo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do ativo"
                />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: AT-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category || 'kitchen'}
                  onValueChange={(value) => setFormData({ ...formData, category: value as AssetCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Marca"
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Modelo"
                />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Cozinha"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.purchase_value_cents ? (formData.purchase_value_cents / 100).toFixed(2) : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    const numValue = parseFloat(value || '0');
                    setFormData({ ...formData, purchase_value_cents: Math.round((isNaN(numValue) ? 0 : numValue) * 100) });
                  }}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Compra</Label>
                <Input
                  type="date"
                  value={formData.purchase_date || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Garantia até</Label>
                <Input
                  type="date"
                  value={formData.warranty_expires_at || ''}
                  onChange={(e) => setFormData({ ...formData, warranty_expires_at: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleCreateAsset} disabled={createAsset.isPending || !formData.name.trim()}>
                {createAsset.isPending ? 'Criando...' : 'Criar Ativo'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
