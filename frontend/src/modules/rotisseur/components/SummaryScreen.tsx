import { useState } from 'react';
import { ShoppingCart, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-shim';
import type { RotisseurCartItem, RotisseurCustomerInfo, MeatOccasion, CookingMethod } from '../types';
import { COOKING_METHODS, OCCASIONS } from '../types';

interface SummaryScreenProps {
  companyId: string;
  cartItems: RotisseurCartItem[];
  grandTotal: number;
  numberOfPeople: number;
  cookingMethod: CookingMethod;
  occasion: MeatOccasion;
  customer: RotisseurCustomerInfo | null;
  onBack: () => void;
  onComplete: (ticketNumber: string) => void;
}

export function SummaryScreen({
  companyId,
  cartItems,
  grandTotal,
  numberOfPeople,
  cookingMethod,
  occasion,
  customer,
  onBack,
  onComplete,
}: SummaryScreenProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const meatItems = cartItems.filter((i) => i.category === 'meat');
  const accompanimentItems = cartItems.filter((i) => i.category === 'accompaniment');
  const extraItems = cartItems.filter((i) => i.category === 'extra');
  const beverageItems = cartItems.filter((i) => i.category === 'beverage');

  const cookingMethodLabel = COOKING_METHODS.find((m) => m.id === cookingMethod)?.label || cookingMethod;
  const occasionLabel = OCCASIONS.find((o) => o.id === occasion)?.label || occasion;

  const handleGenerateTicket = async () => {
    setIsGenerating(true);
    
    try {
      // Generate ticket number
      const ticketNumber = `R${Date.now().toString().slice(-6)}`;
      
      // Create order in database with customer info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          company_id: companyId,
          total: grandTotal,
          status: 'novo',
          order_type: 'balcao',
          source: 'rotisseur',
          customer_id: customer?.id || null,
          customer_name: customer?.name || null,
          customer_phone: customer?.phone || null,
          notes: `Maître Rôtisseur | ${occasionLabel} | ${cookingMethodLabel} | ${numberOfPeople} pessoas | Ticket: ${ticketNumber}`,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast.error('Erro ao criar pedido');
        setIsGenerating(false);
        return;
      }

      // Insert order items
      if (order) {
        const itemsToInsert = cartItems.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total,
        }));

        await supabase.from('order_items').insert(itemsToInsert);
      }

      toast.success('Ticket gerado com sucesso!');
      onComplete(ticketNumber);
    } catch (error) {
      console.error('Error generating ticket:', error);
      toast.error('Erro ao gerar ticket');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/20 via-background to-background p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
          <ShoppingCart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Resumo do Pedido</h1>
        <p className="text-muted-foreground">
          {customer?.name && <span className="font-medium">{customer.name} • </span>}
          {occasionLabel} • {cookingMethodLabel} • {numberOfPeople} pessoas
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto space-y-4 max-w-lg mx-auto w-full pb-32">
        {/* Meats */}
        {meatItems.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🥩 Carnes
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {meatItems.map((item) => (
                <div key={item.productId} className="flex justify-between py-2">
                  <div>
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Accompaniments */}
        {accompanimentItems.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🍗 Acompanhamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {accompanimentItems.map((item) => (
                <div key={item.productId} className="flex justify-between py-2">
                  <div>
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Extras */}
        {extraItems.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🧂 Extras
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {extraItems.map((item) => (
                <div key={item.productId} className="flex justify-between py-2">
                  <div>
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Beverages */}
        {beverageItems.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🍺 Bebidas
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              {beverageItems.map((item) => (
                <div key={item.productId} className="flex justify-between py-2">
                  <div>
                    <span className="text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Total */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          <Button
            onClick={handleGenerateTicket}
            disabled={isGenerating}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 py-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5 mr-2" />
                Gerar Ticket
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
