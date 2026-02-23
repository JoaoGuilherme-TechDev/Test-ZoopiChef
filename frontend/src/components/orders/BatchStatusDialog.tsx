import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '@/hooks/useOrders';
import { toast } from 'sonner';

interface BatchStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Order[];
  onConfirm: (newStatus: OrderStatus) => Promise<{ success: number; failed: number }>;
}

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'preparo', label: 'Preparo' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'em_rota', label: 'Em Rota' },
  { value: 'entregue', label: 'Entregue' },
];

export function BatchStatusDialog({
  open,
  onOpenChange,
  selectedOrders,
  onConfirm
}: BatchStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const handleConfirm = async () => {
    if (!selectedStatus) {
      toast.error('Selecione um status');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await onConfirm(selectedStatus);
      setResult(res);

      if (res.success > 0) {
        toast.success(`${res.success} pedido(s) atualizado(s)!`);
        
        setTimeout(() => {
          onOpenChange(false);
          setResult(null);
          setSelectedStatus('');
        }, 1500);
      }

      if (res.failed > 0) {
        toast.warning(`${res.failed} pedido(s) falharam`);
      }
    } catch (error) {
      console.error('Batch status error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setResult(null);
      setSelectedStatus('');
    }
  };

  // Get unique current statuses
  const currentStatuses = [...new Set(selectedOrders.map(o => o.status))];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Alterar Status em Lote
          </DialogTitle>
          <DialogDescription>
            Altere o status de todos os pedidos selecionados de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected orders summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Package className="h-4 w-4" />
              {selectedOrders.length} pedido(s) selecionado(s)
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Status atual: {currentStatuses.map(s => statusOptions.find(opt => opt.value === s)?.label).join(', ')}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedOrders.map(order => (
                <div key={order.id} className="text-xs text-muted-foreground flex justify-between">
                  <span>#{order.id.slice(0, 8)} - {order.customer_name || 'Cliente'}</span>
                  <span>R$ {Number(order.total).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status selection */}
          <div className="space-y-2">
            <Label htmlFor="status">Novo Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as OrderStatus)}
              disabled={isLoading}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Result display */}
          {result && (
            <div className={`rounded-lg p-3 flex items-center gap-2 ${
              result.failed === 0 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
            }`}>
              {result.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="text-sm">
                {result.success} atualizado(s)
                {result.failed > 0 && `, ${result.failed} falha(s)`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !selectedStatus}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Alterar {selectedOrders.length} Pedido(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
