/**
 * Smart POS Sale Reverse Component
 * Busca e estorno de vendas finalizadas
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  ChevronLeft,
  Loader2,
  Calendar,
  Clock,
  DollarSign,
  User,
  X
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

interface SmartPOSSaleReverseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SaleRecord {
  id: string;
  command_number: number;
  name: string | null;
  total_amount: number;
  opened_at: string;
  closed_at: string | null;
  status: string;
  table_number: string | null;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reverse_reason?: string | null;
}

export function SmartPOSSaleReverse({
  open,
  onOpenChange,
}: SmartPOSSaleReverseProps) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [confirmReverse, setConfirmReverse] = useState(false);

  // Fetch closed sales from last 7 days
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-for-reverse', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const weekAgo = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from('comandas')
        .select('id, command_number, name, total_amount, opened_at, closed_at, status, table_number')
        .eq('company_id', company.id)
        .eq('status', 'closed')
        .gte('closed_at', startOfDay(weekAgo).toISOString())
        .order('closed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SaleRecord[];
    },
    enabled: !!company?.id && open,
  });

  // Reverse sale mutation
  const reverseSale = useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason: string }) => {
      // Update comanda status to 'cancelled'
      const { error } = await supabase
        .from('comandas')
        .update({
          status: 'cancelled',
        })
        .eq('id', saleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Venda estornada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['sales-for-reverse'] });
      queryClient.invalidateQueries({ queryKey: ['closed-comandas-today'] });
      setSelectedSale(null);
      setReverseReason('');
      setConfirmReverse(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao estornar venda');
    },
  });

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    const searchNum = parseInt(search);
    return (
      (!isNaN(searchNum) && s.command_number === searchNum) ||
      s.name?.toLowerCase().includes(searchLower)
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleReverse = () => {
    if (!selectedSale || !reverseReason.trim()) {
      toast.error('Informe o motivo do estorno');
      return;
    }
    reverseSale.mutate({ saleId: selectedSale.id, reason: reverseReason });
  };

  const handleClose = () => {
    setSearch('');
    setSelectedSale(null);
    setReverseReason('');
    setConfirmReverse(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedSale ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => {
                    setSelectedSale(null);
                    setConfirmReverse(false);
                    setReverseReason('');
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <RotateCcw className="h-5 w-5 text-rose-500" />
                Estornar Venda #{selectedSale.command_number}
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5 text-rose-500" />
                Buscar Venda para Estorno
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedSale ? (
          // Search View
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Vendas dos últimos 7 dias</span>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
                    Carregando vendas...
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma venda encontrada</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-rose-500/50 transition-colors"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="text-lg font-bold text-white">
                            #{sale.command_number}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-green-400">
                          {formatPrice(sale.total_amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {sale.closed_at && format(new Date(sale.closed_at), 'dd/MM', { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {sale.closed_at && format(new Date(sale.closed_at), 'HH:mm', { locale: ptBR })}
                        </div>
                        {sale.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {sale.name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : !confirmReverse ? (
          // Sale Details View
          <div className="p-4 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Número</span>
                <span className="text-white font-bold">#{selectedSale.command_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Data/Hora</span>
                <span className="text-white">
                  {selectedSale.closed_at && format(new Date(selectedSale.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {selectedSale.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cliente</span>
                  <span className="text-white">{selectedSale.name}</span>
                </div>
              )}
              {selectedSale.table_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Mesa</span>
                  <span className="text-white">Mesa {selectedSale.table_number}</span>
                </div>
              )}
            </div>

            <div className="bg-rose-900/20 border border-rose-700/30 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">Valor a Estornar</div>
              <div className="text-3xl font-bold text-rose-400">
                {formatPrice(selectedSale.total_amount)}
              </div>
            </div>

            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-300">
                  <strong>Atenção:</strong> O estorno cancela a venda e remove os valores do faturamento.
                  Esta ação não pode ser desfeita.
                </div>
              </div>
            </div>

            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => setConfirmReverse(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Estornar Esta Venda
            </Button>
          </div>
        ) : (
          // Confirm Reverse View
          <div className="p-4 space-y-4">
            <div className="bg-rose-900/20 border border-rose-700 rounded-lg p-4 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-rose-500 mb-2" />
              <div className="text-lg font-bold text-white">
                Confirmar Estorno
              </div>
              <div className="text-sm text-gray-400">
                Venda #{selectedSale.command_number}
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {formatPrice(selectedSale.total_amount)}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Motivo do Estorno *</Label>
              <Textarea
                placeholder="Digite o motivo do estorno..."
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setConfirmReverse(false)}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                className="flex-1"
                onClick={handleReverse}
                disabled={!reverseReason.trim() || reverseSale.isPending}
              >
                {reverseSale.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Confirmar Estorno
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
