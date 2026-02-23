import { useState, useMemo } from 'react';
import { Search, Clock, DollarSign, AlertCircle, CheckCircle, Merge, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Comanda } from '@/hooks/useComandas';
import { cn } from '@/lib/utils';

interface MergeComandasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandas: Comanda[];
  onMerge: (sourceIds: string[], targetId: string) => void;
  isLoading?: boolean;
}

const statusConfig: Record<string, { bg: string; label: string }> = {
  open: { bg: 'bg-green-500', label: 'Aberta' },
  no_activity: { bg: 'bg-yellow-500', label: 'Sem movimento' },
  requested_bill: { bg: 'bg-blue-500', label: 'Conta solicitada' },
};

export function MergeComandasModal({
  open,
  onOpenChange,
  comandas,
  onMerge,
  isLoading = false,
}: MergeComandasModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);

  const filteredComandas = useMemo(() => {
    if (!search.trim()) return comandas;

    const searchLower = search.toLowerCase();
    const searchNum = parseInt(search);

    return comandas.filter(c => {
      const matchNumber = !isNaN(searchNum) && c.command_number === searchNum;
      const matchName = c.name?.toLowerCase().includes(searchLower);
      return matchNumber || matchName;
    });
  }, [comandas, search]);

  const selectedComandas = useMemo(() => {
    return comandas.filter(c => selectedIds.includes(c.id));
  }, [comandas, selectedIds]);

  const totalValue = useMemo(() => {
    return selectedComandas.reduce((sum, c) => sum + c.total_amount, 0);
  }, [selectedComandas]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleToggleSelect = (comanda: Comanda) => {
    setSelectedIds(prev => {
      if (prev.includes(comanda.id)) {
        // Se está removendo o target, limpar target
        if (targetId === comanda.id) {
          setTargetId(null);
        }
        return prev.filter(id => id !== comanda.id);
      }
      return [...prev, comanda.id];
    });
  };

  const handleSetAsTarget = (id: string) => {
    setTargetId(id);
  };

  const handleConfirm = () => {
    if (selectedIds.length < 2 || !targetId) return;
    
    const sourceIds = selectedIds.filter(id => id !== targetId);
    onMerge(sourceIds, targetId);
  };

  const handleClose = () => {
    setSelectedIds([]);
    setTargetId(null);
    setSearch('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Juntar Comandas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instrução */}
          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              1. Selecione as comandas que deseja juntar
            </p>
            <p className="text-muted-foreground">
              2. Defina qual será a comanda destino (todas serão unificadas nela)
            </p>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de comandas */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredComandas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhuma comanda encontrada</p>
                </div>
              ) : (
                filteredComandas.map((comanda) => {
                  const status = statusConfig[comanda.status] || statusConfig.open;
                  const isSelected = selectedIds.includes(comanda.id);
                  const isTarget = targetId === comanda.id;

                  return (
                    <div
                      key={comanda.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        isSelected && !isTarget && "border-primary bg-primary/5",
                        isTarget && "border-green-500 bg-green-500/10"
                      )}
                      onClick={() => handleToggleSelect(comanda)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold">
                            #{comanda.command_number}
                          </div>
                          <Badge className={cn(status.bg, 'text-white')}>
                            {status.label}
                          </Badge>
                          {comanda.name && (
                            <Badge variant="outline">{comanda.name}</Badge>
                          )}
                          {isTarget && (
                            <Badge className="bg-green-500 text-white">
                              DESTINO
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelected && !isTarget && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetAsTarget(comanda.id);
                              }}
                            >
                              Definir como destino
                            </Button>
                          )}
                          {isSelected && (
                            <CheckCircle className={cn(
                              "h-5 w-5",
                              isTarget ? "text-green-500" : "text-primary"
                            )} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(comanda.opened_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        <div className="flex items-center gap-1 font-medium text-foreground">
                          <DollarSign className="h-4 w-4" />
                          {formatPrice(comanda.total_amount)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Preview da junção */}
          {selectedIds.length >= 2 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Resumo da junção:</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Comandas selecionadas:</span>
                  <p className="font-medium">
                    {selectedComandas.map(c => `#${c.command_number}`).join(', ')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total unificado:</span>
                  <p className="font-bold text-lg">{formatPrice(totalValue)}</p>
                </div>
              </div>
              {!targetId && (
                <p className="text-amber-600 text-sm mt-2">
                  ⚠️ Selecione uma comanda como destino
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length < 2 || !targetId || isLoading}
            className="bg-primary"
          >
            {isLoading ? 'Processando...' : `Juntar ${selectedIds.length} Comandas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
