import { useEffect, useRef } from 'react';
import { CheckCircle, Printer, Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { printReceiptBrowser } from '@/lib/print/browserPrint';

interface PDVSaleSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleData?: {
    orderId?: string;
    total?: number;
    paymentMethod?: string;
    nsu?: string;
    items?: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
  companyName?: string;
  onPrintReceipt: () => void;
  onPrintFiscal: () => void;
  onNewSale: () => void;
}

export function PDVSaleSuccessModal({
  open,
  onOpenChange,
  saleData,
  companyName,
  onPrintReceipt,
  onPrintFiscal,
  onNewSale,
}: PDVSaleSuccessModalProps) {
  const hasPrintedRef = useRef(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Auto-print when modal opens
  useEffect(() => {
    if (open && saleData && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      
      setTimeout(() => {
        printReceiptBrowser({
          total: (saleData.total || 0) / 100,
          paymentMethod: saleData.paymentMethod || 'Dinheiro',
          items: saleData.items,
          companyName: companyName || 'Estabelecimento',
          orderId: saleData.orderId,
          nsu: saleData.nsu,
        });
      }, 500);
    }
    
    // Reset flag when modal closes
    if (!open) {
      hasPrintedRef.current = false;
    }
  }, [open, saleData, companyName]);

  const handleNewSale = () => {
    onOpenChange(false);
    onNewSale();
  };

  const handlePrintReceipt = () => {
    if (saleData) {
      printReceiptBrowser({
        total: (saleData.total || 0) / 100,
        paymentMethod: saleData.paymentMethod || 'Dinheiro',
        items: saleData.items,
        companyName: companyName || 'Estabelecimento',
        orderId: saleData.orderId,
        nsu: saleData.nsu,
      });
    }
    onPrintReceipt();
  };

  const handlePrintFiscal = () => {
    onPrintFiscal();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center">
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4 py-4">
          <h2 className="text-2xl font-bold text-green-500">Venda Finalizada!</h2>
          
          {saleData?.total && (
            <div className="text-3xl font-bold">
              {formatPrice(saleData.total / 100)}
            </div>
          )}

          {saleData?.paymentMethod && (
            <p className="text-muted-foreground">
              Pagamento: {saleData.paymentMethod}
            </p>
          )}

          {saleData?.nsu && (
            <div className="bg-muted/50 rounded-lg p-3 inline-block">
              <p className="text-xs text-muted-foreground">NSU</p>
              <p className="font-mono font-bold text-foreground">{saleData.nsu}</p>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full h-14"
            onClick={handlePrintReceipt}
          >
            <Printer className="h-5 w-5 mr-3" />
            Imprimir Comprovante
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-14"
            onClick={handlePrintFiscal}
          >
            <Receipt className="h-5 w-5 mr-3" />
            Imprimir Cupom Fiscal
          </Button>

          <Button
            size="lg"
            className="w-full h-14 bg-primary"
            onClick={handleNewSale}
          >
            <Plus className="h-5 w-5 mr-3" />
            Novo Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
