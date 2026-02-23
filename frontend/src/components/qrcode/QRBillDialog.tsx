import { useState } from 'react';
import { Receipt, Loader2, CreditCard, Banknote, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePublicTableBill, usePublicComandaBill, PublicTableBill } from '@/hooks/usePublicTableBill';
import { QRCodeSVG } from 'qrcode.react';

interface QRBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
  tableId?: string | null;
  tableNumber?: number | null;
  comandaNumber?: number | null;
  customerName: string;
  onRequestBill: (paymentPreference?: 'pix' | 'other') => Promise<boolean>;
  pixKey?: string | null;
  companyName?: string;
}

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export function QRBillDialog({
  open,
  onOpenChange,
  companyId,
  tableId,
  tableNumber,
  comandaNumber,
  customerName,
  onRequestBill,
  pixKey,
  companyName,
}: QRBillDialogProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'error'>('pending');
  
  // Fetch bill data based on type
  const { data: tableBill, isLoading: tableLoading } = usePublicTableBill(
    comandaNumber ? null : tableId,
    comandaNumber ? null : companyId
  );
  
  const { data: comandaBill, isLoading: comandaLoading } = usePublicComandaBill(
    tableId ? null : comandaNumber,
    tableId ? null : companyId
  );
  
  const bill: PublicTableBill | null = tableBill || comandaBill;
  const isLoading = tableLoading || comandaLoading;
  
  const locationLabel = tableNumber 
    ? `Mesa ${tableNumber}` 
    : comandaNumber 
      ? `Comanda ${comandaNumber}` 
      : '';

  const handleRequestBillWithWaiter = async () => {
    setIsRequesting(true);
    const success = await onRequestBill('other');
    setIsRequesting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handlePayWithPix = async () => {
    if (!pixKey || !bill) return;
    
    // Request bill first
    setIsRequesting(true);
    const success = await onRequestBill('pix');
    setIsRequesting(false);
    
    if (success) {
      setShowPixPayment(true);
    }
  };

  const handlePixConfirmation = () => {
    // In a real implementation, this would verify the payment
    // For now, just show success
    setPaymentStatus('success');
  };

  // Generate PIX code (Simplified - real implementation would use EMV format)
  const generatePixCode = () => {
    if (!pixKey || !bill) return '';
    const amount = (bill.remainingCents / 100).toFixed(2);
    // Simplified PIX copy-paste code
    return `${pixKey}|${amount}|${companyName || 'Pagamento'}`;
  };

  if (showPixPayment && bill) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription>
              {customerName && <span className="font-medium">{customerName}</span>}
              {locationLabel && ` - ${locationLabel}`}
            </DialogDescription>
          </DialogHeader>
          
          {paymentStatus === 'pending' && (
            <div className="py-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg mb-4">
                <QRCodeSVG 
                  value={generatePixCode()} 
                  size={200}
                  level="M"
                />
              </div>
              
              <p className="text-2xl font-bold text-primary mb-2">
                {formatCurrency(bill.remainingCents)}
              </p>
              
              <p className="text-sm text-muted-foreground text-center mb-4">
                Escaneie o QR Code acima com o app do seu banco para pagar via PIX
              </p>
              
              {pixKey && (
                <div className="w-full p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Chave PIX:</p>
                  <p className="text-sm font-mono break-all">{pixKey}</p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4" 
                onClick={handlePixConfirmation}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Já fiz o pagamento
              </Button>
            </div>
          )}
          
          {paymentStatus === 'success' && (
            <div className="py-8 flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <p className="text-xl font-bold text-green-600 mb-2">
                Pagamento Confirmado!
              </p>
              <p className="text-sm text-muted-foreground text-center">
                O caixa foi notificado. Obrigado pela preferência!
              </p>
              <Button 
                className="mt-6" 
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          )}
          
          {paymentStatus === 'error' && (
            <div className="py-8 flex flex-col items-center">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <p className="text-xl font-bold text-destructive mb-2">
                Erro no Pagamento
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Por favor, tente novamente ou peça ajuda ao garçom.
              </p>
              <Button 
                className="mt-6" 
                onClick={() => setPaymentStatus('pending')}
              >
                Tentar novamente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sua Conta
          </DialogTitle>
          <DialogDescription>
            {customerName && <span className="font-medium">{customerName}</span>}
            {locationLabel && ` - ${locationLabel}`}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !bill ? (
          <div className="py-8 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum consumo registrado ainda.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6 max-h-[40vh]">
              <div className="space-y-2">
                {bill.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-start py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground">{item.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x {formatCurrency(item.unit_price_cents)}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {formatCurrency(item.total_price_cents)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(bill.totalAmountCents)}</span>
              </div>
              
              {bill.paidAmountCents > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Já pago</span>
                  <span>- {formatCurrency(bill.paidAmountCents)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total a pagar</span>
                <span className="text-primary">{formatCurrency(bill.remainingCents)}</span>
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          {bill && bill.remainingCents > 0 && (
            <>
              {pixKey && (
                <Button 
                  className="w-full" 
                  onClick={handlePayWithPix}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Pagar com PIX
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleRequestBillWithWaiter}
                disabled={isRequesting}
              >
                {isRequesting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Banknote className="h-4 w-4 mr-2" />
                )}
                Pagar com Garçom
              </Button>
            </>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
