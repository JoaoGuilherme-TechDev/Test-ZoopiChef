import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Tag, Layers, QrCode, LayoutGrid, RefreshCw, Settings, Loader2 } from 'lucide-react';
import { useComandas, useComandaMutations, type ComandaStatus } from '@/hooks/useComandas';
import { ComandaMapCard } from '@/components/comandas/ComandaMapCard';
import { ComandaBatchCreateDialog } from '@/components/comandas/ComandaBatchCreateDialog';
import { ComandaQRBatchDialog } from '@/components/comandas/ComandaQRBatchDialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type StatusFilter = 'all' | 'free' | 'occupied' | 'no_activity' | 'bill_requested';

export default function Comandas() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [qrBatchDialogOpen, setQrBatchDialogOpen] = useState(false);

  // Fetch all comandas except (legacy) closed; we still include 'closed' here to avoid "sumir" do mapa
  // caso alguma tela tenha fechado errado no passado.
  const { comandas, isLoading } = useComandas(['free', 'open', 'no_activity', 'requested_bill', 'closed']);
  const { requestBill, updateComanda } = useComandaMutations();

  // Calculate status for filtering (open with no consumption = no_activity visually)
  const getComandaVisualStatus = (comanda: typeof comandas[0]): StatusFilter => {
    if (comanda.status === 'free' || comanda.status === 'closed') return 'free';
    if (comanda.status === 'requested_bill') return 'bill_requested';
    const hasConsumption = Number(comanda.total_amount) > 0;
    if (comanda.status === 'open' && !hasConsumption) return 'no_activity';
    if (comanda.status === 'open' && hasConsumption) return 'occupied';
    return 'free';
  };

  const filteredComandas = comandas.filter((comanda) => {
    // Search filter
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      comanda.command_number.toString().includes(searchLower) ||
      (comanda.name?.toLowerCase().includes(searchLower) ?? false);
    
    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter !== 'all') {
      const visualStatus = getComandaVisualStatus(comanda);
      if (visualStatus !== statusFilter) return false;
    }

    return true;
  });

  // Calculate stats
  const stats = {
    total: comandas.length,
    free: comandas.filter(c => c.status === 'free' || c.status === 'closed').length,
    occupied: comandas.filter(c => c.status === 'open' && Number(c.total_amount) > 0).length,
    noActivity: comandas.filter(c => c.status === 'open' && Number(c.total_amount) === 0).length,
    billRequested: comandas.filter(c => c.status === 'requested_bill').length,
  };

  const handleComandaClick = async (comanda: typeof comandas[0]) => {
    if (comanda.status === 'free') {
      // Open the comanda (set status to 'open')
      try {
        await updateComanda.mutateAsync({
          comandaId: comanda.id,
          updates: {
            status: 'open',
            opened_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
          }
        });
        toast.success(`Comanda ${comanda.command_number} aberta!`);
        navigate(`/comandas/${comanda.id}`);
      } catch (error) {
        toast.error('Erro ao abrir comanda');
      }
    } else {
      // Navigate to comanda detail
      navigate(`/comandas/${comanda.id}`);
    }
  };

  const handleRequestBill = async (comanda: typeof comandas[0]) => {
    try {
      await requestBill.mutateAsync(comanda.id);
      toast.success(`Conta solicitada para comanda ${comanda.command_number}`);
    } catch (error) {
      toast.error('Erro ao solicitar conta');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Comandas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mapa de Comandas">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Mapa de Comandas</h1>
              <p className="text-muted-foreground text-sm">
                {stats.total} comandas • {stats.occupied} ocupadas • {stats.free} livres
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQrBatchDialogOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Codes
            </Button>
            <Button variant="outline" onClick={() => setBatchCreateOpen(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Criar em Lote
            </Button>
            <Link to="/settings/comandas">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        {comandas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                <Tag className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nenhuma comanda cadastrada</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Para usar o mapa de comandas, primeiro crie suas comandas em lote
              </p>
              <Button size="lg" onClick={() => setBatchCreateOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Criar Comandas
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'free' ? 'ring-2 ring-green-500' : ''}`}
                onClick={() => setStatusFilter('free')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.free}</p>
                      <p className="text-xs text-muted-foreground">Livres</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'occupied' ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setStatusFilter('occupied')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.occupied}</p>
                      <p className="text-xs text-muted-foreground">Ocupadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'no_activity' ? 'ring-2 ring-yellow-500' : ''}`}
                onClick={() => setStatusFilter('no_activity')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.noActivity}</p>
                      <p className="text-xs text-muted-foreground">Sem consumo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'bill_requested' ? 'ring-2 ring-red-500' : ''}`}
                onClick={() => setStatusFilter('bill_requested')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.billRequested}</p>
                      <p className="text-xs text-muted-foreground">Conta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar comanda..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as comandas</SelectItem>
                  <SelectItem value="free">Livres</SelectItem>
                  <SelectItem value="occupied">Ocupadas</SelectItem>
                  <SelectItem value="no_activity">Sem consumo</SelectItem>
                  <SelectItem value="bill_requested">Conta pedida</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Comandas Map */}
            {filteredComandas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-8 w-8 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma comanda corresponde aos filtros</p>
                  <Button variant="link" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
                {filteredComandas
                  .sort((a, b) => a.command_number - b.command_number)
                  .map((comanda) => (
                    <ComandaMapCard
                      key={comanda.id}
                      comanda={comanda}
                      onClick={() => handleComandaClick(comanda)}
                      onRequestBill={() => handleRequestBill(comanda)}
                    />
                  ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      <ComandaBatchCreateDialog open={batchCreateOpen} onOpenChange={setBatchCreateOpen} />
      <ComandaQRBatchDialog open={qrBatchDialogOpen} onOpenChange={setQrBatchDialogOpen} />
    </DashboardLayout>
  );
}
