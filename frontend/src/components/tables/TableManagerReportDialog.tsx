import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useTableSessions, TableSession } from '@/hooks/useTableSessions';
import { useTables } from '@/hooks/useTables';
import { useAllSessionItems } from '@/hooks/useTableCommands';
import { useCompany } from '@/hooks/useCompany';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Printer, 
  Clock, 
  DollarSign,
  Users,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface TableManagerReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SessionWithDetails extends TableSession {
  tableNumber: number;
  tableName?: string | null;
  duration: string;
}

export function TableManagerReportDialog({ 
  open, 
  onOpenChange 
}: TableManagerReportDialogProps) {
  const { sessions } = useTableSessions();
  const { tables } = useTables();
  const { data: company } = useCompany();
  const [isPrinting, setIsPrinting] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const calculateDuration = (openedAt: string) => {
    const opened = new Date(openedAt);
    const now = new Date();
    const diffMs = now.getTime() - opened.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Get open sessions with table info
  const openSessions: SessionWithDetails[] = sessions
    .filter(s => s.status !== 'closed')
    .map(session => {
      const table = tables.find(t => t.id === session.table_id);
      return {
        ...session,
        tableNumber: table?.number || 0,
        tableName: table?.name,
        duration: calculateDuration(session.opened_at),
      };
    })
    .sort((a, b) => a.tableNumber - b.tableNumber);

  const totalOpenAmount = openSessions.reduce((sum, s) => sum + s.total_amount_cents, 0);
  const totalSessions = openSessions.length;

  const handlePrint = () => {
    setIsPrinting(true);
    
    const now = new Date();
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Gerencial - Mesas Abertas</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            width: 280px; 
            margin: 0 auto;
            padding: 10px;
            font-size: 11px;
          }
          .header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
          .subheader { text-align: center; font-size: 10px; margin-bottom: 15px; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .bold { font-weight: bold; }
          .center { text-align: center; }
          .total-box { 
            border: 2px solid #000; 
            padding: 8px; 
            margin: 10px 0;
            text-align: center;
          }
          .warning { background: #ffe0e0; padding: 5px; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { text-align: left; padding: 3px 2px; font-size: 10px; }
          th { border-bottom: 1px solid #000; }
          .amount { text-align: right; }
          @media print {
            body { margin: 0; padding: 5px; }
          }
        </style>
      </head>
      <body>
        <div class="header">RELATÓRIO GERENCIAL</div>
        <div class="subheader">
          ${company?.name || 'Empresa'}<br>
          ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
        
        <div class="line"></div>
        
        <div class="total-box">
          <div class="bold">MESAS/COMANDAS ABERTAS: ${totalSessions}</div>
          <div class="bold" style="font-size: 16px; margin-top: 5px;">
            TOTAL: ${formatCurrency(totalOpenAmount)}
          </div>
        </div>
        
        <div class="line"></div>
        
        <table>
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Tempo</th>
              <th class="amount">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${openSessions.map(s => `
              <tr>
                <td>${s.tableNumber}${s.tableName ? ` (${s.tableName})` : ''}</td>
                <td>${s.duration}</td>
                <td class="amount">${formatCurrency(s.total_amount_cents)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="line"></div>
        
        <div class="center" style="margin-top: 15px;">
          <small>
            ⚠️ Use este relatório para:<br>
            • Backup em caso de queda de energia<br>
            • Conferência de mesas com clientes
          </small>
        </div>
        
        <div class="line"></div>
        <div class="center" style="font-size: 9px; margin-top: 10px;">
          Impresso em ${format(now, "dd/MM/yyyy HH:mm:ss")}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 250);
    } else {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório Gerencial - Mesas Abertas
          </DialogTitle>
          <DialogDescription>
            Visão geral de todas as mesas/comandas em aberto para conferência e backup
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSessions}</p>
                <p className="text-xs text-muted-foreground">Mesas Abertas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalOpenAmount)}</p>
                <p className="text-xs text-muted-foreground">Valor Total</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {format(new Date(), 'HH:mm', { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">Hora Atual</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Uso do Relatório:</p>
            <ul className="text-amber-700 dark:text-amber-300 mt-1 space-y-1">
              <li>• <strong>Backup de emergência:</strong> Em caso de queda de energia, este relatório garante que você saiba o valor de cada mesa.</li>
              <li>• <strong>Conferência:</strong> Verifique se as mesas abertas no sistema realmente têm clientes, evitando golpes.</li>
            </ul>
          </div>
        </div>

        {/* Table List */}
        <ScrollArea className="h-[300px] border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Mesa</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="w-24">Tempo</TableHead>
                <TableHead className="text-right w-28">Valor</TableHead>
                <TableHead className="w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma mesa aberta no momento
                  </TableCell>
                </TableRow>
              ) : (
                openSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-bold text-lg">
                      {session.tableNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.tableName || '-'}
                    </TableCell>
                    <TableCell>
                      {session.customer_name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {session.duration}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(session.total_amount_cents)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          session.status === 'bill_requested' ? 'destructive' :
                          session.status === 'idle_warning' ? 'secondary' :
                          'default'
                        }
                        className="text-xs"
                      >
                        {session.status === 'bill_requested' ? 'Conta' :
                         session.status === 'idle_warning' ? 'Ociosa' :
                         'Aberta'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting} className="gap-2">
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Imprimindo...' : 'Imprimir Relatório'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
