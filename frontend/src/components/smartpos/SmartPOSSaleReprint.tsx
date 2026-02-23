/**
 * Smart POS Sale Reprint Component
 * Reimpressão de vendas finalizadas e cupons fiscais
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Printer, 
  AlertTriangle, 
  CheckCircle,
  ChevronLeft,
  Loader2,
  Calendar,
  Clock,
  User,
  Receipt,
  FileText
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { getPrintService } from '@/lib/print';
import { Order } from '@/hooks/useOrders';

interface SmartPOSSaleReprintProps {
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
}

interface FiscalDocument {
  id: string;
  document_type: string;
  number: number | null;
  status: string;
  total_cents: number;
  created_at: string;
  recipient_name: string | null;
  access_key: string | null;
  pdf_url: string | null;
}

export function SmartPOSSaleReprint({
  open,
  onOpenChange,
}: SmartPOSSaleReprintProps) {
  const { data: company } = useCompany();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'fiscal'>('sales');

  // Fetch closed sales from last 30 days
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ['sales-for-reprint', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const monthAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from('comandas')
        .select('id, command_number, name, total_amount, opened_at, closed_at, status, table_number')
        .eq('company_id', company.id)
        .eq('status', 'closed')
        .gte('closed_at', startOfDay(monthAgo).toISOString())
        .order('closed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as SaleRecord[];
    },
    enabled: !!company?.id && open && activeTab === 'sales',
  });

  // Fetch fiscal documents
  const { data: fiscalDocs = [], isLoading: loadingFiscal } = useQuery({
    queryKey: ['fiscal-docs-for-reprint', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const monthAgo = subDays(new Date(), 30);
      const { data, error } = await supabase
        .from('fiscal_documents')
        .select('id, document_type, number, status, total_cents, created_at, recipient_name, access_key, pdf_url')
        .eq('company_id', company.id)
        .eq('status', 'authorized')
        .gte('created_at', startOfDay(monthAgo).toISOString())
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as FiscalDocument[];
    },
    enabled: !!company?.id && open && activeTab === 'fiscal',
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

  const filteredFiscal = fiscalDocs.filter((doc) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      doc.number?.toString().includes(search) ||
      doc.recipient_name?.toLowerCase().includes(searchLower) ||
      doc.access_key?.includes(search)
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleReprintSale = async (sale: SaleRecord) => {
    if (!company) return;
    
    setIsPrinting(true);
    try {
      // Fetch full order details including items
      const { data: comandaItems, error: itemsError } = await supabase
        .from('comanda_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          notes,
          status,
          products:product_id (
            name,
            internal_code
          )
        `)
        .eq('comanda_id', sale.id);

      if (itemsError) throw itemsError;

      // Build order object for printing (partial type for print service)
      const order = {
        id: sale.id,
        command_number: sale.command_number,
        table_number: sale.table_number || undefined,
        customer_name: sale.name || undefined,
        status: 'closed' as const,
        created_at: sale.opened_at,
        closed_at: sale.closed_at || undefined,
        total_amount: sale.total_amount,
        items: (comandaItems || []).map((item: any) => ({
          id: item.id,
          order_id: sale.id,
          product_id: item.product_id,
          product_name: item.products?.name || 'Produto',
          product_code: item.products?.internal_code,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes,
          status: item.status,
        })),
      };

      const printService = getPrintService();
      await printService.printOrder(order as any, company.name || 'Estabelecimento');
      
      toast.success(`Reimpressão da venda #${sale.command_number} enviada!`);
    } catch (error: any) {
      console.error('Reprint error:', error);
      toast.error(error.message || 'Erro ao reimprimir venda');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReprintFiscal = async (doc: FiscalDocument) => {
    setIsPrinting(true);
    try {
      if (doc.pdf_url) {
        // Open PDF in new tab
        window.open(doc.pdf_url, '_blank');
        toast.success('PDF do cupom fiscal aberto!');
      } else {
        // Generate a simple fiscal receipt for printing
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
          const docTypeLabel = doc.document_type === 'nfce' ? 'NFC-e' : 
                               doc.document_type === 'nfe' ? 'NF-e' : 
                               doc.document_type === 'nfse' ? 'NFS-e' : 'Documento Fiscal';
          
          printWindow.document.write(`
            <html>
            <head>
              <title>Reimpressão - ${docTypeLabel}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  font-size: 12px;
                  width: 280px;
                  margin: 0 auto;
                  padding: 10px;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .row { display: flex; justify-content: space-between; margin: 4px 0; }
                h2 { margin: 5px 0; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="center">
                <h2>${docTypeLabel}</h2>
                <p class="bold">REIMPRESSÃO</p>
              </div>
              <div class="divider"></div>
              <div class="row">
                <span>Número:</span>
                <span class="bold">${doc.number || 'N/A'}</span>
              </div>
              <div class="row">
                <span>Data:</span>
                <span>${format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              ${doc.recipient_name ? `
              <div class="row">
                <span>Cliente:</span>
                <span>${doc.recipient_name}</span>
              </div>
              ` : ''}
              <div class="divider"></div>
              <div class="center bold" style="font-size: 16px;">
                ${formatPrice(doc.total_cents / 100)}
              </div>
              <div class="divider"></div>
              ${doc.access_key ? `
              <div class="center" style="font-size: 10px; word-break: break-all;">
                <p>Chave de Acesso:</p>
                <p>${doc.access_key}</p>
              </div>
              ` : ''}
              <div class="divider"></div>
              <div class="center" style="margin-top: 20px;">
                <p style="font-size: 10px;">Reimpressão gerada em</p>
                <p style="font-size: 10px;">${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
        toast.success('Cupom fiscal enviado para impressão!');
      }
    } catch (error: any) {
      console.error('Fiscal reprint error:', error);
      toast.error(error.message || 'Erro ao reimprimir cupom fiscal');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleClose = () => {
    setSearch('');
    setSelectedSale(null);
    onOpenChange(false);
  };

  const isLoading = activeTab === 'sales' ? loadingSales : loadingFiscal;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 bg-gray-900 border-gray-700">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-500" />
            Reimpressão
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'sales' ? 'default' : 'outline'}
              size="sm"
              className={activeTab === 'sales' ? 'bg-blue-600' : 'bg-gray-800 border-gray-700'}
              onClick={() => setActiveTab('sales')}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Vendas
            </Button>
            <Button
              variant={activeTab === 'fiscal' ? 'default' : 'outline'}
              size="sm"
              className={activeTab === 'fiscal' ? 'bg-green-600' : 'bg-gray-800 border-gray-700'}
              onClick={() => setActiveTab('fiscal')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Cupons Fiscais
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={activeTab === 'sales' ? "Buscar por número ou nome..." : "Buscar por número ou chave..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>Últimos 30 dias</span>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-2">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin mb-2" />
                  Carregando...
                </div>
              ) : activeTab === 'sales' ? (
                filteredSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhuma venda encontrada</p>
                  </div>
                ) : (
                  filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500/50 transition-colors"
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
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleReprintSale(sale)}
                        disabled={isPrinting}
                      >
                        {isPrinting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        Reimprimir
                      </Button>
                    </div>
                  ))
                )
              ) : (
                filteredFiscal.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>Nenhum cupom fiscal encontrado</p>
                  </div>
                ) : (
                  filteredFiscal.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-green-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-400">
                              {doc.document_type.toUpperCase()}
                            </div>
                            <div className="text-lg font-bold text-white">
                              {doc.number || 'Pendente'}
                            </div>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-green-400">
                          {formatPrice(doc.total_cents / 100)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.created_at), 'dd/MM', { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(doc.created_at), 'HH:mm', { locale: ptBR })}
                        </div>
                        {doc.recipient_name && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <User className="h-3 w-3" />
                            {doc.recipient_name}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 bg-green-600 hover:bg-green-700"
                        onClick={() => handleReprintFiscal(doc)}
                        disabled={isPrinting}
                      >
                        {isPrinting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        {doc.pdf_url ? 'Abrir PDF' : 'Reimprimir'}
                      </Button>
                    </div>
                  ))
                )
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
