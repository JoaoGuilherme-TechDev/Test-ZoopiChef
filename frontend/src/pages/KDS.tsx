import { useState } from 'react';
import { KDSLayout } from '@/components/kds/KDSLayout';
import { KDSOrderCard } from '@/components/kds/KDSOrderCard';
import { KDSMessageOverlay } from '@/components/kds/KDSMessageOverlay';
import { KDSHistorySheet } from '@/components/kds/KDSHistorySheet';
import { KDSHistoryOrderView } from '@/components/kds/KDSHistoryOrderView';
import { MultiStageKDSView } from '@/components/kds/multistage';
import { useKDS, KDSFilters } from '@/hooks/useKDS';
import { useKDSSettings } from '@/hooks/useKDSSettings';
import { useMultiStageEnabled } from '@/hooks/useMultiStageKDS';
import { usePrintSectors } from '@/hooks/usePrintSectors';
import { OrderStatus } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, ChefHat, Clock, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryOrder {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  table_number: string | null;
  status: string;
  created_at: string;
  order_type: string | null;
  notes: string | null;
  order_items: { id: string; product_name: string; quantity: number; notes: string | null }[];
}

export default function KDS() {
  const [filters, setFilters] = useState<KDSFilters>({
    sectorId: null,
    status: 'all',
  });
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<HistoryOrder | null>(null);

  const { orders, stats, isLoading, updateOrderStatus } = useKDS(filters);
  const { settings } = useKDSSettings();
  const { isEnabled: isMultiStageEnabled, isLoading: multiStageLoading } = useMultiStageEnabled();
  const { activeSectors } = usePrintSectors();

  const handleStatusChange = (
    orderId: string, 
    status: OrderStatus,
    orderNumber?: number,
    customerName?: string | null,
    delivererId?: string | null
  ) => {
    updateOrderStatus.mutate({ orderId, status, orderNumber, customerName, delivererId }, {
      onSuccess: () => {
        toast.success('Status atualizado!');
      },
      onError: () => {
        toast.error('Erro ao atualizar status');
      }
    });
  };

  const statusButtons = [
    { value: 'all', label: 'Todos', count: stats.total, icon: RefreshCw },
    { value: 'novo', label: 'Novos', count: stats.novo, icon: AlertTriangle, color: 'text-yellow-400' },
    { value: 'preparo', label: 'Preparo', count: stats.preparo, icon: ChefHat, color: 'text-orange-400' },
    { value: 'pronto', label: 'Prontos', count: stats.pronto, icon: CheckCircle2, color: 'text-green-400' },
  ];

  // Show multi-stage KDS when enabled
  if (isMultiStageEnabled && !multiStageLoading) {
    return (
      <KDSLayout title="KDS - Multi-Etapas">
        <KDSMessageOverlay />
        <MultiStageKDSView isAdmin={true} />
      </KDSLayout>
    );
  }

  // Classic KDS mode
  return (
    <KDSLayout title="KDS - Kitchen Display">
      {/* Message Overlay */}
      <KDSMessageOverlay />

      {/* History Order View Dialog */}
      <KDSHistoryOrderView 
        order={selectedHistoryOrder} 
        onClose={() => setSelectedHistoryOrder(null)} 
      />
      
      {/* Main container - flex column to handle fixed footer */}
      <div className="flex flex-col h-full min-h-0">
        {/* Multi-stage indicator */}
        {!isMultiStageEnabled && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Layers className="h-3 w-3" />
            <span>Modo Clássico</span>
          </div>
        )}
        
        {/* Filters Bar - scrollable horizontally if needed */}
        <div className="flex-shrink-0 space-y-3 pb-3">
          {/* Top Row: Sector Filters + History Button */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-1 overflow-x-auto scrollbar-thin">
              <div className="flex gap-2 pb-1 min-w-max">
                {/* Always show "Todos os Setores" button */}
                <Button
                  variant={filters.sectorId === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(f => ({ ...f, sectorId: null }))}
                  className={cn(
                    "transition-all whitespace-nowrap text-xs sm:text-sm",
                    filters.sectorId === null 
                      ? "bg-primary hover:bg-primary/90" 
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  Todos
                </Button>
                {/* Show all active sectors */}
                {activeSectors.map(sector => (
                  <Button
                    key={sector.id}
                    variant={filters.sectorId === sector.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(f => ({ ...f, sectorId: sector.id }))}
                    className="transition-all whitespace-nowrap text-xs sm:text-sm"
                    style={{
                      backgroundColor: filters.sectorId === sector.id ? sector.color : undefined,
                      borderColor: sector.color,
                      color: filters.sectorId === sector.id ? 'white' : sector.color,
                    }}
                  >
                    {sector.name}
                    <Badge 
                      variant="secondary" 
                      className="ml-1 sm:ml-2 bg-white/20 text-current text-xs"
                    >
                      {sector.sla_minutes}m
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* History Button - always visible */}
            <div className="flex-shrink-0">
              <KDSHistorySheet onViewOrder={setSelectedHistoryOrder} />
            </div>
          </div>

          {/* Status Filters - horizontally scrollable */}
          <div className="overflow-x-auto scrollbar-thin">
            <div className="flex gap-2 pb-1 min-w-max">
              {statusButtons.map(btn => {
                const Icon = btn.icon;
                return (
                  <Button
                    key={btn.value}
                    variant={filters.status === btn.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(f => ({ ...f, status: btn.value as OrderStatus | 'all' }))}
                    className={cn(
                      "transition-all whitespace-nowrap text-xs sm:text-sm",
                      filters.status === btn.value 
                        ? "bg-muted hover:bg-muted/80" 
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2", btn.color)} />
                    {btn.label}
                    <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                      {btn.count}
                    </Badge>
                  </Button>
                );
              })}

              {stats.overdue > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse px-2 sm:px-3 py-1 text-xs whitespace-nowrap">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  {stats.overdue} atrasado(s)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Orders Grid - fills remaining space, scrolls independently */}
        <div className="flex-1 min-h-0 overflow-auto pb-16 sm:pb-14">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ChefHat className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-50" />
              <p className="text-base sm:text-lg">Nenhum pedido pendente</p>
              <p className="text-xs sm:text-sm">Os pedidos aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {orders.map(order => (
                <KDSOrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  isUpdating={updateOrderStatus.isPending}
                  warnAfterMinutes={settings?.warn_after_minutes || 10}
                  dangerAfterMinutes={settings?.danger_after_minutes || 20}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats Bar - fixed at bottom, responsive */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-2 sm:px-4 py-2 sm:py-3 z-40">
          <div className="flex items-center justify-between max-w-full">
            <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs sm:text-sm text-foreground whitespace-nowrap">{stats.novo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-orange-500" />
                  <span className="text-xs sm:text-sm text-foreground whitespace-nowrap">{stats.preparo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                  <span className="text-xs sm:text-sm text-foreground whitespace-nowrap">{stats.pronto}</span>
                </div>
              </div>
            </div>
            
            {stats.overdue > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse text-xs flex-shrink-0 ml-2">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">{stats.overdue} pedido(s) atrasado(s)</span>
                <span className="sm:hidden">{stats.overdue}</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    </KDSLayout>
  );
}
