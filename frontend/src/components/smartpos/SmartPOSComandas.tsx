import { useState } from 'react';
import { 
  Search, 
  Clock, 
  DollarSign, 
  RotateCcw, 
  Receipt, 
  X as CloseIcon,
  ChevronLeft,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Comanda, useComandaMutations } from '@/hooks/useComandas';
import { useComandaItems } from '@/hooks/useComandaItems';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SmartPOSComandasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandas: Comanda[];
  onSelectForPayment?: (comanda: Comanda) => void;
}

const statusConfig: Record<string, { bg: string; label: string }> = {
  open: { bg: 'bg-green-500', label: 'Aberta' },
  no_activity: { bg: 'bg-yellow-500', label: 'Sem movimento' },
  requested_bill: { bg: 'bg-blue-500', label: 'Conta pedida' },
  closed: { bg: 'bg-gray-500', label: 'Fechada' },
};

export function SmartPOSComandas({
  open,
  onOpenChange,
  comandas,
  onSelectForPayment,
}: SmartPOSComandasProps) {
  const [search, setSearch] = useState('');
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [confirmAction, setConfirmAction] = useState<'close' | 'reopen' | null>(null);
  
  const { closeComanda, reopenComanda } = useComandaMutations();
  const { activeItems } = useComandaItems(selectedComanda?.id || null);

  const filteredComandas = comandas.filter((c) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    const searchNum = parseInt(search);
    return (
      (!isNaN(searchNum) && c.command_number === searchNum) ||
      c.name?.toLowerCase().includes(searchLower)
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleClose = () => {
    if (!selectedComanda) return;
    closeComanda.mutate(
      { comandaId: selectedComanda.id },
      {
        onSuccess: () => {
          toast.success('Comanda fechada!');
          setConfirmAction(null);
          setSelectedComanda(null);
        },
      }
    );
  };

  const handleReopen = () => {
    if (!selectedComanda) return;
    reopenComanda.mutate(selectedComanda.id, {
      onSuccess: () => {
        toast.success('Comanda reaberta!');
        setConfirmAction(null);
      },
    });
  };

  const handleReceive = () => {
    if (!selectedComanda || !onSelectForPayment) return;
    onSelectForPayment(selectedComanda);
    setSelectedComanda(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedComanda ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => setSelectedComanda(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                Comanda #{selectedComanda.command_number}
              </>
            ) : (
              'Comandas Abertas'
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedComanda ? (
          // List View
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número ou nome... (ESC para limpar)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    if (search) {
                      setSearch('');
                    } else {
                      onOpenChange(false);
                    }
                    e.preventDefault();
                  }
                }}
                className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white"
                autoFocus
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-white"
                  onClick={() => setSearch('')}
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {filteredComandas.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma comanda encontrada</p>
                  </div>
                ) : (
                  filteredComandas.map((comanda) => {
                    const status = statusConfig[comanda.status] || statusConfig.open;
                    return (
                      <div
                        key={comanda.id}
                        className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                        onClick={() => setSelectedComanda(comanda)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-white">
                              #{comanda.command_number}
                            </div>
                            <Badge className={cn(status.bg, 'text-white text-xs')}>
                              {status.label}
                            </Badge>
                          </div>
                          {comanda.name && (
                            <Badge variant="outline" className="text-gray-300 border-gray-600">
                              {comanda.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(comanda.opened_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                          <div className="flex items-center gap-1 text-green-400 font-medium">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(comanda.total_amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Detail View
          <div className="p-4 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge className={cn(statusConfig[selectedComanda.status]?.bg, 'text-white')}>
                {statusConfig[selectedComanda.status]?.label}
              </Badge>
              {selectedComanda.name && (
                <span className="text-gray-400">{selectedComanda.name}</span>
              )}
            </div>

            {/* Total */}
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">Total</div>
              <div className="text-3xl font-bold text-green-400">
                {formatPrice(selectedComanda.total_amount)}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400">Itens</div>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {activeItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-300">
                        {item.qty}x {item.product_name_snapshot}
                      </span>
                      <span className="text-gray-400">
                        {formatPrice(item.qty * item.unit_price_snapshot)}
                      </span>
                    </div>
                  ))}
                  {activeItems.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Nenhum item na comanda
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <Separator className="bg-gray-700" />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="flex flex-col h-auto py-3 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                onClick={handleReceive}
                disabled={!onSelectForPayment}
              >
                <Receipt className="h-5 w-5 text-green-500" />
                <span className="text-xs mt-1 text-green-500">Receber</span>
              </Button>

              {selectedComanda.status !== 'closed' ? (
                <Button
                  variant="outline"
                  className="flex flex-col h-auto py-3 bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                  onClick={() => setConfirmAction('close')}
                >
                  <CloseIcon className="h-5 w-5 text-red-500" />
                  <span className="text-xs mt-1 text-red-500">Fechar</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex flex-col h-auto py-3 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                  onClick={() => setConfirmAction('reopen')}
                >
                  <RotateCcw className="h-5 w-5 text-blue-500" />
                  <span className="text-xs mt-1 text-blue-500">Reabrir</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {confirmAction === 'close' ? 'Fechar Comanda' : 'Reabrir Comanda'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {confirmAction === 'close' 
                  ? 'Tem certeza que deseja fechar esta comanda?'
                  : 'Tem certeza que deseja reabrir esta comanda?'
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmAction === 'close' ? handleClose : handleReopen}
                disabled={closeComanda.isPending || reopenComanda.isPending}
                className={confirmAction === 'close' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {confirmAction === 'close' ? 'Fechar' : 'Reabrir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
