/**
 * PDV Loja - Sale Search Component
 * Busca de vendas realizadas
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  DollarSign,
  X,
  Eye,
  Table,
  CreditCard
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

interface PDVSaleSearchProps {
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
  payment_method: string | null;
}

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

export function PDVSaleSearch({
  open,
  onOpenChange,
}: PDVSaleSearchProps) {
  const { data: company } = useCompany();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  // Fetch closed sales from last 30 days
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['pdv-sales-search', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const monthAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from('comandas')
        .select('id, command_number, name, total_amount, opened_at, closed_at, status, table_number')
        .eq('company_id', company.id)
        .in('status', ['closed', 'cancelled'])
        .gte('closed_at', startOfDay(monthAgo).toISOString())
        .order('closed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as SaleRecord[];
    },
    enabled: !!company?.id && open,
  });

  // Fetch sale items when a sale is selected
  const { data: saleItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['pdv-sale-items', selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale?.id) return [];
      
      const { data, error } = await supabase
        .from('comanda_items')
        .select(`
          id,
          quantity,
          unit_price,
          total_price,
          notes,
          products:product_id (name)
        `)
        .eq('comanda_id', selectedSale.id);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        product_name: item.products?.name || 'Produto',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
      })) as SaleItem[];
    },
    enabled: !!selectedSale?.id,
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

  const handleClose = () => {
    setSearch('');
    setSelectedSale(null);
    onOpenChange(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
        return <Badge className="bg-green-500 text-white">Finalizada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            {selectedSale ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 mr-2"
                  onClick={() => setSelectedSale(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <DollarSign className="h-5 w-5 text-primary" />
                Venda #{selectedSale.command_number}
              </>
            ) : (
              <>
                <Search className="h-5 w-5 text-primary" />
                Buscar Vendas
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedSale ? (
          <div className="p-4 space-y-4">
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

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Vendas dos últimos 30 dias</span>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
                    Carregando vendas...
                  </div>
                ) : filteredSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma venda encontrada</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 rounded-lg bg-muted/50 border cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {sale.status === 'closed' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 text-destructive" />
                          )}
                          <div className="text-lg font-bold">
                            #{sale.command_number}
                          </div>
                        </div>
                        <span className={`text-lg font-bold ${sale.status === 'cancelled' ? 'text-muted-foreground line-through' : 'text-green-600'}`}>
                          {formatPrice(sale.total_amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                        {getStatusBadge(sale.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Sale Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {getStatusBadge(selectedSale.status)}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data/Hora</span>
                <span>
                  {selectedSale.closed_at && format(new Date(selectedSale.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {selectedSale.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span>{selectedSale.name}</span>
                </div>
              )}
              {selectedSale.table_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mesa</span>
                  <span className="flex items-center gap-1">
                    <Table className="h-3 w-3" />
                    Mesa {selectedSale.table_number}
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className={`p-4 rounded-lg text-center ${selectedSale.status === 'cancelled' ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
              <div className="text-sm text-muted-foreground mb-1">Total da Venda</div>
              <div className={`text-3xl font-bold ${selectedSale.status === 'cancelled' ? 'text-destructive line-through' : 'text-green-600'}`}>
                {formatPrice(selectedSale.total_amount)}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Itens da Venda
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {loadingItems ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Loader2 className="h-5 w-5 mx-auto animate-spin" />
                    </div>
                  ) : saleItems.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nenhum item encontrado
                    </div>
                  ) : (
                    saleItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-background rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-muted-foreground text-xs">
                            {item.quantity}x {formatPrice(item.unit_price)}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground italic mt-1">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <div className="font-medium">
                          {formatPrice(item.total_price)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
