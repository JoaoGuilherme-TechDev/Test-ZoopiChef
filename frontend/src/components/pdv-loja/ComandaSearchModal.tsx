import { useState, useMemo } from 'react';
import { Search, Tag, Clock, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Comanda } from '@/hooks/useComandas';
import { cn } from '@/lib/utils';

interface ComandaSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comandas: Comanda[];
  onSelect: (comanda: Comanda) => void;
  title?: string;
  allowMultiple?: boolean;
}

const statusConfig: Record<string, { bg: string; label: string }> = {
  open: { bg: 'bg-green-500', label: 'Aberta' },
  no_activity: { bg: 'bg-yellow-500', label: 'Sem movimento' },
  requested_bill: { bg: 'bg-blue-500', label: 'Conta solicitada' },
  closed: { bg: 'bg-gray-500', label: 'Fechada' },
};

export function ComandaSearchModal({
  open,
  onOpenChange,
  comandas,
  onSelect,
  title = 'Buscar Comanda',
  allowMultiple = false,
}: ComandaSearchModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleSelect = (comanda: Comanda) => {
    if (allowMultiple) {
      setSelectedIds(prev => 
        prev.includes(comanda.id)
          ? prev.filter(id => id !== comanda.id)
          : [...prev, comanda.id]
      );
    } else {
      onSelect(comanda);
      onOpenChange(false);
    }
  };

  const handleConfirmMultiple = () => {
    const selected = comandas.filter(c => selectedIds.includes(c.id));
    if (selected.length > 0) {
      onSelect(selected[0]); // First one is the target
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Lista de comandas */}
        <ScrollArea className="h-[400px]">
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
                const hasValue = comanda.total_amount > 0;

                return (
                  <div
                    key={comanda.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all hover:border-primary",
                      isSelected && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleSelect(comanda)}
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
                      </div>
                      
                      {allowMultiple && isSelected && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(comanda.opened_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 font-medium",
                        hasValue ? "text-foreground" : "text-muted-foreground"
                      )}>
                        <DollarSign className="h-4 w-4" />
                        {formatPrice(comanda.total_amount)}
                      </div>
                      {!hasValue && (
                        <Badge variant="outline" className="text-xs">
                          Sem consumo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {allowMultiple && selectedIds.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Limpar
            </Button>
            <Button onClick={handleConfirmMultiple}>
              Confirmar ({selectedIds.length} selecionadas)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
