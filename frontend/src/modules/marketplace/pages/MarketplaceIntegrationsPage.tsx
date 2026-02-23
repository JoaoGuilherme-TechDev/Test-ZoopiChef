import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketplaceIntegrations } from '../hooks/useMarketplaceIntegrations';
import { IFoodMenuImportExport } from '../components/IFoodMenuImportExport';
import { VirtualBrandsManager } from '../components/VirtualBrandsManager';
import { MarketplaceStoresManager } from '../components/MarketplaceStoresManager';
import { 
  PROVIDER_LABELS, 
  PROVIDER_COLORS,
  INTEGRATION_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  MarketplaceProvider,
  MarketplaceOrderStatus
} from '../types';
import { 
  ShoppingBag, 
  Link,
  Unlink,
  RefreshCw,
  Check,
  X,
  Clock,
  Truck,
  Package,
  Settings,
  Bell,
  Download,
  Store,
  Layers
} from 'lucide-react';

const ORDER_STATUS_CONFIG: Record<MarketplaceOrderStatus, { color: string; icon: any }> = {
  placed: { color: 'bg-blue-500', icon: Bell },
  confirmed: { color: 'bg-yellow-500', icon: Clock },
  integrated: { color: 'bg-purple-500', icon: Package },
  preparation_started: { color: 'bg-orange-500', icon: Clock },
  ready_for_pickup: { color: 'bg-cyan-500', icon: Package },
  dispatched: { color: 'bg-indigo-500', icon: Truck },
  delivered: { color: 'bg-green-500', icon: Check },
  cancelled: { color: 'bg-red-500', icon: X },
};

const AVAILABLE_PROVIDERS: MarketplaceProvider[] = ['ifood', 'rappi', 'ubereats', 'aiqfome'];

export function MarketplaceIntegrationsPage() {
  const { 
    integrations, 
    orders, 
    isLoading,
    pendingOrdersCount,
    connectMarketplace,
    disconnectMarketplace,
    updateSettings,
    acceptOrder,
    rejectOrder,
    updateOrderStatus,
    syncMenu,
  } = useMarketplaceIntegrations();
  
  const [activeTab, setActiveTab] = useState<'integrations' | 'orders' | 'import' | 'brands' | 'stores'>('integrations');

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatTime = (dateStr: string) => 
    new Date(dateStr).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });

  if (isLoading) {
    return (
      <DashboardLayout title="Marketplaces">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Marketplaces">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrações Marketplace</h1>
            <p className="text-muted-foreground">iFood, Rappi, Uber Eats e mais</p>
          </div>
          {pendingOrdersCount > 0 && (
            <Badge className="bg-red-500 animate-pulse">
              <Bell className="h-3 w-3 mr-1" />
              {pendingOrdersCount} pedidos pendentes
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="integrations">
              <Link className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Pedidos
              {pendingOrdersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="brands">
              <Layers className="h-4 w-4 mr-2" />
              Marcas Virtuais
            </TabsTrigger>
            <TabsTrigger value="stores">
              <Store className="h-4 w-4 mr-2" />
              Lojas
            </TabsTrigger>
            <TabsTrigger value="import">
              <Download className="h-4 w-4 mr-2" />
              Importar Cardápio
            </TabsTrigger>
          </TabsList>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {AVAILABLE_PROVIDERS.map((provider) => {
                const integration = integrations.find(i => i.provider === provider);
                const isConnected = integration?.status === 'connected';
                
                return (
                  <Card key={provider} className={isConnected ? 'border-green-500' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: PROVIDER_COLORS[provider] }}
                        >
                          {PROVIDER_LABELS[provider].charAt(0)}
                        </div>
                        <div>
                          <CardTitle>{PROVIDER_LABELS[provider]}</CardTitle>
                          <Badge 
                            variant={isConnected ? 'default' : 'secondary'}
                            className={isConnected ? 'bg-green-500' : ''}
                          >
                            {INTEGRATION_STATUS_LABELS[integration?.status || 'disconnected']}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isConnected ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Aceitar automaticamente</span>
                            <Switch 
                              checked={integration.auto_accept_orders}
                              onCheckedChange={(checked) => 
                                updateSettings.mutate({
                                  integrationId: integration.id,
                                  settings: { auto_accept_orders: checked }
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Imprimir automaticamente</span>
                            <Switch 
                              checked={integration.auto_print_orders}
                              onCheckedChange={(checked) => 
                                updateSettings.mutate({
                                  integrationId: integration.id,
                                  settings: { auto_print_orders: checked }
                                })
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => syncMenu.mutate(integration.id)}
                              disabled={syncMenu.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Sincronizar Cardápio
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => disconnectMarketplace.mutate(integration.id)}
                            >
                              <Unlink className="h-4 w-4 mr-1" />
                              Desconectar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          className="w-full"
                          onClick={() => connectMarketplace.mutate(provider)}
                          disabled={connectMarketplace.isPending}
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Conectar {PROVIDER_LABELS[provider]}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido de marketplace</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {orders.map((order) => {
                      const statusConfig = ORDER_STATUS_CONFIG[order.status];
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div 
                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: PROVIDER_COLORS[order.provider] }}
                              >
                                {PROVIDER_LABELS[order.provider].charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">#{order.display_id}</span>
                                  <Badge className={statusConfig.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {ORDER_STATUS_LABELS[order.status]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.customer_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(order.placed_at)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(order.total_cents)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {order.payment_prepaid ? 'Pago online' : order.payment_method}
                                </p>
                              </div>

                              {order.status === 'placed' && (
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    onClick={() => acceptOrder.mutate(order.id)}
                                    disabled={acceptOrder.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => rejectOrder.mutate({ 
                                      orderId: order.id, 
                                      reason: 'Estabelecimento fechado' 
                                    })}
                                    disabled={rejectOrder.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}

                              {order.status === 'confirmed' && (
                                <Button 
                                  size="sm"
                                  onClick={() => updateOrderStatus.mutate({ 
                                    orderId: order.id, 
                                    status: 'preparation_started' 
                                  })}
                                >
                                  Iniciar Preparo
                                </Button>
                              )}

                              {order.status === 'preparation_started' && (
                                <Button 
                                  size="sm"
                                  onClick={() => updateOrderStatus.mutate({ 
                                    orderId: order.id, 
                                    status: 'ready_for_pickup' 
                                  })}
                                >
                                  Pronto
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              </Card>
          </TabsContent>

          {/* Import/Export Tab */}
          <TabsContent value="import" className="mt-4">
            <IFoodMenuImportExport />
          </TabsContent>

          {/* Virtual Brands Tab */}
          <TabsContent value="brands" className="mt-4">
            <VirtualBrandsManager />
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores" className="mt-4">
            <MarketplaceStoresManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
