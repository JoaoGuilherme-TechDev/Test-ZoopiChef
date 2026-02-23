/**
 * PaymentScreen - Payment method selection and processing
 * 
 * Shows enabled payment methods for this kiosk.
 * Integrates with existing payment system.
 * Automatically applies customer discounts from rewards.
 */

import { useState, useMemo } from 'react';
import { useKioskState, kioskActions, useKioskCartTotal } from '@/stores/kioskStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, QrCode, Banknote, Loader2, Gift, Sparkles, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PaymentMethod = 'pix' | 'card' | 'cashier_qr' | 'dinheiro';

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  icon: typeof CreditCard;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'pix', label: 'PIX', icon: QrCode, description: 'Pagamento instantâneo' },
  { id: 'card', label: 'Cartão', icon: CreditCard, description: 'Crédito ou Débito' },
  { id: 'cashier_qr', label: 'Pagar no Caixa', icon: Banknote, description: 'Código para caixa' },
];

export function PaymentScreen() {
  const device = useKioskState(s => s.device);
  const cart = useKioskState(s => s.cart);
  const customerName = useKioskState(s => s.customerName);
  const customerPhone = useKioskState(s => s.customerPhone);
  const dineMode = useKioskState(s => s.dineMode);
  const identifiedCustomer = useKioskState(s => s.identifiedCustomer);
  const cartTotal = useKioskCartTotal();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const enabledMethods = device?.enabled_payment_methods || ['pix', 'card'];
  const availableOptions = PAYMENT_OPTIONS.filter(opt => enabledMethods.includes(opt.id));

  // Calculate discount amount
  const discount = identifiedCustomer?.availableDiscount;
  const { discountAmount, finalTotal, discountDescription } = useMemo(() => {
    if (!discount) {
      return { discountAmount: 0, finalTotal: cartTotal, discountDescription: '' };
    }

    let amount = 0;
    let description = '';

    switch (discount.type) {
      case 'percentage':
        amount = Math.round(cartTotal * (discount.value / 100));
        description = `${discount.value}% de desconto`;
        break;
      case 'fixed_value':
        amount = Math.round(discount.value * 100); // Convert to cents
        description = `R$ ${discount.value.toFixed(2)} de desconto`;
        break;
      case 'free_item':
        // Free item doesn't reduce the total directly
        description = discount.prizeName || 'Item grátis';
        break;
    }

    // Don't let discount exceed cart total
    amount = Math.min(amount, cartTotal);

    return {
      discountAmount: amount,
      finalTotal: cartTotal - amount,
      discountDescription: description,
    };
  }, [cartTotal, discount]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleBack = () => {
    if (device?.require_dine_mode) {
      kioskActions.setState('DINE_MODE');
    } else {
      kioskActions.setState('CART');
    }
  };

  const getInvokeErrorMessage = async (invokeError: any): Promise<string> => {
    // supabase.functions.invoke() error sometimes includes the HTTP response with JSON details
    try {
      const res = invokeError?.context?.response;
      if (res && typeof res.json === 'function') {
        const json = await res.json();
        return json?.error || json?.message || invokeError?.message || 'Erro ao processar pedido';
      }
    } catch {
      // ignore
    }
    return invokeError?.message || 'Erro ao processar pedido';
  };

  const handlePayment = async () => {
    if (!selectedMethod || !device) return;

    setIsProcessing(true);

    try {
      // Use edge function to create order (bypasses RLS issues)
      const dineModeValue = dineMode || 'eat_here';
      const resolvedName = customerName || identifiedCustomer?.name || 'Cliente Totem';
      const resolvedPhone = customerPhone || identifiedCustomer?.phone || null;

      // orders.fulfillment_type has a DB constraint: delivery | pickup | dine_in | table
      // For Totem we map:
      // - eat_here  -> dine_in
      // - takeaway  -> pickup
      const fulfillmentType = dineModeValue === 'eat_here' ? 'dine_in' : 'pickup';

      const orderPayload = {
        company_id: device.company_id,
        order_type: 'counter',
        receipt_type: dineModeValue === 'eat_here' ? 'local' : 'retirada',
        fulfillment_type: fulfillmentType,
        customer_name: resolvedName,
        customer_phone: resolvedPhone,
        payment_method: selectedMethod === 'card' ? 'cartao_credito' : selectedMethod,
        total: finalTotal / 100,
        notes: `Totem: ${device.device_code} | ${dineModeValue === 'eat_here' ? 'Comer Aqui' : 'Para Levar'}${discount ? ` | Desconto: ${discountDescription}` : ''}`,
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price_cents / 100,
          notes: item.notes || null,
          selected_options_json: item.selected_options || null,
        })),
      };

      const response = await supabase.functions.invoke('public-create-order', {
        body: orderPayload,
      });

      if (response.error) {
        const msg = await getInvokeErrorMessage(response.error);
        throw new Error(msg);
      }

      const orderData = response.data;
      if (!orderData?.order?.id) {
        throw new Error('Resposta inválida do servidor');
      }

      const order = orderData.order;

      // Mark reward as used if we applied a discount
      if (discount && identifiedCustomer) {
        await supabase
          .from('customer_rewards')
          .update({ 
            status: 'used', 
            used_at: new Date().toISOString(),
            used_order_id: order.id,
          })
          .eq('id', discount.rewardId);
      }

      // Create print jobs for production
      if (device.print_sector_ids && device.print_sector_ids.length > 0) {
        const printJobs = device.print_sector_ids.map(sectorId => ({
          company_id: device.company_id,
          order_id: order.id,
          print_sector_id: sectorId,
          job_type: 'order',
          source: 'kiosk',
          status: 'pending',
        }));

        await supabase.from('print_job_queue').insert(printJobs);
      }

      // Create print job for customer receipt (automatic printing via queue)
      if (device.print_customer_receipt) {
        await supabase.from('print_job_queue').insert([{
          company_id: device.company_id,
          order_id: order.id,
          job_type: 'order',
          source: 'kiosk_receipt',
          status: 'pending',
          metadata: JSON.parse(JSON.stringify({
            customerName: resolvedName,
            customerPhone: resolvedPhone,
            dineMode: dineModeValue,
            printerHost: device.customer_printer_host || null,
            printerPort: device.customer_printer_port || 9100,
            isKioskReceipt: true,
            discountApplied: discountAmount > 0,
            discountDescription,
          })),
        }]);
      }

      // Save order ID and go to success
      kioskActions.setOrderId(order.id);
      kioskActions.setState('SUCCESS');

    } catch (error) {
      console.error('[Kiosk] Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-6 bg-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14"
            onClick={handleBack}
            disabled={isProcessing}
          >
            <ArrowLeft className="w-8 h-8" />
          </Button>
          <h1 className="text-3xl font-bold text-white">Pagamento</h1>
        </div>
      </div>

      {/* Payment options */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Total with discount */}
          <div className="text-center mb-8">
            {/* Show discount if applied */}
            {discountAmount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-gradient-to-r from-green-600/30 to-emerald-600/20 rounded-xl border border-green-500/40"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="w-6 h-6 text-green-400" />
                  <span className="text-lg font-bold text-green-400">
                    Desconto Aplicado!
                  </span>
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-gray-300">{discountDescription}</p>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="text-gray-400 line-through text-xl">
                    {formatCurrency(cartTotal)}
                  </span>
                  <Tag className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-bold text-xl">
                    - {formatCurrency(discountAmount)}
                  </span>
                </div>
              </motion.div>
            )}

            <p className="text-xl text-gray-400">Total a pagar</p>
            <p className={cn(
              'font-bold',
              discountAmount > 0 
                ? 'text-4xl text-green-400' 
                : 'text-5xl text-orange-500'
            )}>
              {formatCurrency(finalTotal)}
            </p>
          </div>

          {/* VIP welcome message */}
          {identifiedCustomer?.isVIP && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center"
            >
              <p className="text-yellow-400 text-sm flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Cliente VIP: {identifiedCustomer.name.split(' ')[0]}
                <Sparkles className="w-4 h-4" />
              </p>
            </motion.div>
          )}

          {/* Payment method selection */}
          <div className="space-y-4">
            {availableOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedMethod === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedMethod(option.id)}
                  disabled={isProcessing}
                  className={cn(
                    'w-full p-6 rounded-xl flex items-center gap-6 transition-all',
                    'border-2',
                    isSelected
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  )}
                >
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center',
                    isSelected ? 'bg-orange-500' : 'bg-gray-700'
                  )}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-2xl font-bold text-white">{option.label}</p>
                    <p className="text-lg text-gray-400">{option.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm button */}
      <div className="p-6 bg-gray-800 shrink-0">
        <Button
          size="lg"
          className="w-full h-20 text-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          onClick={handlePayment}
          disabled={!selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-8 h-8 mr-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
