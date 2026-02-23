import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Phone, User, Loader2, Printer, ShoppingCart, MapPin, Wine, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useSommelierSettingsPublic } from '../hooks';
import { SommelierCartItem, WineProduct, PairingProduct, CheckoutMode } from '../types';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { createSommelierPrintJob, printSommelierTicketBrowser, SommelierTicketData } from '@/lib/print/sommelierTicket';
import type { SommelierCustomerInfo } from '../types';

interface CheckoutScreenProps {
  companyId: string;
  wine: WineProduct;
  cartItems: SommelierCartItem[];
  allPairings: PairingProduct[];
  grandTotal: number;
  discount: number;
  customer?: SommelierCustomerInfo | null;
  onBack: () => void;
  onComplete: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function CheckoutScreen({
  companyId,
  wine,
  cartItems,
  allPairings,
  grandTotal,
  discount,
  customer,
  onBack,
  onComplete,
}: CheckoutScreenProps) {
  const { data: settings } = useSommelierSettingsPublic(companyId);
  
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [lastTicketData, setLastTicketData] = useState<SommelierTicketData | null>(null);

  // Get checkout mode from settings, default to 'suggestion'
  const checkoutMode: CheckoutMode = (settings as any)?.checkout_mode || 'suggestion';
  const requirePhone = (settings as any)?.require_customer_phone ?? true;
  const requireName = (settings as any)?.require_customer_name ?? false;
  const printTicketEnabled = (settings as any)?.print_ticket_enabled ?? true;
  const ticketHeaderText = (settings as any)?.ticket_header_text || 'Sugestão do Sommelier';

  const customerDigits = String(customer?.phone || '').replace(/\D/g, '');
  // REGRA: se o cliente já foi identificado no início do Sommelier,
  // NUNCA pedir dados novamente na finalização.
  // Basta ter um telefone válido (WhatsApp 10+ dígitos).
  const isCustomerPreidentified = Boolean(customer && customerDigits.length >= 10);
  // If the customer was already identified earlier in the flow, reuse it and do NOT ask again.
  useEffect(() => {
    if (!customer) return;

    // Prefill once (do not overwrite manual edits if user changed it)
    if (!name && customer.name) setName(customer.name);

    const digits = String(customer.phone || '').replace(/\D/g, '');
    if (!phone && digits.length >= 10) setPhone(formatPhone(digits));

    if (customer.name || digits) setCustomerFound(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);


  // Mock tables for QR code table mode
  const tables = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Auto-lookup customer when phone is complete
  const lookupCustomer = useCallback(async (phoneDigits: string) => {
    if (phoneDigits.length < 10) {
      setCustomerFound(false);
      return;
    }

    setIsLookingUp(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('name, whatsapp')
        .eq('company_id', companyId)
        .or(`whatsapp.eq.${phoneDigits},whatsapp.eq.55${phoneDigits}`)
        .maybeSingle();

      if (customer?.name) {
        setName(customer.name);
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
    } finally {
      setIsLookingUp(false);
    }
  }, [companyId]);

  // Debounced phone lookup
  useEffect(() => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length >= 10) {
      const timer = setTimeout(() => {
        lookupCustomer(phoneDigits);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCustomerFound(false);
    }
  }, [phone, lookupCustomer]);

  const isFormValid = () => {
    if (requirePhone && phone.replace(/\D/g, '').length < 10) return false;
    if (requireName && name.trim().length < 2) return false;
    if (checkoutMode === 'qrcode_table' && !selectedTable) return false;
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    // Reset customer found when phone changes
    if (customerFound) {
      setCustomerFound(false);
    }
  };

  // Find or create customer
  const findOrCreateCustomer = async (phoneDigits: string, customerName: string) => {
    // First try to find existing customer
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', companyId)
      .eq('whatsapp', phoneDigits)
      .maybeSingle();

    if (existing) {
      // Update name if provided
      if (customerName) {
        await supabase
          .from('customers')
          .update({ name: customerName })
          .eq('id', existing.id);
      }
      return existing.id;
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        company_id: companyId,
        name: customerName || 'Cliente Sommelier',
        whatsapp: phoneDigits,
      })
      .select('id')
      .single();

    if (error) throw error;
    return newCustomer.id;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const phoneDigits = phone.replace(/\D/g, '');

      // Save customer for marketing
      if (phoneDigits) {
        await findOrCreateCustomer(phoneDigits, name);
      }

      // Prepare ticket data
      const ticketData: SommelierTicketData = {
        companyId,
        customerName: name || undefined,
        customerPhone: phoneDigits || undefined,
        wine: {
          name: wine.name,
          price: wine.price,
        },
        pairings: cartItems
          .filter(item => item.productId !== wine.id)
          .map(item => {
            const product = allPairings.find(p => p.id === item.productId);
            return {
              name: product?.name || 'Item',
              price: product?.price || 0,
              reason: product?.prepTip || undefined,
            };
          }),
        total: grandTotal,
        tableName: selectedTable || undefined,
        ticketHeaderText,
      };
      setLastTicketData(ticketData);

      // Handle based on checkout mode
      switch (checkoutMode) {
        case 'suggestion':
          // Print sommelier ticket
          if (printTicketEnabled) {
            // Try queue-based printing first, fallback to browser
            const printResult = await createSommelierPrintJob(ticketData);
            if (printResult.success) {
              // IMPORTANT: queue creation does not guarantee the local agent actually printed.
              toast.success('🍷 Ticket enviado para a fila de impressão.');
            } else {
              // Fallback to browser printing
              printSommelierTicketBrowser(ticketData);
              toast.success('🍷 Ticket impresso! Entregue ao garçom.');
            }
          } else {
            toast.success('Sugestão registrada!');
          }
          break;

        case 'totem':
          // TODO: Create actual order in orders table
          toast.success('Pedido realizado com sucesso!');
          break;

        case 'qrcode_table':
          // TODO: Create order linked to table
          toast.success(`Pedido enviado para a Mesa ${selectedTable}!`);
          break;
      }

      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Error completing checkout:', error);
      toast.error('Erro ao finalizar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (isSuccess) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-950/30 via-background to-background p-6">
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {checkoutMode === 'suggestion' ? 'Ticket Gerado!' : 'Pedido Confirmado!'}
          </h2>
          <p className="text-muted-foreground">
            {checkoutMode === 'suggestion' 
              ? 'Entregue o ticket ao garçom para realizar seu pedido.'
              : checkoutMode === 'qrcode_table'
                ? `Seu pedido foi enviado para a Mesa ${selectedTable}.`
                : 'Aguarde, seu pedido está sendo preparado.'}
          </p>

          {/* Fallback print button (prevents "Ticket gerado" but nothing printed) */}
          {checkoutMode === 'suggestion' && lastTicketData && (
            <div className="mt-6">
              <Button
                variant="outline"
                className="border-purple-500/30 bg-background/40"
                onClick={() => {
                  printSommelierTicketBrowser(lastTicketData);
                  toast.success('Abrindo impressão no navegador...');
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir aqui (se não saiu)
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-purple-950/30 via-background to-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur border-b border-purple-500/20 p-4 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="font-bold text-white">Finalizar Pedido</h2>
             <p className="text-sm text-muted-foreground">
               {isCustomerPreidentified ? 'Cliente já identificado' : (customer?.name || customer?.phone ? 'Confirmar' : 'Informe seus dados')}
             </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        {/* Order Summary */}
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-amber-600 flex items-center justify-center">
                <Wine className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">{wine.name}</p>
                <p className="text-sm text-muted-foreground">
                  + {cartItems.length - 1} acompanhamento(s)
                </p>
              </div>
            </div>
            
            <div className="space-y-1 text-sm border-t border-purple-500/20 pt-3">
              {cartItems.map((item, idx) => {
                const product = item.productId === wine.id 
                  ? wine 
                  : allPairings.find(p => p.id === item.productId);
                if (!product) return null;
                return (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground truncate flex-1 mr-2">
                      {product.name}
                    </span>
                    <span className="text-white">{formatCurrency(product.price)}</span>
                  </div>
                );
              })}
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-purple-500/20 font-bold">
                <span className="text-white">Total</span>
                <span className="text-amber-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Data Form (only if not already identified) */}
        {!isCustomerPreidentified && (
          <div className="space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              Seus Dados
            </h3>

            <div className="space-y-4">
              {/* Phone - First field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  WhatsApp {requirePhone && <span className="text-red-400">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="bg-background/50 border-purple-500/30 pr-10"
                    maxLength={15}
                    autoFocus
                    readOnly={!!(customer?.phone && String(customer.phone).replace(/\D/g, '').length >= 10)}
                  />
                  {isLookingUp && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {customerFound && !isLookingUp && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {customerFound
                    ? 'Cliente encontrado! Dados preenchidos automaticamente.'
                    : 'Para receber novidades e promoções exclusivas'}
                </p>
              </div>

              {/* Name */}
              {(requireName || true) && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Nome {requireName && <span className="text-red-400">*</span>}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`bg-background/50 border-purple-500/30 ${customerFound ? 'border-green-500/50' : ''}`}
                    readOnly={!!(customer?.name && customer.name.trim().length > 0)}
                  />
                </div>
              )}

              {/* Table Selection (QR Code mode only) */}
              {checkoutMode === 'qrcode_table' && (
                <div className="space-y-2">
                  <Label htmlFor="table" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Mesa <span className="text-red-400">*</span>
                  </Label>
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger className="bg-background/50 border-purple-500/30">
                      <SelectValue placeholder="Selecione sua mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table} value={table}>
                          Mesa {table}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode Info */}
        <div className="bg-purple-950/30 rounded-xl p-4 border border-purple-500/20">
          <div className="flex items-center gap-3">
            {checkoutMode === 'suggestion' && <Printer className="w-5 h-5 text-amber-400" />}
            {checkoutMode === 'totem' && <ShoppingCart className="w-5 h-5 text-green-400" />}
            {checkoutMode === 'qrcode_table' && <MapPin className="w-5 h-5 text-blue-400" />}
            <div>
              <p className="font-medium text-white">
                {checkoutMode === 'suggestion' && 'Modo Sugestão'}
                {checkoutMode === 'totem' && 'Pedido Direto'}
                {checkoutMode === 'qrcode_table' && 'Enviar para Mesa'}
              </p>
              <p className="text-xs text-muted-foreground">
                {checkoutMode === 'suggestion' && 'Você receberá um ticket para entregar ao garçom'}
                {checkoutMode === 'totem' && 'Seu pedido será enviado diretamente para preparo'}
                {checkoutMode === 'qrcode_table' && 'Seu pedido será enviado para a mesa selecionada'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 bg-card/95 backdrop-blur border-t border-purple-500/20 p-4">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
          className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-semibold py-6 rounded-xl shadow-neon-mixed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              {checkoutMode === 'suggestion' && <Printer className="w-5 h-5 mr-2" />}
              {checkoutMode === 'totem' && <ShoppingCart className="w-5 h-5 mr-2" />}
              {checkoutMode === 'qrcode_table' && <MapPin className="w-5 h-5 mr-2" />}
              {checkoutMode === 'suggestion' && 'Gerar Ticket de Sugestão'}
              {checkoutMode === 'totem' && 'Finalizar Pedido'}
              {checkoutMode === 'qrcode_table' && `Enviar para Mesa ${selectedTable || ''}`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
