import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Truck, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { Deliverer } from '@/hooks/useDeliverers';
import { Order } from '@/hooks/useOrders';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface BatchDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Order[];
  deliverers: Deliverer[];
  onSuccess: () => void;
}

export function BatchDispatchDialog({
  open,
  onOpenChange,
  selectedOrders,
  deliverers,
  onSuccess
}: BatchDispatchDialogProps) {
  const [selectedDelivererId, setSelectedDelivererId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const queryClient = useQueryClient();

  const activeDeliverers = deliverers.filter(d => d.active);

  const handleDispatch = async () => {
    if (!selectedDelivererId) {
      toast.error('Selecione um entregador');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const response = await supabase.functions.invoke('batch-dispatch', {
        body: {
          order_ids: selectedOrders.map(o => o.id),
          deliverer_id: selectedDelivererId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.success) {
        setResult({
          success: data.dispatched,
          failed: data.failed
        });

        if (data.dispatched > 0) {
          toast.success(`${data.dispatched} pedido(s) despachado(s) com sucesso!`);
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          
          // Close dialog after short delay to show result
          setTimeout(() => {
            onSuccess();
            onOpenChange(false);
            setResult(null);
            setSelectedDelivererId('');
          }, 1500);
        }

        if (data.failed > 0) {
          toast.warning(`${data.failed} pedido(s) falharam no despacho`);
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Batch dispatch error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao despachar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setResult(null);
      setSelectedDelivererId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Despachar Pedidos em Lote
          </DialogTitle>
          <DialogDescription>
            Selecione o entregador para despachar os pedidos selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected orders summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Package className="h-4 w-4" />
              {selectedOrders.length} pedido(s) selecionado(s)
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

          {/* Deliverer selection */}
          <div className="space-y-2">
            <Label htmlFor="deliverer">Entregador</Label>
            <Select
              value={selectedDelivererId}
              onValueChange={setSelectedDelivererId}
              disabled={isLoading}
            >
              <SelectTrigger id="deliverer">
                <SelectValue placeholder="Selecione o entregador" />
              </SelectTrigger>
              <SelectContent>
                {activeDeliverers.map(deliverer => (
                  <SelectItem key={deliverer.id} value={deliverer.id}>
                    {deliverer.name}
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
                {result.success} despachado(s)
                {result.failed > 0 && `, ${result.failed} falha(s)`}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleDispatch} disabled={isLoading || !selectedDelivererId}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Despachando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Despachar {selectedOrders.length} Pedido(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
