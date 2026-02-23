import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCashSession } from '@/hooks/useCashSession';
import { useCashMovements } from '@/hooks/useCashMovements';
import { useProfile } from '@/hooks/useProfile';
import { useCompany } from '@/hooks/useCompany';
import { FileText, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPrintFooterFromCompany } from '@/lib/print/printFooter';

interface XReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function XReportDialog({ open, onOpenChange }: XReportDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { openSession, cashSummary: summary, isLoading } = useCashSession();
  const { movements, totals } = useCashMovements();
  const { data: profile } = useProfile();
  const { data: company } = useCompany();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePrint = () => {
    if (!openSession || !summary) return;

    setIsPrinting(true);
    
    const now = new Date();
    const sessionStart = new Date(openSession.opened_at);
    const footer = getPrintFooterFromCompany(company);

    const reportContent = `
      <html>
      <head>
        <title>Relatório X</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            width: 280px; 
            padding: 10px; 
            font-size: 11px; 
            margin: 0;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .double-line { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .section { margin: 8px 0; }
          .section-title { font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; }
          .big { font-size: 14px; font-weight: bold; }
          .small { font-size: 9px; color: #666; }
          h1 { font-size: 14px; margin: 0; }
          h2 { font-size: 12px; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="center">
          <h1>${company?.name || 'Empresa'}</h1>
        </div>

        <div class="double-line"></div>
        
        <div class="center">
          <h2 class="bold">RELATÓRIO X</h2>
          <p class="small">Leitura Parcial - NÃO FISCAL</p>
        </div>

        <div class="line"></div>

        <div class="section">
          <div class="row"><span>Data/Hora:</span><span>${format(now, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span></div>
          <div class="row"><span>Operador:</span><span>${profile?.full_name || 'Não identificado'}</span></div>
          <div class="row"><span>Sessão:</span><span>${openSession.id.slice(0, 8).toUpperCase()}</span></div>
          <div class="row"><span>Abertura:</span><span>${format(sessionStart, 'dd/MM HH:mm', { locale: ptBR })}</span></div>
        </div>

        <div class="double-line"></div>

        <div class="section">
          <div class="section-title">Resumo de Vendas</div>
          <div class="row"><span>Total de Vendas:</span><span class="bold">${summary.totalOrders}</span></div>
          <div class="row"><span>Valor Total:</span><span class="bold">${formatCurrency(summary.totalRevenue)}</span></div>
        </div>

        <div class="line"></div>

        <div class="section">
          <div class="section-title">Por Forma de Pagamento</div>
          <div class="row"><span>Dinheiro:</span><span>${formatCurrency(summary.payments.dinheiro.total)}</span></div>
          <div class="row"><span>Débito:</span><span>${formatCurrency(summary.payments.cartao_debito.total)}</span></div>
          <div class="row"><span>Crédito:</span><span>${formatCurrency(summary.payments.cartao_credito.total)}</span></div>
          <div class="row"><span>PIX:</span><span>${formatCurrency(summary.payments.pix.total)}</span></div>
          <div class="row"><span>Fiado:</span><span>${formatCurrency(summary.payments.fiado.total)}</span></div>
          <div class="row"><span>Outros:</span><span>${formatCurrency(summary.payments.outros.total)}</span></div>
        </div>

        <div class="line"></div>

        <div class="section">
          <div class="section-title">Movimentações de Caixa</div>
          <div class="row"><span>Fundo Inicial:</span><span>${formatCurrency(openSession.opening_balance / 100)}</span></div>
          <div class="row"><span>Suprimentos:</span><span>+ ${formatCurrency(totals.supplies / 100)}</span></div>
          <div class="row"><span>Sangrias:</span><span>- ${formatCurrency(totals.withdrawals / 100)}</span></div>
          <div class="row"><span>Vendas em Dinheiro:</span><span>+ ${formatCurrency(summary.payments.dinheiro.total)}</span></div>
        </div>

        <div class="double-line"></div>

        <div class="section">
          <div class="row">
            <span class="bold">SALDO ESPERADO:</span>
            <span class="big">${formatCurrency(summary.expectedCash)}</span>
          </div>
        </div>

        ${movements.length > 0 ? `
          <div class="line"></div>
          <div class="section">
            <div class="section-title">Últimas Movimentações</div>
            ${movements.slice(0, 5).map(mov => `
              <div class="row small">
                <span>${mov.movement_type === 'supply' ? '+' : '-'} ${mov.movement_type === 'supply' ? 'Supr.' : 'Sang.'}</span>
                <span>${formatCurrency(mov.amount / 100)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="double-line"></div>

        <div class="center small">
          <p>Este documento NÃO possui valor fiscal.</p>
          <p>Emitido em: ${format(now, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
          <p style="margin-top: 8px;">${footer}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=320,height=800');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 300);
    } else {
      setIsPrinting(false);
    }
  };

  if (!openSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório X</DialogTitle>
            <DialogDescription>
              É necessário ter um caixa aberto para gerar o Relatório X.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Relatório X - Leitura Parcial
          </DialogTitle>
          <DialogDescription>
            Resumo parcial das operações do caixa. Este relatório não fecha o caixa.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Resumo de Vendas */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Resumo de Vendas</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Vendas:</span>
                <span className="font-semibold">{summary.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-semibold">{formatCurrency(summary.totalRevenue)}</span>
              </div>
            </div>

            {/* Por Pagamento */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Por Forma de Pagamento</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Dinheiro:</span>
                  <span>{formatCurrency(summary.payments.dinheiro.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Débito:</span>
                  <span>{formatCurrency(summary.payments.cartao_debito.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Crédito:</span>
                  <span>{formatCurrency(summary.payments.cartao_credito.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIX:</span>
                  <span>{formatCurrency(summary.payments.pix.total)}</span>
                </div>
              </div>
            </div>

            {/* Movimentações */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Movimentações</h4>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Suprimentos:</span>
                <span className="text-green-600">+ {formatCurrency(totals.supplies / 100)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Sangrias:</span>
                <span className="text-red-600">- {formatCurrency(totals.withdrawals / 100)}</span>
              </div>
            </div>

            {/* Saldo Esperado */}
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Saldo Esperado em Caixa:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(summary.expectedCash)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting || isLoading}>
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Imprimir Relatório X
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
