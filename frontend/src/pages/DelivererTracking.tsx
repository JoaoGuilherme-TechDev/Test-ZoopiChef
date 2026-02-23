import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  Loader2, 
  Settings, 
  Map as MapIcon, 
  List,
  LayoutGrid,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DelivererMap,
  DeliverersSidebar,
  PendingOrdersPanel,
  RegionGroupingPanel,
  TrackingStats,
  AIDispatchPanel,
  DelivererQueuePanel,
} from '@/components/deliverers/tracking';
import { useDelivererTrackingSettings } from '@/hooks/useDelivererTrackingSettings';

interface DelivererLocation {
  id: string;
  name: string;
  whatsapp: string | null;
  is_online: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
  is_at_store?: boolean;
  arrived_at_store_at?: string | null;
  orders_in_transit: Array<{
    id: string;
    order_number?: number;
    customer_address: string | null;
    customer_name: string | null;
    status: string;
    latitude?: number | null;
    longitude?: number | null;
    delivery_eta_minutes?: number | null;
    dispatched_at?: string | null;
  }>;
}

interface StoreLocation {
  lat: number;
  lng: number;
  radius: number;
}

interface PendingOrder {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_address: string | null;
  destination_address: string | null;
  total: number;
  status: string;
  created_at: string;
  order_type: string;
  company_id?: string;
}

export default function DelivererTracking() {
  const { company } = useCompanyContext();
  const { settings } = useDelivererTrackingSettings();
  const [selectedDeliverer, setSelectedDeliverer] = useState<string | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('map');

  // Fetch deliverer locations and store location
  const { 
    data: locationData,
    isLoading: isLoadingDeliverers, 
    refetch: refetchDeliverers,
    isRefetching: isRefetchingDeliverers,
  } = useQuery({
    queryKey: ['deliverer-locations', company?.id],
    queryFn: async () => {
      if (!company?.id) return { deliverers: [], store_location: null };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deliverer-location`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'get_locations',
            company_id: company.id,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      return {
        deliverers: data.deliverers as DelivererLocation[],
        store_location: data.store_location as StoreLocation | null,
      };
    },
    enabled: !!company?.id,
    refetchInterval: 30000,
  });

  const deliverers = locationData?.deliverers || [];
  const storeLocation = locationData?.store_location || null;

  // Fetch pending orders (pronto for delivery)
  const { 
    data: pendingOrders = [], 
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['pending-orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_address, destination_address, total, status, created_at, order_type, company_id')
        .eq('company_id', company.id)
        .eq('order_type', 'delivery')
        .in('status', ['pronto'])
        .is('deliverer_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PendingOrder[];
    },
    enabled: !!company?.id,
    refetchInterval: 15000,
  });

  // Realtime subscription for deliverer location updates
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel('deliverer-locations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverer_locations',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          refetchDeliverers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          refetchOrders();
          refetchDeliverers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, refetchDeliverers, refetchOrders]);

  const handleRefresh = () => {
    refetchDeliverers();
    refetchOrders();
  };

  // Stats calculations
  const onlineCount = deliverers.filter(d => d.is_online).length;
  const ordersInTransit = deliverers.reduce((sum, d) => sum + d.orders_in_transit.length, 0);

  // Transform deliverers for sidebar
  const deliverersForSidebar = deliverers.map(d => ({
    ...d,
    orders_count: d.orders_in_transit.length,
  }));

  const isLoading = isLoadingDeliverers || isLoadingOrders;

  if (!settings?.enabled) {
    return (
      <DashboardLayout title="Rastreio de Entregadores">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Rastreio GPS Desativado</h2>
          <p className="text-muted-foreground mb-4">
            Ative o módulo de rastreio para visualizar seus entregadores no mapa.
          </p>
          <Button asChild>
            <Link to="/settings/deliverer-tracking">
              <Settings className="w-4 h-4 mr-2" />
              Configurar Rastreio
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Rastreio de Entregadores">
      <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Rastreio de Entregadores</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe em tempo real e gerencie despachos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetchingDeliverers}
            >
              {isRefetchingDeliverers ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings/deliverer-tracking">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <TrackingStats
          onlineCount={onlineCount}
          totalDeliverers={deliverers.length}
          ordersInTransit={ordersInTransit}
          pendingOrders={pendingOrders.length}
        />

        {/* Main content */}
        <div className="flex-1 min-h-0">
          {/* Mobile tabs */}
          <div className="lg:hidden h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="map">
                  <MapIcon className="w-4 h-4 mr-1" />
                  Mapa
                </TabsTrigger>
                <TabsTrigger value="deliverers">
                  <List className="w-4 h-4 mr-1" />
                  Entregadores
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Pedidos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="map" className="flex-1 min-h-0 mt-0">
                <DelivererMap
                  deliverers={deliverers}
                  selectedDeliverer={selectedDeliverer}
                  onSelectDeliverer={setSelectedDeliverer}
                  storeLocation={storeLocation}
                  showRegions={settings?.enable_region_grouping}
                  groupingRadius={settings?.max_grouping_radius_km || 2}
                />
              </TabsContent>
              <TabsContent value="deliverers" className="flex-1 min-h-0 mt-0">
                <DeliverersSidebar
                  deliverers={deliverers}
                  selectedDeliverer={selectedDeliverer}
                  onSelectDeliverer={setSelectedDeliverer}
                />
              </TabsContent>
              <TabsContent value="orders" className="flex-1 min-h-0 mt-0">
                <PendingOrdersPanel
                  orders={pendingOrders}
                  deliverers={deliverersForSidebar}
                  isLoading={isLoadingOrders}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 h-full">
            {/* Left sidebar - Deliverers */}
            <div className="col-span-3 h-full">
              <DeliverersSidebar
                deliverers={deliverers}
                selectedDeliverer={selectedDeliverer}
                onSelectDeliverer={setSelectedDeliverer}
              />
            </div>

            {/* Center - Map */}
            <div className={`${isMapExpanded ? 'col-span-9' : 'col-span-5'} h-full relative`}>
              <DelivererMap
                deliverers={deliverers}
                selectedDeliverer={selectedDeliverer}
                onSelectDeliverer={setSelectedDeliverer}
                storeLocation={storeLocation}
                showRegions={settings?.enable_region_grouping}
                groupingRadius={settings?.max_grouping_radius_km || 2}
              />
              <Button
                size="icon"
                variant="outline"
                className="absolute top-2 right-2 z-[1000] bg-background"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
              >
                {isMapExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Right sidebar - AI Dispatch & Manual Orders */}
            {!isMapExpanded && (
              <div className="col-span-4 h-full flex flex-col gap-4">
                {/* AI Dispatch Panel - Main feature */}
                <div className="flex-[2] min-h-0">
                  <AIDispatchPanel
                    deliverers={deliverers}
                    orders={pendingOrders}
                    maxOrdersPerTrip={settings?.max_deliveries_per_trip || 5}
                    onSuggestionApproved={() => {
                      refetchOrders();
                      refetchDeliverers();
                    }}
                  />
                </div>
                
                {/* Manual dispatch fallback */}
                <div className="flex-1 min-h-0">
                  <PendingOrdersPanel
                    orders={pendingOrders}
                    deliverers={deliverersForSidebar}
                    isLoading={isLoadingOrders}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
