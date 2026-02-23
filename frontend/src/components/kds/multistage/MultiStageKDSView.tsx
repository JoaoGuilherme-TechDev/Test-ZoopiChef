import { useState, useMemo } from 'react';
import { Loader2, ChefHat, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MultiStageOrderCard } from './MultiStageOrderCard';
import {
  useMultiStageOrders,
  useKDSStageDefinitions,
  useCurrentUserKDSRoles,
  useAdvanceStage,
  useUpdateUrgency,
  urgencyConfig,
  type UrgencyLevel,
} from '@/hooks/useMultiStageKDS';

interface MultiStageKDSViewProps {
  isAdmin?: boolean;
}

export function MultiStageKDSView({ isAdmin = false }: MultiStageKDSViewProps) {
  const { orders, isLoading: ordersLoading } = useMultiStageOrders();
  const { stages: stageDefinitions, isLoading: stagesLoading } = useKDSStageDefinitions();
  const { userRoles } = useCurrentUserKDSRoles();
  const advanceStage = useAdvanceStage();
  const updateUrgency = useUpdateUrgency();

  // Filter options
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);

  // Stats
  const stats = useMemo(() => {
    const byStage = stageDefinitions.reduce((acc, stage) => {
      acc[stage.stage_key] = orders.filter(o => 
        o.current_stage?.stage_key === stage.stage_key
      ).length;
      return acc;
    }, {} as Record<string, number>);

    const byUrgency = {
      critical: orders.filter(o => o.urgency === 'critical').length,
      high: orders.filter(o => o.urgency === 'high').length,
      normal: orders.filter(o => o.urgency === 'normal').length,
      low: orders.filter(o => o.urgency === 'low').length,
    };

    return { byStage, byUrgency, total: orders.length };
  }, [orders, stageDefinitions]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedStage && order.current_stage?.stage_key !== selectedStage) return false;
      if (selectedUrgency && order.urgency !== selectedUrgency) return false;
      return true;
    });
  }, [orders, selectedStage, selectedUrgency]);

  const handleAdvanceStage = (orderId: string, stageKey: string) => {
    advanceStage.mutate({ orderId, stageKey });
  };

  const handleUrgencyChange = (orderId: string, urgency: UrgencyLevel) => {
    updateUrgency.mutate({ orderId, urgency });
  };

  if (ordersLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedStage === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStage(null)}
          className={cn(
            selectedStage === null ? "bg-primary" : "border-slate-600 text-slate-300"
          )}
        >
          Todas Etapas
          <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
        </Button>
        
        {stageDefinitions.filter(s => s.is_active).map(stage => (
          <Button
            key={stage.id}
            variant={selectedStage === stage.stage_key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedStage(
              selectedStage === stage.stage_key ? null : stage.stage_key
            )}
            className={cn(
              "gap-2",
              selectedStage === stage.stage_key
                ? ""
                : "border-slate-600 text-slate-300"
            )}
            style={selectedStage === stage.stage_key ? { backgroundColor: stage.color } : undefined}
          >
            {stage.stage_name}
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-1",
                selectedStage === stage.stage_key && "bg-white/20"
              )}
            >
              {stats.byStage[stage.stage_key] || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Urgency Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground self-center mr-2">Urgência:</span>
        <Button
          variant={selectedUrgency === null ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedUrgency(null)}
          className={cn(
            selectedUrgency === null ? "bg-slate-700" : "text-slate-400"
          )}
        >
          Todas
        </Button>
        {(['critical', 'high', 'normal', 'low'] as UrgencyLevel[]).map(level => {
          const config = urgencyConfig[level];
          const count = stats.byUrgency[level];
          if (count === 0 && level !== selectedUrgency) return null;
          
          return (
            <Button
              key={level}
              variant={selectedUrgency === level ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedUrgency(
                selectedUrgency === level ? null : level
              )}
              className={cn(
                selectedUrgency === level && config.bgColor,
                selectedUrgency !== level && config.color
              )}
            >
              {config.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Critical orders warning */}
      {stats.byUrgency.critical > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500 rounded-lg animate-pulse">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-bold text-red-400">
            {stats.byUrgency.critical} pedido(s) com urgência CRÍTICA!
          </span>
        </div>
      )}

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ChefHat className="h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">Nenhum pedido</h3>
          <p className="text-slate-500 mt-2">
            {selectedStage || selectedUrgency
              ? 'Nenhum pedido corresponde aos filtros selecionados.'
              : 'Aguardando novos pedidos...'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOrders.map(order => (
            <MultiStageOrderCard
              key={order.id}
              order={order}
              stageDefinitions={stageDefinitions}
              userStageKeys={userRoles}
              onAdvanceStage={handleAdvanceStage}
              onUrgencyChange={handleUrgencyChange}
              isAdvancing={advanceStage.isPending}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
