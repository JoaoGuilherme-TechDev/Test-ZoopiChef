import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Order, OrderStatus } from '@/hooks/useOrders';
import { Deliverer } from '@/hooks/useDeliverers';
import { OrderCard } from './OrderCard';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Square, Truck } from 'lucide-react';

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'em_rota', label: 'Em Rota' },
  { value: 'entregue', label: 'Entregue' },
];

interface KanbanColumnProps {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onDragStart: (e: React.DragEvent, orderId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: OrderStatus) => void;
  color: string;
  onPrintOrder?: (order: Order) => void;
  deliverers?: Deliverer[];
  onAssignDeliverer?: (orderId: string, delivererId: string | null) => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  // Selection props
  selectionMode?: boolean;
  selectedOrderIds?: Set<string>;
  onToggleSelection?: (orderId: string) => void;
  onSelectAll?: (status: OrderStatus, orderIds: string[]) => void;
  onBatchStatusChange?: (orderIds: string[], newStatus: OrderStatus) => void;
  onBatchDispatch?: () => void;
}

export function KanbanColumn({
  title,
  status,
  orders,
  onDragStart,
  onDragOver,
  onDrop,
  color,
  onPrintOrder,
  deliverers,
  onAssignDeliverer,
  onStatusChange,
  selectionMode,
  selectedOrderIds,
  onToggleSelection,
  onSelectAll,
  onBatchStatusChange,
  onBatchDispatch,
}: KanbanColumnProps) {
  const selectedCount = orders.filter(o => selectedOrderIds?.has(o.id)).length;
  const allSelected = orders.length > 0 && selectedCount === orders.length;
  const selectedInColumn = orders.filter(o => selectedOrderIds?.has(o.id));

  const handleSelectAll = () => {
    if (onSelectAll) {
      if (allSelected) {
        // Deselect all in this column
        onSelectAll(status, []);
      } else {
        // Select all in this column
        onSelectAll(status, orders.map(o => o.id));
      }
    }
  };

  const handleBatchStatusChange = (newStatus: string) => {
    if (onBatchStatusChange && selectedInColumn.length > 0) {
      onBatchStatusChange(selectedInColumn.map(o => o.id), newStatus as OrderStatus);
    }
  };


  return (
    <div
      className="flex flex-col bg-muted/30 rounded-lg min-w-[340px] w-[340px] flex-shrink-0"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      <div className={cn("p-3 rounded-t-lg", color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-xs bg-background/30 text-white px-2 py-0.5 rounded-full font-medium">
                {selectedCount} sel.
              </span>
            )}
            <span className="text-xs bg-background/20 px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </div>
        </div>
        
        {/* Batch selection controls - always visible when has orders */}
        {selectionMode && orders.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20 flex-wrap">
            <button
              onClick={handleSelectAll}
              className={cn(
                "flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity",
                allSelected && "font-medium"
              )}
            >
              {allSelected ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              <span>{allSelected ? 'Desmarcar' : 'Selecionar'}</span>
            </button>
            
            {/* Batch status change select - visible when has selections */}
            {selectedCount > 0 && onBatchStatusChange && (
              <Select onValueChange={handleBatchStatusChange}>
                <SelectTrigger className="h-6 w-24 text-xs bg-white/20 border-white/30">
                  <SelectValue placeholder="Mover" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.filter(s => s.value !== status).map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Batch dispatch button - only visible on "pronto" column */}
            {status === 'pronto' && selectedCount > 0 && onBatchDispatch && (
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs bg-green-600 hover:bg-green-700 text-white px-2"
                onClick={onBatchDispatch}
              >
                <Truck className="h-3 w-3 mr-1" />
                Despachar
              </Button>
            )}
          </div>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="relative">
              {/* Selection checkbox overlay */}
              {selectionMode && onToggleSelection && (
                <div 
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(order.id);
                  }}
                >
                  <Checkbox
                    checked={selectedOrderIds?.has(order.id) || false}
                    className="bg-background border-2"
                  />
                </div>
              )}
              <OrderCard
                order={order}
                onDragStart={onDragStart}
                onPrint={onPrintOrder}
                deliverers={deliverers}
                onAssignDeliverer={onAssignDeliverer}
                onStatusChange={onStatusChange}
                className={cn(
                  selectedOrderIds?.has(order.id) && 'ring-2 ring-primary'
                )}
              />
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum pedido
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
