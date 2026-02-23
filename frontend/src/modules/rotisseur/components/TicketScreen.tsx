import { useEffect, useRef } from 'react';
import { CheckCircle, Home, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { printTicketBrowser } from '@/lib/print/browserPrint';

interface TicketScreenProps {
  ticketNumber: string;
  companyName: string;
  onNewOrder: () => void;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  total?: number;
  customerName?: string;
}

export function TicketScreen({ 
  ticketNumber, 
  companyName, 
  onNewOrder,
  items = [],
  total = 0,
  customerName,
}: TicketScreenProps) {
  const hasPrintedRef = useRef(false);

  // Auto-print on mount
  useEffect(() => {
    if (!hasPrintedRef.current) {
      hasPrintedRef.current = true;
      
      setTimeout(() => {
        printTicketBrowser({
          ticketNumber,
          customerName,
          items,
          total,
          companyName,
          showQRCode: true,
          qrCodeData: ticketNumber,
        });
      }, 500);
    }
  }, [ticketNumber, customerName, items, total, companyName]);

  const handlePrint = () => {
    printTicketBrowser({
      ticketNumber,
      customerName,
      items,
      total,
      companyName,
      showQRCode: true,
      qrCodeData: ticketNumber,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-950/30 via-background to-background">
      {/* Success Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-30 animate-pulse" />
        <div className="relative p-6 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg">
          <CheckCircle className="w-16 h-16 text-white" />
        </div>
      </div>

      {/* Message */}
      <h1 className="text-3xl font-bold text-foreground mb-2 text-center">
        Pedido Registrado!
      </h1>
      <p className="text-muted-foreground text-center mb-8">
        Entregue este ticket ao atendente
      </p>

      {/* Ticket */}
      <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full mb-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">{companyName}</p>
          <p className="text-xs text-gray-400 mb-4">Maître Rôtisseur</p>
          
          <div className="border-t border-b border-dashed border-gray-300 py-4 my-4">
            <p className="text-gray-500 text-sm mb-1">Seu número:</p>
            <p className="text-5xl font-bold text-gray-900 tracking-wider">
              {ticketNumber}
            </p>
          </div>

          <div className="flex justify-center mb-4">
            <QRCodeSVG 
              value={ticketNumber} 
              size={100}
              level="M"
            />
          </div>

          <p className="text-xs text-gray-400">
            Apresente este ticket no balcão
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-sm">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="w-full"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Novamente
        </Button>
        
        <Button
          onClick={onNewOrder}
          className="w-full bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500"
        >
          <Home className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>
    </div>
  );
}
