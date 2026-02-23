/**
 * Smart POS Cash Closing Component
 * Fechamento de caixa no dispositivo Smart PDV
 * Com suporte a Caixa Cego (blind cash) - operador conta sem ver o valor esperado
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Calculator, 
  Printer, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  EyeOff,
  Eye
} from 'lucide-react';
import { SmartPOSCashSession, SmartPOSCashSummary, useCloseSmartPOSCash } from '@/hooks/useSmartPOSCashSession';
import { generateSmartPOSCashClosingHTML, SmartPOSCashClosingData, SmartPOSPrintConfig } from '@/lib/print/smartPOSPrint';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartPOSCashClosingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SmartPOSCashSession;
  summary: SmartPOSCashSummary;
  deviceName: string;
  operatorName: string;
  companyName?: string;
  printConfig: SmartPOSPrintConfig;
  onPrint?: (html: string) => void;
}

export function SmartPOSCashClosing({
  open,
  onOpenChange,
  session,
  summary,
  deviceName,
  operatorName,
  companyName,
  printConfig,
  onPrint,
}: SmartPOSCashClosingProps) {
  const [closingBalance, setClosingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'counting' | 'review' | 'done'>('counting');
  const [blindMode, setBlindMode] = useState(true); // Caixa cego por padrão
  
  const closeCash = useCloseSmartPOSCash();

  const closingValue = parseFloat(closingBalance.replace(',', '.')) || 0;
  const expectedValue = session.opening_balance + summary.expectedCash;
  const difference = closingValue - expectedValue;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleProceedToReview = () => {
    if (!closingBalance || closingValue < 0) {
      toast.error('Informe o valor contado em caixa');
      return;
    }
    setStep('review');
  };

  const handleClose = async () => {
    try {
      await closeCash.mutateAsync({
        sessionId: session.id,
        closingBalance: closingValue,
        summary,
        notes,
      });

      setStep('done');

      // Print receipt
      const printData: SmartPOSCashClosingData = {
        deviceName,
        operatorName,
        openedAt: session.opened_at,
        closedAt: new Date().toISOString(),
        openingBalance: session.opening_balance,
        closingBalance: closingValue,
        expectedBalance: expectedValue,
        difference,
        totalTransactions: summary.totalTransactions,
        totalRevenue: summary.totalRevenue,
        paymentsSummary: summary.paymentsSummary,
        companyName,
      };

      const html = generateSmartPOSCashClosingHTML(printData, printConfig);
      
      if (onPrint) {
        onPrint(html);
      } else {
        // Fallback to browser print
        const printWindow = window.open('', '_blank', 'width=400,height=700');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 200);
          };
        }
      }

      // Close dialog after delay
      setTimeout(() => {
        onOpenChange(false);
        setStep('counting');
        setClosingBalance('');
        setNotes('');
      }, 3000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const renderCounting = () => (
    <div className="space-y-6">
      {/* Blind Mode Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          {blindMode ? (
            <EyeOff className="w-4 h-4 text-amber-500" />
          ) : (
            <Eye className="w-4 h-4 text-green-500" />
          )}
          <div>
            <span className="text-sm font-medium text-white">Caixa Cego</span>
            <p className="text-xs text-gray-400">
              {blindMode ? 'Valores ocultos até finalizar' : 'Valores visíveis'}
            </p>
          </div>
        </div>
        <Switch
          checked={blindMode}
          onCheckedChange={setBlindMode}
        />
      </div>

      {/* Summary Card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Resumo do Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Abertura:</span>
            <span>{format(new Date(session.opened_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Saldo Inicial:</span>
            <span className="font-medium">{formatCurrency(session.opening_balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transações:</span>
            <span className="font-medium">{summary.totalTransactions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receita Total:</span>
            <span className="font-bold text-primary">{formatCurrency(summary.totalRevenue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
          <Smartphone className="w-4 h-4 text-blue-500" />
          <div className="text-xs">
            <div className="font-medium">PIX</div>
            <div>{blindMode ? '***' : formatCurrency(summary.paymentsSummary.pix.total)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
          <CreditCard className="w-4 h-4 text-green-500" />
          <div className="text-xs">
            <div className="font-medium">Crédito</div>
            <div>{blindMode ? '***' : formatCurrency(summary.paymentsSummary.credit.total)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
          <CreditCard className="w-4 h-4 text-purple-500" />
          <div className="text-xs">
            <div className="font-medium">Débito</div>
            <div>{blindMode ? '***' : formatCurrency(summary.paymentsSummary.debit.total)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
          <Banknote className="w-4 h-4 text-yellow-600" />
          <div className="text-xs">
            <div className="font-medium">Dinheiro</div>
            <div>{blindMode ? '***' : formatCurrency(summary.paymentsSummary.cash.total)}</div>
          </div>
        </div>
      </div>

      {/* Expected value - hidden in blind mode */}
      {blindMode ? (
        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <EyeOff className="w-4 h-4" />
            <span className="text-sm font-medium">Modo Caixa Cego Ativo</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Conte o dinheiro na gaveta e digite o valor. A conferência será feita ao final.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Saldo Esperado em Dinheiro</div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(expectedValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            (Inicial + Dinheiro recebido)
          </div>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <Label htmlFor="closing">Valor Contado em Caixa (R$)</Label>
        <Input
          id="closing"
          type="text"
          placeholder="0,00"
          value={closingBalance}
          onChange={(e) => setClosingBalance(e.target.value)}
          className="text-xl font-bold h-14 text-center"
          inputMode="decimal"
        />
        <p className="text-xs text-gray-500 text-center">
          Digite o valor total contado na gaveta
        </p>
      </div>

      <Button onClick={handleProceedToReview} className="w-full" size="lg" disabled={!closingBalance}>
        <Calculator className="w-4 h-4 mr-2" />
        Conferir e Fechar
      </Button>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      {/* Difference highlight */}
      <div className={`p-6 rounded-lg text-center ${
        Math.abs(difference) < 0.01 
          ? 'bg-green-500/20 border border-green-500' 
          : difference > 0 
            ? 'bg-blue-500/20 border border-blue-500'
            : 'bg-red-500/20 border border-red-500'
      }`}>
        <div className="text-sm mb-2">
          {Math.abs(difference) < 0.01 ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Caixa Bateu!
            </Badge>
          ) : difference > 0 ? (
            <Badge variant="default" className="bg-blue-500">
              <DollarSign className="w-3 h-3 mr-1" />
              Sobra de Caixa
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Falta de Caixa
            </Badge>
          )}
        </div>
        <div className="text-3xl font-bold">
          {formatCurrency(Math.abs(difference))}
        </div>
      </div>

      {/* Comparison */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-2 bg-muted/50 rounded">
          <span>Saldo Inicial:</span>
          <span className="font-medium">{formatCurrency(session.opening_balance)}</span>
        </div>
        <div className="flex justify-between p-2 bg-muted/50 rounded">
          <span>Dinheiro Recebido:</span>
          <span className="font-medium">{formatCurrency(summary.expectedCash)}</span>
        </div>
        <div className="flex justify-between p-2 bg-primary/10 rounded">
          <span>Saldo Esperado:</span>
          <span className="font-bold">{formatCurrency(expectedValue)}</span>
        </div>
        <div className="flex justify-between p-2 bg-muted rounded border-2 border-primary">
          <span>Valor Contado:</span>
          <span className="font-bold">{formatCurrency(closingValue)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Anotações sobre o fechamento..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('counting')} className="flex-1">
          Voltar
        </Button>
        <Button 
          onClick={handleClose} 
          className="flex-1" 
          disabled={closeCash.isPending}
        >
          {closeCash.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Printer className="w-4 h-4 mr-2" />
          )}
          Fechar e Imprimir
        </Button>
      </div>
    </div>
  );

  const renderDone = () => (
    <div className="py-8 text-center space-y-4">
      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
      <div>
        <h3 className="text-lg font-bold">Caixa Fechado!</h3>
        <p className="text-sm text-muted-foreground">
          O relatório foi enviado para impressão.
        </p>
      </div>
      {Math.abs(difference) >= 0.01 && (
        <div className={`inline-block px-4 py-2 rounded-lg ${
          difference > 0 ? 'bg-blue-500/20' : 'bg-red-500/20'
        }`}>
          <span className="text-sm">
            {difference > 0 ? 'Sobra' : 'Falta'}: {formatCurrency(Math.abs(difference))}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Fechamento de Caixa
          </DialogTitle>
          <DialogDescription>
            {deviceName} • {operatorName}
          </DialogDescription>
        </DialogHeader>

        {step === 'counting' && renderCounting()}
        {step === 'review' && renderReview()}
        {step === 'done' && renderDone()}
      </DialogContent>
    </Dialog>
  );
}
