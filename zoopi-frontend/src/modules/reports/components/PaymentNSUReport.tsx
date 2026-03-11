/**
 * Payment NSU Report Component
 * 
 * Displays a report of all payments with their NSU for filtering and lookup.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, Receipt, CreditCard, Banknote, QrCode, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { usePaymentReports, PaymentReportItem } from '@/hooks/usePaymentReports';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const paymentMethodIcons: Record<string, React.ReactNode> = {
  pix: <QrCode className="h-4 w-4" />,
  dinheiro: <Banknote className="h-4 w-4" />,
  cartao_credito: <CreditCard className="h-4 w-4" />,
  cartao_debito: <CreditCard className="h-4 w-4" />,
  credito: <CreditCard className="h-4 w-4" />,
  debito: <CreditCard className="h-4 w-4" />,
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  credito: 'Crédito',
  debito: 'Débito',
};

interface PaymentNSUReportProps {
  startDate: string;
  endDate: string;
}

export function PaymentNSUReport({ startDate, endDate }: PaymentNSUReportProps) {
  const [nsuSearch, setNsuSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  
  const { data: payments = [], isLoading } = usePaymentReports({
    startDate,
    endDate,
  });

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // NSU search filter
      if (nsuSearch && payment.nsu && !payment.nsu.toLowerCase().includes(nsuSearch.toLowerCase())) {
        return false;
      }
      // Payment method filter
      if (methodFilter && methodFilter !== 'all' && payment.payment_method !== methodFilter) {
        return false;
      }
      return true;
    });
  }, [payments, nsuSearch, methodFilter]);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const uniqueMethods = [...new Set(payments.map(p => p.payment_method))];

  const handleExportCSV = () => {
    const headers = ['NSU', 'Data/Hora', 'Valor', 'Forma de Pagamento', 'Origem', 'Referência'];
    const rows = filteredPayments.map(p => [
      p.nsu || '',
      format(new Date(p.created_at), 'dd/MM/yyyy HH:mm'),
      p.amount.toFixed(2),
      p.payment_method,
      p.source === 'comanda' ? 'Comanda' : 'Mesa',
      p.source === 'comanda' ? `#${p.comanda_number}` : `Mesa ${p.table_number}`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos-nsu-${startDate}-${endDate}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Relatório de Pagamentos (NSU)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="nsu-search">Buscar por NSU</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="nsu-search"
                placeholder="Digite o NSU..."
                value={nsuSearch}
                onChange={(e) => setNsuSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Label>Forma de Pagamento</Label>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {uniqueMethods.map(method => (
                  <SelectItem key={method} value={method}>
                    {paymentMethodLabels[method] || method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
            <p className="text-2xl font-bold">{filteredPayments.length}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold">
              {filteredPayments.length > 0 ? formatCurrency(totalAmount / filteredPayments.length) : formatCurrency(0)}
            </p>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="h-[400px] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NSU</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono font-medium">
                      {payment.nsu || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {paymentMethodIcons[payment.payment_method] || <DollarSign className="h-4 w-4" />}
                        <span className="capitalize">
                          {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.source === 'comanda' ? 'default' : 'secondary'}>
                        {payment.source === 'comanda' ? 'Comanda' : 'Mesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.source === 'comanda' 
                        ? `#${payment.comanda_number || payment.comanda_id?.slice(0, 6)}` 
                        : `Mesa ${payment.table_number || '-'}`
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
