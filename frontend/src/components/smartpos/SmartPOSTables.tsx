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
  Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TableSession, useTableSessions } from '@/hooks/useTableSessions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SmartPOSTablesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectForPayment?: (session: TableSession) => void;
}

const statusConfig: Record<string, { bg: string; label: string }> = {
  open: { bg: 'bg-green-500', label: 'Aberta' },
  idle_warning: { bg: 'bg-yellow-500', label: 'Sem movimento' },
  bill_requested: { bg: 'bg-blue-500', label: 'Conta pedida' },
  closed: { bg: 'bg-gray-500', label: 'Fechada' },
};

export function SmartPOSTables({
  open,
  onOpenChange,
  onSelectForPayment,
}: SmartPOSTablesProps) {
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<TableSession | null>(null);
  const [confirmAction, setConfirmAction] = useState<'close' | 'reopen' | null>(null);
  
  const { activeSessions, updateSessionStatus, reopenTable } = useTableSessions();

  const filteredSessions = activeSessions.filter((s) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    const searchNum = parseInt(search);
    return (
      (!isNaN(searchNum) && s.table?.number === searchNum) ||
      s.table?.name?.toLowerCase().includes(searchLower) ||
      s.customer_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const handleClose = () => {
    if (!selectedSession) return;
    updateSessionStatus.mutate(
      { sessionId: selectedSession.id, status: 'closed' },
      {
        onSuccess: () => {
          toast.success('Mesa fechada!');
          setConfirmAction(null);
          setSelectedSession(null);
        },
      }
    );
  };

  const handleReopen = () => {
    if (!selectedSession) return;
    reopenTable.mutate(selectedSession.id, {
      onSuccess: () => {
        toast.success('Mesa reaberta!');
        setConfirmAction(null);
      },
    });
  };

  const handleReceive = () => {
    if (!selectedSession || !onSelectForPayment) return;
    onSelectForPayment(selectedSession);
    setSelectedSession(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedSession ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => setSelectedSession(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                Mesa {selectedSession.table?.number}
              </>
            ) : (
              'Mesas Abertas'
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedSession ? (
          // List View
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma mesa aberta</p>
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const status = statusConfig[session.status] || statusConfig.open;
                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-white">
                              Mesa {session.table?.number}
                            </div>
                            <Badge className={cn(status.bg, 'text-white text-xs')}>
                              {status.label}
                            </Badge>
                          </div>
                          {session.people_count && (
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Users className="h-3 w-3" />
                              {session.people_count}
                            </div>
                          )}
                        </div>
                        {session.customer_name && (
                          <div className="mt-1 text-sm text-gray-400">
                            {session.customer_name}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(session.opened_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                          <div className="flex items-center gap-1 text-green-400 font-medium">
                            <DollarSign className="h-3 w-3" />
                            {formatPrice(session.total_amount_cents)}
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
              <Badge className={cn(statusConfig[selectedSession.status]?.bg, 'text-white')}>
                {statusConfig[selectedSession.status]?.label}
              </Badge>
              {selectedSession.customer_name && (
                <span className="text-gray-400">{selectedSession.customer_name}</span>
              )}
            </div>

            {/* Info */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              {selectedSession.table?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Nome</span>
                  <span className="text-white">{selectedSession.table.name}</span>
                </div>
              )}
              {selectedSession.people_count && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Pessoas</span>
                  <span className="text-white">{selectedSession.people_count}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Aberta há</span>
                <span className="text-white">
                  {formatDistanceToNow(new Date(selectedSession.opened_at), {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">Total</div>
              <div className="text-3xl font-bold text-green-400">
                {formatPrice(selectedSession.total_amount_cents)}
              </div>
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

              {selectedSession.status !== 'closed' ? (
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
                {confirmAction === 'close' ? 'Fechar Mesa' : 'Reabrir Mesa'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {confirmAction === 'close' 
                  ? 'Tem certeza que deseja fechar esta mesa?'
                  : 'Tem certeza que deseja reabrir esta mesa?'
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmAction === 'close' ? handleClose : handleReopen}
                disabled={updateSessionStatus.isPending || reopenTable.isPending}
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
