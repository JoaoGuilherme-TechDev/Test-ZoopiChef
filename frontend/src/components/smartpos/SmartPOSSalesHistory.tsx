import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Clock, 
  DollarSign,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { cn } from '@/lib/utils';

interface SmartPOSSalesHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClosedComanda {
  id: string;
  command_number: number;
  name: string | null;
  total_amount: number;
  opened_at: string;
  closed_at: string;
  status: string;
  table_number: string | null;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  pix: <QrCode className="h-4 w-4" />,
  dinheiro: <Banknote className="h-4 w-4" />,
  cartao_credito: <CreditCard className="h-4 w-4" />,
  cartao_debito: <CreditCard className="h-4 w-4" />,
};

export function SmartPOSSalesHistory({
  open,
  onOpenChange,
}: SmartPOSSalesHistoryProps) {
  const { data: company } = useCompany();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<ClosedComanda | null>(null);

  // Fetch today's closed comandas
  const { data: closedComandas = [], isLoading } = useQuery({
    queryKey: ['closed-comandas-today', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const today = new Date();
      const { data, error } = await supabase
        .from('comandas')
        .select('id, command_number, name, total_amount, opened_at, closed_at, status, table_number')
        .eq('company_id', company.id)
        .eq('status', 'closed')
        .gte('closed_at', startOfDay(today).toISOString())
        .lte('closed_at', endOfDay(today).toISOString())
        .order('closed_at', { ascending: false });

      if (error) throw error;
      return data as ClosedComanda[];
    },
    enabled: !!company?.id && open,
  });

  // Fetch payments for selected sale
  const { data: payments = [] } = useQuery({
    queryKey: ['comanda-payments', selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale?.id) return [];
      
      const { data, error } = await supabase
        .from('comanda_payments')
        .select('*')
        .eq('comanda_id', selectedSale.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedSale?.id,
  });

  const filteredSales = closedComandas.filter((s) => {
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

  const totalSales = closedComandas.reduce((sum, s) => sum + s.total_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            {selectedSale ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => setSelectedSale(null)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                Venda #{selectedSale.command_number}
              </>
            ) : (
              'Vendas de Hoje'
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedSale ? (
          // List View
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400">Total do dia</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatPrice(totalSales)}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                  {closedComandas.length} vendas
                </Badge>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <ScrollArea className="h-[350px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className="text-center py-8 text-gray-400">
                    Carregando...
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma venda encontrada</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
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
                          <Clock className="h-3 w-3" />
                          {sale.closed_at && format(new Date(sale.closed_at), 'HH:mm', { locale: ptBR })}
                        </div>
                        {sale.name && (
                          <span>{sale.name}</span>
                        )}
                        {sale.table_number && (
                          <Badge variant="outline" className="text-xs">Mesa {sale.table_number}</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Detail View
          <div className="p-4 space-y-4">
            {/* Sale Info */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
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

            {/* Total */}
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">Valor Total</div>
              <div className="text-3xl font-bold text-green-400">
                {formatPrice(selectedSale.total_amount)}
              </div>
            </div>

            {/* Payments */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400">Pagamentos</div>
              <div className="space-y-2">
                {payments.map((payment: any) => (
                  <div 
                    key={payment.id} 
                    className="bg-gray-800 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {paymentMethodIcons[payment.payment_method] || <DollarSign className="h-4 w-4" />}
                        <span className="text-sm text-gray-300 capitalize">
                          {payment.payment_method?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-medium text-white">
                        {formatPrice(payment.amount)}
                      </span>
                    </div>
                    {payment.nsu && (
                      <div className="flex items-center justify-between text-xs border-t border-gray-700 pt-2 mt-2">
                        <span className="text-gray-500">NSU:</span>
                        <span className="text-gray-300 font-mono">{payment.nsu}</span>
                      </div>
                    )}
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Nenhum pagamento registrado
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
