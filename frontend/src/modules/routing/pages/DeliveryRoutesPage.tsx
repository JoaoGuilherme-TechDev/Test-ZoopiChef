import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useDeliveryRoutes } from '../hooks/useDeliveryRoutes';
import { ROUTE_STATUS_LABELS } from '../types';
import { 
  MapPin, 
  Plus, 
  Truck,
  Clock,
  CheckCircle,
  Navigation,
  PlusCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  planning: { color: 'bg-muted text-muted-foreground', icon: Clock },
  active: { color: 'bg-primary text-primary-foreground', icon: Navigation },
  completed: { color: 'bg-success text-success-foreground', icon: CheckCircle },
};

export function DeliveryRoutesPage() {
  const { routes, isLoading, startRoute, completeRoute, createRoute, addStop } = useDeliveryRoutes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddStopDialogOpen, setIsAddStopDialogOpen] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [newStop, setNewStop] = useState({
    address: '',
    customer_name: '',
    notes: '',
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR');
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const activeRoutes = routes.filter(r => r.status === 'active');
  const pendingRoutes = routes.filter(r => r.status === 'planning');
  const completedToday = routes.filter(r => 
    r.status === 'completed' && 
    new Date(r.created_at).toDateString() === new Date().toDateString()
  );

  const handleCreateRoute = () => {
    createRoute.mutate(
      { route_date: new Date().toISOString().split('T')[0] },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
        },
      }
    );
  };

  const handleAddStop = () => {
    if (!selectedRouteId || !newStop.address) return;
    
    addStop.mutate(
      { 
        route_id: selectedRouteId, 
        address: newStop.address,
        notes: newStop.notes || undefined,
      },
      {
        onSuccess: () => {
          setIsAddStopDialogOpen(false);
          setNewStop({ address: '', customer_name: '', notes: '' });
          setSelectedRouteId(null);
        },
      }
    );
  };

  const openAddStopDialog = (routeId: string) => {
    setSelectedRouteId(routeId);
    setIsAddStopDialogOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Roteirização">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Roteirização">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Roteirização de Entregas</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Rota
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Rota</DialogTitle>
                <DialogDescription>
                  Crie uma nova rota de entrega para hoje
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Data da Rota</Label>
                  <Input
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRoute} disabled={createRoute.isPending}>
                  {createRoute.isPending ? 'Criando...' : 'Criar Rota'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Add Stop Dialog */}
        <Dialog open={isAddStopDialogOpen} onOpenChange={setIsAddStopDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Parada</DialogTitle>
              <DialogDescription>
                Adicione uma nova parada à rota
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Endereço *</Label>
                <Input
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  value={newStop.address}
                  onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  placeholder="Nome do cliente (opcional)"
                  value={newStop.customer_name}
                  onChange={(e) => setNewStop({ ...newStop, customer_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  placeholder="Observações sobre a entrega"
                  value={newStop.notes}
                  onChange={(e) => setNewStop({ ...newStop, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddStopDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddStop} disabled={addStop.isPending || !newStop.address}>
                {addStop.isPending ? 'Adicionando...' : 'Adicionar Parada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rotas Ativas</CardTitle>
              <Navigation className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{activeRoutes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRoutes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas Hoje</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{completedToday.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Rotas</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{routes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Routes */}
        {activeRoutes.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Navigation className="h-5 w-5" />
                Rotas em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeRoutes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Rota #{route.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {route.stops?.length || 0} paradas • Iniciada às {route.started_at ? formatTime(route.started_at) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAddStopDialog(route.id)}>
                        <PlusCircle className="h-4 w-4 mr-1" /> Parada
                      </Button>
                      <Button onClick={() => completeRoute.mutate(route.id)}>
                        Finalizar Rota
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Routes List */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            {routes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma rota cadastrada
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((route) => {
                  const status = route.status;
                  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = config?.icon || Clock;
                  
                  return (
                    <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Rota #{route.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(route.route_date)} • {route.stops?.length || 0} paradas
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {route.total_distance_km && (
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Distância</p>
                            <p className="font-medium">{route.total_distance_km.toFixed(1)} km</p>
                          </div>
                        )}
                        {route.total_duration_minutes && (
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Duração Est.</p>
                            <p className="font-medium">{route.total_duration_minutes} min</p>
                          </div>
                        )}
                        <Badge className={config?.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {ROUTE_STATUS_LABELS[status as keyof typeof ROUTE_STATUS_LABELS]}
                        </Badge>
                        
                        {status === 'planning' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openAddStopDialog(route.id)}
                            >
                              <PlusCircle className="h-4 w-4 mr-1" /> Parada
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => startRoute.mutate(route.id)}
                            >
                              Iniciar
                            </Button>
                          </div>
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
    </DashboardLayout>
  );
}
