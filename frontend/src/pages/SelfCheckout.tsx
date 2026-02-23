/**
 * Self Check-out Module
 * 
 * Módulo dedicado apenas para recebimento de comandas.
 * Cliente passa a comanda, vê o total e faz o pagamento.
 * Nenhuma outra função além de receber e emitir comprovante.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ScanBarcode, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Check, 
  X, 
  Receipt, 
  RefreshCw,
  Loader2,
  ArrowLeft
} from 'lucide-react';

interface ComandaItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ComandaData {
  id: string;
  number: number;
  name: string | null;
  items: ComandaItem[];
  subtotal: number;
  service_fee: number;
  discount: number;
  total: number;
}

export default function SelfCheckout() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState('');
  const [comanda, setComanda] = useState<ComandaData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input
  useEffect(() => {
    if (!comanda && !paymentComplete && inputRef.current) {
      inputRef.current.focus();
    }
  }, [comanda, paymentComplete]);

  // Fetch comanda by barcode/number
  const fetchComanda = useMutation({
    mutationFn: async (code: string) => {
      // Extract number from barcode (format: COMANDA-{number})
      const number = parseInt(code.replace(/\D/g, ''));
      
      if (isNaN(number) || number <= 0) {
        throw new Error('Número de comanda inválido');
      }
      
      // Find comanda with this command_number (independent of status)
      const { data: comandaData, error } = await supabase
        .from('comandas')
        .select('id, command_number, name, status, total_amount, discount_value')
        .eq('command_number', number)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!comandaData) throw new Error('Comanda não encontrada');
      
      // Get comanda items (only non-canceled)
      const { data: comandaItems } = await supabase
        .from('comanda_items')
        .select('id, product_name_snapshot, qty, unit_price_snapshot')
        .eq('comanda_id', comandaData.id)
        .is('canceled_at', null);

      // Check if comanda has items
      if (!comandaItems || comandaItems.length === 0) {
        throw new Error('Comanda sem lançamentos');
      }

      const items = comandaItems.map((item) => ({
        id: item.id,
        name: item.product_name_snapshot || 'Produto',
        quantity: Number(item.qty) || 1,
        unit_price: Number(item.unit_price_snapshot) || 0,
        total: (Number(item.qty) || 1) * (Number(item.unit_price_snapshot) || 0),
      }));
      
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const serviceFee = subtotal * 0.1; // 10% service fee
      const discount = Number(comandaData.discount_value) || 0;
      
      return {
        id: comandaData.id,
        number: comandaData.command_number || 0,
        name: comandaData.name,
        items,
        subtotal,
        service_fee: serviceFee,
        discount,
        total: subtotal + serviceFee - discount,
      } as ComandaData;
    },
    onSuccess: (data) => {
      setComanda(data);
      setBarcode('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setBarcode('');
    },
  });

  // Process payment
  const processPayment = useMutation({
    mutationFn: async () => {
      if (!comanda || !paymentMethod) return;
      
      // Ao finalizar o pagamento, a comanda deve voltar para "free" (modelo permanente)
      // para continuar aparecendo no mapa e ser reutilizada.
      const { error: updateError } = await supabase
        .from('comandas')
        .update({
          status: 'free',
          closed_at: new Date().toISOString(),
          // Reset para a próxima utilização (o histórico fica em comanda_items/comanda_payments)
          total_amount: 0,
          paid_amount: 0,
          discount_value: 0,
          surcharge_value: 0,
        })
        .eq('id', comanda.id);

      if (updateError) throw updateError;
      
      // Register payment in comanda_payments
      const { data: comandaInfo } = await supabase
        .from('comandas')
        .select('company_id')
        .eq('id', comanda.id)
        .single();
      
      const { error: paymentError } = await supabase
        .from('comanda_payments')
        .insert({
          comanda_id: comanda.id,
          company_id: comandaInfo?.company_id || '',
          payment_method: paymentMethod,
          amount: comanda.total,
        });

      if (paymentError) throw paymentError;
      
      return true;
    },
    onSuccess: () => {
      setPaymentComplete(true);
      toast.success('Pagamento realizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao processar pagamento');
    },
  });

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      fetchComanda.mutate(barcode.trim());
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }
    
    setIsProcessing(true);
    await processPayment.mutateAsync();
    setIsProcessing(false);
  };

  const handleReset = () => {
    setComanda(null);
    setPaymentMethod(null);
    setPaymentComplete(false);
    setBarcode('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Success screen
  if (paymentComplete) {
    return (
      <DashboardLayout title="Self Check-out">
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <div className="w-24 h-24 rounded-full bg-green-500 mx-auto mb-6 flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h1>
              <p className="text-xl text-muted-foreground mb-4">
                Comanda #{comanda?.number}
              </p>
              <p className="text-3xl font-bold mb-8">{formatCurrency(comanda?.total || 0)}</p>
              
              <div className="space-y-4">
                <Button size="lg" className="w-full" variant="outline">
                  <Receipt className="mr-2 h-5 w-5" />
                  Imprimir Comprovante
                </Button>
                <Button size="lg" className="w-full" onClick={handleReset}>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Nova Comanda
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Comanda details and payment screen
  if (comanda) {
    return (
      <DashboardLayout title="Self Check-out">
        <div className="space-y-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <Badge variant="outline" className="text-lg px-4 py-2 mb-4">
              Comanda #{comanda.number}
            </Badge>
            {comanda.name && (
              <h2 className="text-2xl font-semibold text-white">{comanda.name}</h2>
            )}
          </div>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Itens Consumidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comanda.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(comanda.subtotal)}</span>
                </div>
                {comanda.service_fee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de Serviço (10%)</span>
                    <span>{formatCurrency(comanda.service_fee)}</span>
                  </div>
                )}
                {comanda.discount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Desconto</span>
                    <span>-{formatCurrency(comanda.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(comanda.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="h-24 flex-col gap-2"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-8 w-8" />
                  <span>Cartão</span>
                </Button>
                <Button
                  variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                  className="h-24 flex-col gap-2"
                  onClick={() => setPaymentMethod('pix')}
                >
                  <Smartphone className="h-8 w-8" />
                  <span>Pix</span>
                </Button>
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="h-24 flex-col gap-2"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-8 w-8" />
                  <span>Dinheiro</span>
                </Button>
              </div>

              <div className="mt-6 flex gap-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex-1"
                  onClick={handleReset}
                >
                  <X className="mr-2 h-5 w-5" />
                  Cancelar
                </Button>
                <Button 
                  size="lg" 
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={!paymentMethod || isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-5 w-5" />
                  )}
                  Confirmar Pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </DashboardLayout>
    );
  }

  // Initial barcode scan screen
  return (
    <DashboardLayout title="Self Check-out">
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <ScanBarcode className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Self Check-out</CardTitle>
            <p className="text-muted-foreground">
              Passe o código de barras da sua comanda
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Código da comanda..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="text-center text-2xl h-14"
                autoFocus
              />
              <Button 
                type="submit" 
                size="lg" 
                className="w-full"
                disabled={fetchComanda.isPending}
              >
                {fetchComanda.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ScanBarcode className="mr-2 h-5 w-5" />
                )}
                Buscar Comanda
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
