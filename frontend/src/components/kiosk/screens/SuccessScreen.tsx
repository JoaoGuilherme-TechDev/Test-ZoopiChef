/**
 * SuccessScreen - Order confirmation
 * 
 * Shows order number and thank you message.
 * Auto-returns to attract screen after timeout.
 */

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useKioskState, kioskActions } from '@/stores/kioskStore';
import { CheckCircle, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { printTicketBrowser } from '@/lib/print/browserPrint';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';

export function SuccessScreen() {
  const orderId = useKioskState(s => s.orderId);
  const dineMode = useKioskState(s => s.dineMode);
  const device = useKioskState(s => s.device);
  const [countdown, setCountdown] = useState(10);
  const { data: company } = useCompany();
  const hasPrintedRef = useRef(false);

  // Fetch order details
  const { data: order } = useQuery({
    queryKey: ['kiosk-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, customer_name, total, order_type')
        .eq('id', orderId)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch order items for printing
  const { data: orderItems } = useQuery({
    queryKey: ['kiosk-order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price, notes')
        .eq('order_id', orderId);
      
      if (error) return [];
      return data;
    },
    enabled: !!orderId,
  });

  // Auto-print ticket when order loads
  useEffect(() => {
    if (order && orderItems && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      
      const ticketNumber = order.order_number 
        ? String(order.order_number).padStart(3, '0')
        : order.id.slice(0, 8).toUpperCase();

      setTimeout(() => {
        printTicketBrowser({
          ticketNumber,
          customerName: order.customer_name || undefined,
          items: orderItems.map(item => ({
            name: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            notes: item.notes || undefined,
          })),
          total: order.total || 0,
          companyName: company?.name || 'Estabelecimento',
          orderType: dineMode === 'eat_here' ? 'counter' : 'takeout',
          showQRCode: true,
          qrCodeData: order.id,
        });
      }, 500);
    }
  }, [order, orderItems, company, dineMode]);

  // Auto-return countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          kioskActions.reset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const orderNumber = order?.order_number 
    ? String(order.order_number).padStart(3, '0')
    : '---';

  const handlePrint = () => {
    if (!order) return;
    
    const ticketNumber = order.order_number 
      ? String(order.order_number).padStart(3, '0')
      : order.id.slice(0, 8).toUpperCase();

    printTicketBrowser({
      ticketNumber,
      customerName: order.customer_name || undefined,
      items: (orderItems || []).map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        notes: item.notes || undefined,
      })),
      total: order.total || 0,
      companyName: company?.name || 'Estabelecimento',
      orderType: dineMode === 'eat_here' ? 'counter' : 'takeout',
      showQRCode: true,
      qrCodeData: order.id,
    });
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-background p-8">
      {/* Success icon */}
      <div className="mb-8 animate-bounce">
        <CheckCircle className="w-32 h-32 text-green-500" />
      </div>

      {/* Thank you message */}
      <h1 className="text-5xl font-bold text-foreground mb-4 text-center">
        Obrigado!
      </h1>
      <p className="text-2xl text-muted-foreground mb-12 text-center">
        Seu pedido foi realizado com sucesso
      </p>

      {/* Order number */}
      <div className="bg-card/50 backdrop-blur rounded-3xl p-8 mb-8 border border-border">
        <p className="text-xl text-muted-foreground text-center mb-2">Número do Pedido</p>
        <p className="text-7xl font-bold text-foreground text-center">
          #{orderNumber}
        </p>
      </div>

      {/* Dine mode reminder */}
      <div className={cn(
        'px-8 py-4 rounded-full text-xl font-bold text-primary-foreground',
        dineMode === 'eat_here' 
          ? 'bg-green-600' 
          : 'bg-blue-600'
      )}>
        {dineMode === 'eat_here' ? '🍽️ Comer Aqui' : '📦 Para Levar'}
      </div>

      {/* Print button */}
      <Button
        onClick={handlePrint}
        variant="outline"
        size="lg"
        className="mt-8"
      >
        <Printer className="w-5 h-5 mr-2" />
        Imprimir Novamente
      </Button>

      {/* Instructions */}
      <p className="text-lg text-muted-foreground mt-8 text-center max-w-md">
        Aguarde seu pedido ser chamado no painel ou retire no balcão
      </p>

      {/* Countdown */}
      <p className="text-lg text-muted-foreground/70 mt-12">
        Voltando ao início em {countdown}s...
      </p>
    </div>
  );
}
