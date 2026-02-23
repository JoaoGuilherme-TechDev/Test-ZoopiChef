import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useOrders, OrderStatus, Order } from '@/hooks/useOrders';
import { useDeliverers } from '@/hooks/useDeliverers';
import { useCashSession } from '@/hooks/useCashSession';
import { KanbanColumn } from '@/components/orders/KanbanColumn';
import { CashOpenDialog } from '@/components/orders/CashOpenDialog';
import { CashClosingDialog } from '@/components/orders/CashClosingDialog';
import { BatchDispatchDialog } from '@/components/orders/BatchDispatchDialog';
import { BatchStatusDialog } from '@/components/orders/BatchStatusDialog';
import { OrderCounterResetDialog } from '@/components/orders/OrderCounterResetDialog';
import { KitchenPrintListener } from '@/components/orders/KitchenPrintListener';
import { AutoPrintListener } from '@/components/orders/AutoPrintListener';
import { InternalMessagePrintListener } from '@/components/orders/InternalMessagePrintListener';
import { Loader2, Volume2, VolumeX, Printer, DollarSign, Truck, ArrowRight, RefreshCw, Lock, Unlock, AlertTriangle, Bell } from 'lucide-react';
import { ServiceCallsPanel } from '@/components/orders/ServiceCallsPanel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOrderNotification } from '@/hooks/useOrderNotification';
import { useCompany } from '@/hooks/useCompany';
import { useOrderStatusEvents } from '@/hooks/useOrderStatusEvents';
import { useOrderCounter } from '@/hooks/useOrderCounter';
import { usePrintJobQueue } from '@/hooks/usePrintJobQueue';

// Coluna "novo" removida do Kanban visual - pedidos "novo" são tratados como "preparo"
const columns: { status: OrderStatus; title: string; color: string }[] = [
  { status: 'preparo', title: 'Preparo', color: 'bg-yellow-500 text-white' },
  { status: 'pronto', title: 'Pronto', color: 'bg-green-500 text-white' },
  { status: 'em_rota', title: 'Em Rota', color: 'bg-purple-500 text-white' },
  { status: 'entregue', title: 'Entregue', color: 'bg-gray-500 text-white' },
];

export default function Orders() {
  const { orders, isLoading, updateOrderStatus, assignDeliverer } = useOrders();
  const { deliverers } = useDeliverers();
  const { data: company } = useCompany();
  const { createPrintJob } = usePrintJobQueue();
  const { openSession, isCashOpen, isLoading: cashLoading } = useCashSession();
  const { recordStatusChange } = useOrderStatusEvents();
  const { shouldShowResetDialog } = useOrderCounter();
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [openCashDialogOpen, setOpenCashDialogOpen] = useState(false);
  const [batchDispatchOpen, setBatchDispatchOpen] = useState(false);
  const [batchStatusOpen, setBatchStatusOpen] = useState(false);
  const [counterResetOpen, setCounterResetOpen] = useState(false);
  // Som usa configuração da empresa por padrão
  const companySoundEnabled = company?.order_sound_enabled ?? true;
  const [localSoundEnabled, setLocalSoundEnabled] = useState(true);
  const soundEnabled = companySoundEnabled && localSoundEnabled;
  
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    const saved = localStorage.getItem('orderAutoPrintEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Selection state for batch operations
  const [selectionMode, setSelectionMode] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Check if we should show the counter reset dialog on load
  useEffect(() => {
    const hasShownToday = sessionStorage.getItem('counterResetShown');
    if (!hasShownToday && shouldShowResetDialog()) {
      setCounterResetOpen(true);
      sessionStorage.setItem('counterResetShown', 'true');
    }
  }, [shouldShowResetDialog]);

  const { playNotificationSound, checkNewOrders } = useOrderNotification(soundEnabled);

  // Track new orders by their IDs to detect newly arrived orders
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const printedOrdersRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  
  // Check for new orders and play sound (auto-print handled by AutoPrintListener)
  useEffect(() => {
    const currentOrderIds = new Set(orders.map(o => o.id));
    
    // Skip the initial load to avoid printing all existing orders
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      // Initialize with current orders
      previousOrderIdsRef.current = currentOrderIds;
      console.log('[Orders] Inicialização - pedidos existentes:', currentOrderIds.size);
      return;
    }
    
    // Find orders that are new (not in previousOrderIds)
    const newlyArrivedOrders = orders.filter(order => 
      !previousOrderIdsRef.current.has(order.id) && 
      !printedOrdersRef.current.has(order.id) &&
      (order.status === 'novo' || order.status === 'preparo')
    );
    
    if (newlyArrivedOrders.length > 0) {
      console.log('[Orders] Novos pedidos detectados:', newlyArrivedOrders.length, 'soundEnabled:', soundEnabled);
      
      // Play notification sound - sempre tenta tocar
      playNotificationSound();
      
      // Show toast for new orders (NO printing here - handled by AutoPrintListener)
      newlyArrivedOrders.forEach(order => {
        const orderNum = order.order_number ? `#${String(order.order_number).padStart(3, '0')}` : order.id.slice(-4);
        toast.info(`Novo pedido ${orderNum} chegou!`);
        printedOrdersRef.current.add(order.id);
      });
    }
    
    // Update tracked IDs
    previousOrderIdsRef.current = currentOrderIds;
  }, [orders, playNotificationSound]);

  // Save print preference

  useEffect(() => {
    localStorage.setItem('orderAutoPrintEnabled', JSON.stringify(autoPrintEnabled));
  }, [autoPrintEnabled]);

  // Clear selection for orders that no longer exist
  useEffect(() => {
    const orderIds = new Set(orders.map(o => o.id));
    setSelectedOrderIds(prev => {
      const newSet = new Set<string>();
      prev.forEach(id => {
        if (orderIds.has(id)) {
          newSet.add(id);
        }
      });
      return newSet;
    });
  }, [orders]);

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();

    if (!draggedOrderId) return;

    const order = orders.find(o => o.id === draggedOrderId);
    if (order && order.status !== newStatus) {
      try {
        const fromStatus = order.status;
        const isAccepting = fromStatus === 'novo' && newStatus === 'preparo';

        await updateOrderStatus.mutateAsync({ orderId: draggedOrderId, status: newStatus });

        // Record the status change event for auditing (non-blocking)
        try {
          await recordStatusChange.mutateAsync({
            orderId: draggedOrderId,
            fromStatus,
            toStatus: newStatus,
            meta: { source: 'kanban' },
          });
        } catch (auditError: any) {
          console.warn('[Orders] Status updated but failed to record audit event (drag):', auditError);
          // Do not block the UX if auditing fails
        }

        if (isAccepting) {
          if (soundEnabled) {
            playNotificationSound();
          }
          // Evita impressão duplicada: a impressão automática é gerida pelos listeners/filas
          toast.success('Pedido aceito!');
        } else {
          toast.success('Status atualizado!');
        }
      } catch (error: any) {
        console.error('[Orders] Failed to update status via drag:', error);
        const msg =
          error?.message ||
          error?.error_description ||
          error?.details ||
          error?.hint ||
          error?.code ||
          (typeof error === 'string' ? error : JSON.stringify(error)) ||
          'Erro ao atualizar status';
        toast.error(msg);
      }
    }

    setDraggedOrderId(null);
  };

  const handlePrintOrder = async (order: Order) => {
    if (!company?.id) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      // Sempre enviar para a fila do agente desktop (evita abrir diálogo do Windows)
      await createPrintJob.mutateAsync({
        orderId: order.id,
        companyId: company.id,
        source: 'manual',
        ticketType: 'full',
      });
      toast.success('Enviado para impressão');
    } catch (error) {
      toast.error('Erro ao enviar para impressão');
    }
  };

  const handleAssignDeliverer = async (orderId: string, delivererId: string | null) => {
    try {
      await assignDeliverer.mutateAsync({ orderId, delivererId });
      toast.success(delivererId ? 'Entregador atribuído!' : 'Entregador removido');
    } catch (error: any) {
      console.error('[Orders] Failed to assign deliverer:', error);
      const msg = error?.message || error?.error_description || error?.details || 'Erro ao atribuir entregador';
      toast.error(msg);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const fromStatus = order?.status || null;
      const isAccepting = fromStatus === 'novo' && status === 'preparo';

      await updateOrderStatus.mutateAsync({ orderId, status });

      // Record the status change event for auditing (non-blocking)
      try {
        await recordStatusChange.mutateAsync({
          orderId,
          fromStatus,
          toStatus: status,
          meta: { source: 'manual' },
        });
      } catch (auditError: any) {
        console.warn('[Orders] Status updated but failed to record audit event (select):', auditError);
        // Do not block the UX if auditing fails
      }

      if (isAccepting && order) {
        if (soundEnabled) {
          playNotificationSound();
        }
        // Evita impressão duplicada: a impressão automática é gerida pelos listeners/filas
        toast.success('Pedido aceito!');
      } else {
        toast.success('Status atualizado!');
      }
    } catch (error: any) {
      console.error('[Orders] Failed to update status via select:', error);
      const msg =
        error?.message ||
        error?.error_description ||
        error?.details ||
        error?.hint ||
        error?.code ||
        (typeof error === 'string' ? error : JSON.stringify(error)) ||
        'Erro ao atualizar status';
      toast.error(msg);
    }
  };

  // Filtrar pedidos pela sessão de caixa atual
  // Pedidos com status "novo" são tratados como "preparo" no visual
  // IMPORTANTE: Pedidos de mesa (order_type='table') NÃO aparecem no Kanban
  const getOrdersByStatus = (status: OrderStatus) => {
    // Se o caixa está aberto, mostra apenas pedidos desta sessão
    // Se fechado, mostra pedidos SEM sessão (legado) ou da última sessão para referência
    let filteredOrders = orders.filter(order => {
      // REGRA DE ARQUITETURA: Pedidos de mesa e comanda NÃO aparecem no Kanban
      // Mesa/Comanda são CONSUMO LOCAL - gerenciados nos mapas específicos
      // Kanban é para: Balcão, Retira, Pedido Online, Ligação
      if (order.order_type === 'table' || order.fulfillment_type === 'table' ||
          order.order_type === 'comanda' || order.order_type === 'dine_in' ||
          order.order_type === 'mesa') {
        return false;
      }
      
      // Tratar "novo" como "preparo" no Kanban visual
      const effectiveStatus = order.status === 'novo' ? 'preparo' : order.status;
      return effectiveStatus === status;
    });
    
    if (isCashOpen && openSession) {
      // Caixa aberto: mostrar pedidos desta sessão OU pedidos novos sem sessão
      filteredOrders = filteredOrders.filter(order => {
        const orderSessionId = (order as any).cash_session_id;
        // Mostrar se é da sessão atual OU se não tem sessão e foi criado depois da abertura
        return orderSessionId === openSession.id || 
               (!orderSessionId && new Date(order.created_at) >= new Date(openSession.opened_at));
      });
    } else if (!isCashOpen) {
      // Caixa fechado: não exibir pedidos entregues no Kanban
      // (após o fechamento, os entregues já foram contabilizados no turno)
      if (status === 'entregue') {
        filteredOrders = [];
      }
    }
    
    return filteredOrders;
  };

  // Selection handlers
  const handleToggleSelection = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((status: OrderStatus, orderIds: string[]) => {
    const columnOrderIds = new Set(orders.filter(o => o.status === status).map(o => o.id));
    
    if (orderIds.length === 0) {
      // Clear all selections for this column
      setSelectedOrderIds(prev => {
        const newSet = new Set<string>();
        prev.forEach(id => {
          if (!columnOrderIds.has(id)) {
            newSet.add(id);
          }
        });
        return newSet;
      });
    } else {
      // Add all order IDs
      setSelectedOrderIds(prev => new Set([...prev, ...orderIds]));
    }
  }, [orders]);

  const handleBatchDispatch = useCallback(() => {
    if (selectedOrderIds.size === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    // Check if all selected are "pronto"
    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const allPronto = selectedOrders.every(o => o.status === 'pronto');
    if (!allPronto) {
      toast.error('Para despachar, todos os pedidos devem estar em "Pronto"');
      return;
    }
    setBatchDispatchOpen(true);
  }, [selectedOrderIds, orders]);

  const handleBatchStatusChange = useCallback(async (newStatus: OrderStatus): Promise<{ success: number; failed: number }> => {
    // Make a copy of selectedOrderIds before processing
    const orderIdsToProcess = Array.from(selectedOrderIds);
    const ordersToProcess = orders.filter(o => orderIdsToProcess.includes(o.id));
    
    let success = 0;
    let failed = 0;

    // Process all updates
    const updatePromises = ordersToProcess.map(async (order) => {
      if (order.status === newStatus) return { skipped: true };
      
      try {
        await updateOrderStatus.mutateAsync({ orderId: order.id, status: newStatus });
        await recordStatusChange.mutateAsync({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          meta: { source: 'manual' },
        });
        return { success: true };
      } catch (error) {
        console.error(`Failed to update order ${order.id}:`, error);
        return { success: false };
      }
    });

    const results = await Promise.all(updatePromises);
    
    results.forEach(result => {
      if (result.skipped) return;
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    });

    if (success > 0) {
      setSelectedOrderIds(new Set());
    }

    return { success, failed };
  }, [selectedOrderIds, orders, updateOrderStatus, recordStatusChange]);

  const handleDispatchSuccess = useCallback(() => {
    setSelectedOrderIds(new Set());
  }, []);

  // Handler for column-level batch status change
  const handleColumnBatchStatusChange = useCallback(async (orderIds: string[], newStatus: OrderStatus) => {
    const ordersToUpdate = orders.filter(o => orderIds.includes(o.id));
    let success = 0;
    
    for (const order of ordersToUpdate) {
      if (order.status === newStatus) continue;
      try {
        await updateOrderStatus.mutateAsync({ orderId: order.id, status: newStatus });
        await recordStatusChange.mutateAsync({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: newStatus,
          meta: { source: 'manual' },
        });
        success++;
      } catch (e) {
        console.error(`Failed to update order ${order.id}:`, e);
      }
    }
    
    if (success > 0) {
      toast.success(`${success} pedido(s) atualizado(s)!`);
      setSelectedOrderIds(new Set());
    }
  }, [orders, updateOrderStatus, recordStatusChange]);

  const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
  const hasSelectedPronto = selectedOrders.some(o => o.status === 'pronto');

  // Memoized orders by status for performance
  const ordersByStatus = useMemo(() => ({
    novo: orders.filter(o => o.status === 'novo'),
    preparo: orders.filter(o => o.status === 'preparo' || o.status === 'novo'),
    pronto: orders.filter(o => o.status === 'pronto'),
    em_rota: orders.filter(o => o.status === 'em_rota'),
    entregue: orders.filter(o => o.status === 'entregue'),
  }), [orders]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando pedidos...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Alerta de Caixa Fechado */}
        {!cashLoading && !isCashOpen && (
          <Alert variant="destructive" className="border-red-500 bg-red-500/10">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-bold">CAIXA FECHADO</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Abra o caixa para iniciar as operações do turno.</span>
              <Button
                size="sm"
                onClick={() => setOpenCashDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pedidos</h1>
            <p className="text-muted-foreground">
              {isCashOpen 
                ? 'Arraste os pedidos entre as colunas para atualizar o status'
                : 'Abra o caixa para visualizar e gerenciar pedidos'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedOrderIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchStatusOpen(true)}
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">
                    Alterar Status ({selectedOrderIds.size})
                  </span>
                </Button>
                
                {hasSelectedPronto && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBatchDispatch}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Truck className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">
                      Despachar
                    </span>
                  </Button>
                )}
              </>
            )}
            
            {/* Botão Dinâmico: Abrir/Fechar Caixa */}
            {isCashOpen ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setCashDialogOpen(true)}
              >
                <Lock className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Fechar Caixa</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setOpenCashDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Unlock className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Abrir Caixa</span>
              </Button>
            )}
            
            <Button
              variant={soundEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLocalSoundEnabled(!localSoundEnabled)}
              title={soundEnabled ? 'Som ativado' : 'Som desativado'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Som</span>
            </Button>
            
            <Button
              variant={autoPrintEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
              title={autoPrintEnabled ? 'Impressão automática ativada' : 'Impressão automática desativada'}
            >
              <Printer className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Auto-imprimir</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCounterResetOpen(true)}
              title="Alterar número do próximo pedido"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Nº Pedido</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Kanban columns */}
          <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.status}
                title={column.title}
                status={column.status}
                orders={getOrdersByStatus(column.status)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                color={column.color}
                onPrintOrder={handlePrintOrder}
                deliverers={deliverers}
                onAssignDeliverer={handleAssignDeliverer}
                onStatusChange={handleStatusChange}
                selectionMode={selectionMode}
                selectedOrderIds={selectedOrderIds}
                onToggleSelection={handleToggleSelection}
                onSelectAll={handleSelectAll}
                onBatchStatusChange={handleColumnBatchStatusChange}
                onBatchDispatch={handleBatchDispatch}
              />
            ))}
          </div>
          
          {/* Service Calls Panel - Chamadas de garçom e conta */}
          <div className="w-80 shrink-0 hidden lg:block">
            <ServiceCallsPanel />
          </div>
        </div>
      </div>
      
      <CashOpenDialog open={openCashDialogOpen} onOpenChange={setOpenCashDialogOpen} />
      <CashClosingDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
      
      <BatchDispatchDialog
        open={batchDispatchOpen}
        onOpenChange={setBatchDispatchOpen}
        selectedOrders={selectedOrders.filter(o => o.status === 'pronto')}
        deliverers={deliverers}
        onSuccess={handleDispatchSuccess}
      />
      
      <BatchStatusDialog
        open={batchStatusOpen}
        onOpenChange={setBatchStatusOpen}
        selectedOrders={selectedOrders}
        onConfirm={handleBatchStatusChange}
      />
      
      <OrderCounterResetDialog 
        open={counterResetOpen} 
        onOpenChange={setCounterResetOpen} 
      />
      
      {/* Listener de impressão automática */}
      <AutoPrintListener />
      
      {/* Listener de impressão de cozinha */}
      <KitchenPrintListener />
      
      {/* Listener de impressão de mensagens internas */}
      <InternalMessagePrintListener />
    </DashboardLayout>
  );
}
