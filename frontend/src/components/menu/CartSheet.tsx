import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Minus, Plus, ShoppingCart, Trash2, MessageCircle, Check, Loader2,
  ChevronLeft, ChevronRight, MapPin, CreditCard, Store, Truck, AlertCircle, MessageSquare, Ticket, X, Gift, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart, CartItem } from '@/contexts/CartContext';
import type { SelectedOption } from '@/contexts/CartContext';
import { SalesSuggestions } from './SalesSuggestions';
import { PublicProductOptionalsDialog } from './PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from './PizzaConfiguratorDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { usePublicCustomerReward } from '@/hooks/useCustomerRewards';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';
import { parseFunctionInvokeError } from '@/lib/edgeFunctionError';
import { trackingService } from '@/lib/marketing/trackingService';
import { cn } from '@/lib/utils';
import { usePublicDeliveryFee } from '@/hooks/usePublicDeliveryFee';
import { OnlineStoreClosedMessage, useCanOrder } from './OnlineStoreStatusBadge';
import { AddressStep } from './AddressStep';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';

interface Product {
  id: string;
  name: string;
  price: number;
  product_type?: string | null;
  has_flavors?: boolean;
  subcategory?: {
    id?: string;
    name?: string;
    category?: {
      id?: string;
      name?: string | null;
    } | null;
  } | null;
}

interface CartSheetProps {
  companyId?: string;
  companyName: string;
  whatsapp?: string | null;
  mode: 'delivery' | 'qrcode' | 'totem';
  allProducts?: Product[];
  customerPhone?: string | null;
  lastOrderItems?: CartItem[];
  isVipCustomer?: boolean;
  // QR Code mode props
  tableNumber?: number | null;
  comandaNumber?: number | null;
  customerName?: string;
}

type CheckoutStep = 'cart' | 'receipt_type' | 'address' | 'payment' | 'confirm';
type ReceiptType = 'retirada' | 'entrega' | 'balcao';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', icon: '💠' },
  { id: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { id: 'cartao_credito', label: 'Cartão de Crédito', icon: '💳' },
  { id: 'cartao_debito', label: 'Cartão de Débito', icon: '💳' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function CartSheet({ 
  companyId,
  companyName, 
  whatsapp, 
  mode, 
  allProducts = [],
  customerPhone,
  lastOrderItems = [],
  isVipCustomer = false,
  tableNumber: qrTableNumber,
  comandaNumber: qrComandaNumber,
  customerName: qrCustomerName,
}: CartSheetProps) {
  const { items, addItem, addPizzaItem, updateQuantity, updateItemNotes, removeItem, clearCart, totalItems, totalPrice, isOpen, setIsOpen } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const { canOrder, etaAdjustMinutes } = useCanOrder(companyId);

  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [optionalsProduct, setOptionalsProduct] = useState<Product | null>(null);
  const [pendingAddProduct, setPendingAddProduct] = useState<Product | null>(null);

  const [pizzaOpen, setPizzaOpen] = useState(false);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizzaProduct = (p: Product | null) => isPizzaCategory(p);

  type WheelRewardLocal = {
    rewardId: string;
    companyId: string;
    phone: string;
    rewardType: 'percentage' | 'fixed_value' | 'free_item';
    rewardValue: number;
    maxDiscountCents?: number;
    expiresAt: string;
    prizeName?: string;
  };

  const [wheelReward, setWheelReward] = useState<WheelRewardLocal | null>(null);
  const [wheelDiscount, setWheelDiscount] = useState(0);
  const [useWheelReward, setUseWheelReward] = useState(true); // User choice to use or save for later

  const { config: deliveryConfig, neighborhoods, ranges, calculate: calculateDeliveryFee, isLoading: deliveryLoading } = usePublicDeliveryFee(companyId);

  // Checkout state
  const [step, setStep] = useState<CheckoutStep>('cart');
  // QR Code mode: always use 'balcao' (no delivery/pickup options)
  const [receiptType, setReceiptType] = useState<ReceiptType>(mode === 'qrcode' ? 'balcao' : 'entrega');
  const [customerName, setCustomerName] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  // For QR mode, use the prop phone; for delivery, use the input phone
  const effectivePhone = useMemo(() => {
    const propPhone = customerPhone?.replace(/\D/g, '') || '';
    const inputPhone = customerPhoneInput.replace(/\D/g, '');
    // Prioritize prop phone in QR mode, otherwise use input
    return (mode === 'qrcode' && propPhone) ? propPhone : inputPhone;
  }, [mode, customerPhone, customerPhoneInput]);
  const normalizedPhone = effectivePhone;
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerCep, setCustomerCep] = useState('');
  const [customerLatitude, setCustomerLatitude] = useState<number | undefined>();
  const [customerLongitude, setCustomerLongitude] = useState<number | undefined>();
  const [addressNotes, setAddressNotes] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [changeFor, setChangeFor] = useState('');
  const [manualDeliveryFee, setManualDeliveryFee] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ coupon: { code: string; discount_type: string; discount_value: number }; discount: number; isFreeDelivery: boolean } | null>(null);
  const validateCoupon = useValidateCoupon();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCreated, setOrderCreated] = useState<{ id: string; orderNumber: number } | null>(null);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);

  // Auto-fetch reward when phone changes
  const { reward: pendingWheelReward, isLoading: rewardLoading } = usePublicCustomerReward(companyId, normalizedPhone);

  // Detect wheel reward when found (don't auto-apply, let user choose)
  useEffect(() => {
    if (pendingWheelReward && !wheelReward) {
      let discount = 0;
      
      if (pendingWheelReward.reward_type === 'percentage') {
        discount = Math.round((totalPrice * pendingWheelReward.reward_value) / 100);
      } else if (pendingWheelReward.reward_type === 'fixed_value') {
        discount = Math.min(pendingWheelReward.reward_value / 100, totalPrice);
      }
      
      setWheelReward({
        rewardId: pendingWheelReward.id,
        companyId: pendingWheelReward.company_id,
        phone: pendingWheelReward.phone,
        rewardType: pendingWheelReward.reward_type,
        rewardValue: pendingWheelReward.reward_value,
        expiresAt: pendingWheelReward.expires_at,
        prizeName: pendingWheelReward.prize_name || undefined,
      });
      setWheelDiscount(discount);
      setUseWheelReward(true); // Default to using the reward
      toast.success(`🎉 Você tem um prêmio disponível: "${pendingWheelReward.prize_name || 'Desconto'}"!`);
    }
  }, [pendingWheelReward, wheelReward, totalPrice]);

  // Calculate effective wheel discount based on user choice
  const effectiveWheelDiscount = useMemo(() => {
    return useWheelReward ? wheelDiscount : 0;
  }, [useWheelReward, wheelDiscount]);

  // Persist phone in localStorage for next order
  useEffect(() => {
    if (normalizedPhone && companyId) {
      localStorage.setItem(`public:last_phone:${companyId}`, customerPhoneInput);
    }
  }, [normalizedPhone, companyId, customerPhoneInput]);

  // Calculate delivery fee based on address
  const deliveryFeeResult = useMemo(() => {
    if (receiptType !== 'entrega' || !customerNeighborhood) {
      return null;
    }
    return calculateDeliveryFee(customerNeighborhood, customerCity, customerLatitude, customerLongitude);
  }, [receiptType, customerNeighborhood, customerCity, customerLatitude, customerLongitude, calculateDeliveryFee]);

  // Effective delivery fee
  const effectiveDeliveryFee = useMemo(() => {
    if (receiptType !== 'entrega') return 0;
    
    if (manualDeliveryFee && deliveryConfig?.allow_manual_override) {
      return parseFloat(manualDeliveryFee) || 0;
    }
    
    if (deliveryFeeResult?.isServiced) {
      return deliveryFeeResult.fee;
    }
    
    return deliveryConfig?.fallback_fee || 0;
  }, [receiptType, manualDeliveryFee, deliveryFeeResult, deliveryConfig]);

  // Calculate coupon discount
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount;
  }, [appliedCoupon]);

  // Total with delivery and coupon/wheel discount
  const totalWithDelivery = totalPrice + effectiveDeliveryFee - couponDiscount - effectiveWheelDiscount;

  // Handle coupon application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !companyId) return;
    
    try {
      const result = await validateCoupon.mutateAsync({
        code: couponCode,
        companyId,
        orderTotal: totalPrice,
      });
      
      setAppliedCoupon({
        coupon: {
          code: result.coupon.code,
          discount_type: result.coupon.discount_type,
          discount_value: result.coupon.discount_value,
        },
        discount: result.discount,
        isFreeDelivery: result.isFreeDelivery,
      });
      toast.success(`Cupom "${result.coupon.code}" aplicado!`);
      setCouponCode('');
      setCouponCode('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao validar cupom';
      toast.error(message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Cupom removido');
  };

  // Reset step when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStep('cart');
      setOrderCreated(null);
      setLastWhatsAppUrl(null);
    } else {
      // Remember phone for next order on the same device
      const savedPhone = localStorage.getItem(`public:last_phone:${companyId || 'no-company'}`);
      if (savedPhone && !customerPhoneInput) setCustomerPhoneInput(savedPhone);
    }
  }, [isOpen, companyId]);

  // Track InitiateCheckout when moving past cart step
  useEffect(() => {
    if (isOpen && step !== 'cart' && items.length > 0) {
      trackingService.trackInitiateCheckout(
        items.map(item => ({
          product_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalPrice
      );
    }
  }, [step === 'receipt_type']);

  const getModeLabel = () => {
    switch (mode) {
      case 'delivery': return 'Delivery';
      case 'qrcode': return 'QR Code';
      case 'totem': return 'Totem';
    }
  };

  const buildWhatsAppMessage = (orderNumber?: number) => {
    let message = `*Pedido #${orderNumber || '---'} via ${getModeLabel()} - ${companyName}*\n\n`;
    
    const receiptLabels: Record<ReceiptType, string> = {
      retirada: '🏪 Retirar no local',
      entrega: '🛵 Entrega',
      balcao: '🪑 Consumo no local',
    };
    message += `*Tipo:* ${receiptLabels[receiptType]}\n`;
    
    if (customerName) {
      message += `*Cliente:* ${customerName}\n`;
    }
    if (customerPhoneInput) {
      message += `*Telefone:* ${customerPhoneInput}\n`;
    }
    if (receiptType === 'balcao' && tableNumber) {
      message += `*Mesa:* ${tableNumber}\n`;
    }
    if (receiptType === 'entrega' && customerAddress) {
      message += `*Endereço:* ${customerAddress}\n`;
      if (customerNeighborhood) {
        message += `*Bairro:* ${customerNeighborhood}${customerCity ? `, ${customerCity}` : ''}\n`;
      }
    }
    
    const paymentLabel = PAYMENT_METHODS.find(p => p.id === paymentMethod)?.label || paymentMethod;
    message += `*Pagamento:* ${paymentLabel}\n`;
    
    if (paymentMethod === 'dinheiro' && changeFor) {
      message += `*Troco para:* R$ ${changeFor}\n`;
    }
    
    message += '\n*--- Itens ---*\n';
    items.forEach(item => {
      const optionalsDelta = item.selectedOptions
        ? item.selectedOptions.reduce((sum, g) => sum + g.items.reduce((s, i) => s + (i.price_delta || 0), 0), 0)
        : 0;
      const unitPrice = item.price + optionalsDelta + (item.pizzaData?.optionals_total || 0);

      let itemLine = `${item.quantity}x ${item.name}`;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        const optDetails = item.selectedOptions
          .flatMap(g => g.items.map(i => i.label))
          .filter(Boolean)
          .join(', ');
        if (optDetails) itemLine += ` (${optDetails})`;
      }
      itemLine += ` - ${formatCurrency(unitPrice * item.quantity)}`;
      message += itemLine + '\n';
    });
    
    if (receiptType === 'entrega' && effectiveDeliveryFee > 0) {
      message += `\n*Taxa de Entrega:* ${formatCurrency(effectiveDeliveryFee)}`;
    }
    
    message += `\n*Total: ${formatCurrency(totalWithDelivery)}*`;
    
    return encodeURIComponent(message);
  };

  const createOrderInDatabase = async () => {
    if (!companyId) {
      console.warn('Company ID not provided, skipping database order creation');
      return null;
    }

    // QR Code mode: orders go to table/comanda without payment
    const isQR = mode === 'qrcode';
    
    // Map receipt type to fulfillment type
    const fulfillmentType = receiptType === 'entrega' ? 'delivery' : 'pickup';
    const deliveryFeeCents = receiptType === 'entrega' ? Math.round(effectiveDeliveryFee * 100) : 0;

    // Build notes with all relevant info
    let notesArray: string[] = [];
    if (customerNeighborhood) {
      notesArray.push(`Bairro: ${customerNeighborhood}${customerCity ? `, ${customerCity}` : ''}`);
    }
    
    // For QR mode, use the table/comanda numbers passed as props
    const effectiveTableNumber = isQR ? qrTableNumber : (receiptType === 'balcao' && tableNumber ? parseInt(tableNumber) : null);
    const effectiveComandaNumber = isQR ? qrComandaNumber : null;
    const effectiveCustomerName = isQR ? qrCustomerName : customerName;
    
    if (effectiveTableNumber) {
      notesArray.push(`Mesa: ${effectiveTableNumber}`);
    }
    if (effectiveComandaNumber) {
      notesArray.push(`Comanda: ${effectiveComandaNumber}`);
    }

    try {
      const orderItems = items.map(item => {
        const optionalsDelta = item.selectedOptions
          ? item.selectedOptions.reduce((sum, g) => sum + g.items.reduce((s, i) => s + (i.price_delta || 0), 0), 0)
          : 0;

        // selected_options_json (always an object for easier printing)
        let selectedOptionsJson: any = null;
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          selectedOptionsJson = { selected_options: JSON.parse(JSON.stringify(item.selectedOptions)) };
        }

        // For pizza items, include the full pizza snapshot
        if (item.isPizza && item.pizzaData) {
          selectedOptionsJson = {
            ...(selectedOptionsJson || {}),
            pizza_snapshot: {
              size: item.pizzaData.size,
              parts_count: item.pizzaData.parts_count,
              pricing_model: item.pizzaData.pricing_model,
              selected_flavors: item.pizzaData.selected_flavors,
              selected_optionals: item.pizzaData.selected_optionals.map(opt => ({
                group_id: opt.group_id,
                group_name: opt.group_name,
                item_id: opt.item_id,
                item_label: opt.item_label,
                price: opt.price,
                target_scope: opt.target_scope,
                calc_mode: opt.calc_mode,
              })),
              optionals_total: item.pizzaData.optionals_total,
            },
          };
        }

        const unitPrice = item.price + optionalsDelta + (item.pizzaData?.optionals_total || 0);

        return {
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          notes: item.notes || null,
          selected_options_json: selectedOptionsJson,
        };
      });

      const { data, error } = await supabase.functions.invoke('public-create-order', {
        body: {
          company_id: companyId,
          customer_name: effectiveCustomerName || null,
          customer_phone: isQR ? (customerPhone || null) : (customerPhoneInput || null),
          customer_address: receiptType === 'entrega' ? (customerAddress || null) : null,
          address_notes: receiptType === 'entrega' ? (addressNotes || null) : null,
          order_type: mode,
          receipt_type: receiptType,
          fulfillment_type: fulfillmentType,
          payment_method: isQR ? null : paymentMethod, // QR mode: no payment yet
          change_for: paymentMethod === 'dinheiro' && changeFor ? parseFloat(changeFor) : null,
          delivery_fee: receiptType === 'entrega' ? effectiveDeliveryFee : null,
          delivery_fee_cents: deliveryFeeCents,
          table_number: effectiveTableNumber || null,
          comanda_number: effectiveComandaNumber || null,
          total: totalWithDelivery,
          notes: notesArray.length > 0 ? notesArray.join(' | ') : null,
          items: orderItems,
        },
      });

      // Prefer the function JSON body (it contains a user-friendly message)
      const bodyError = (data as any)?.error as string | undefined;
      const bodyReason = (data as any)?.reason as string | undefined;
      const nextOpenAt = (data as any)?.next_open_at as string | undefined;

      if (bodyError) {
        const details = [bodyReason, nextOpenAt ? `Próxima abertura: ${nextOpenAt}` : null].filter(Boolean).join(' • ');
        throw new Error(details ? `${bodyError}: ${details}` : bodyError);
      }

      if (error) {
        const parsed = await parseFunctionInvokeError(error);
        throw new Error(parsed.message || 'Erro ao processar pedido');
      }

      return { id: (data as any).order.id as string, orderNumber: (data as any).orderNumber as number };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  };

  const handleSendOrder = async () => {
    setIsSubmitting(true);
    
    try {
      // Regular order flow - immediate orders only
      const order = await createOrderInDatabase();
      
      if (order) {
        setOrderCreated(order);
        toast.success(`Pedido #${order.orderNumber} criado com sucesso!`);
        
        trackingService.trackPurchase(
          order.id,
          items.map(item => ({
            product_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          totalPrice
        );
      }

      if (whatsapp) {
        try {
          const phone = whatsapp.replace(/\D/g, '');
          const message = buildWhatsAppMessage(order?.orderNumber);
          const url = `https://wa.me/55${phone}?text=${message}`;
          setLastWhatsAppUrl(url);
        } catch (whatsappError) {
          console.warn('Failed to build WhatsApp URL:', whatsappError);
          setLastWhatsAppUrl(null);
        }
      } else {
        setLastWhatsAppUrl(null);
      }

      clearCart();
      resetCheckoutState();

    } catch (error: any) {
      console.error('Error sending order:', error);
      const serverMessage = error?.message || error?.error || 'Erro ao criar pedido. Tente novamente.';
      toast.error(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetCheckoutState = () => {
    setCustomerName('');
    setCustomerPhoneInput('');
    setCustomerAddress('');
    setAddressNotes('');
    setPaymentMethod('pix');
    setChangeFor('');
    setReceiptType('entrega');
  };

  const handleAddProduct = async (product: Product) => {
    if (!companyId) {
      addItem(product);
      return;
    }

    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setPendingAddProduct(product);
      setOptionalsProduct(product);
      setOptionalsOpen(true);
      return;
    }

    addItem(product);
  };

  const handleIncreaseCartItem = async (cartItemId: string, product: Product) => {
    if (companyId) {
      const hasOptionals = await checkProduct(product.id);
      // Para produtos com opcionais (incluindo pizzas): sempre abrir modal para escolher
      // e adicionar um NOVO item no carrinho (não apenas incrementar quantidade)
      if (hasOptionals) {
        setPendingAddProduct(product);
        setOptionalsProduct(product);
        setOptionalsOpen(true);
        return;
      }
    }

    // Sem opcionais: pode incrementar direto
    const existing = items.find((i) => i.cartItemId === cartItemId);
    if (existing) updateQuantity(cartItemId, existing.quantity + 1);
  };

  const canProceedFromCart = items.length > 0 && canOrder;
  const canProceedFromReceiptType = true;
  // For delivery with neighborhood mode, require neighborhood selection
  const neighborhoodRequired = deliveryConfig?.mode === 'neighborhood' && neighborhoods.length > 0;
  const canProceedFromAddress = receiptType !== 'entrega' || (
    !!customerName.trim() && 
    !!customerAddress.trim() && 
    (!neighborhoodRequired || !!customerNeighborhood.trim())
  );
  const canProceedFromBalcao = !!customerName.trim();
  const canProceedFromPayment = !!paymentMethod && (paymentMethod !== 'dinheiro' || !changeFor || parseFloat(changeFor) >= totalWithDelivery);
  
  // Explain why cart button is disabled
  const getCartBlockReason = (): string | null => {
    if (items.length === 0) return 'Adicione itens ao carrinho';
    if (!canOrder) return 'Loja fechada no momento';
    return null;
  };
  
  // Explain why address button is disabled  
  const getAddressBlockReason = (): string | null => {
    if (receiptType !== 'entrega') return null;
    if (!customerName.trim()) return 'Preencha seu nome';
    if (!customerAddress.trim()) return 'Preencha o endereço';
    if (neighborhoodRequired && !customerNeighborhood.trim()) return 'Selecione o bairro';
    return null;
  };

  // QR Code mode: skip receipt_type and address steps, send order directly
  const isQRCodeMode = mode === 'qrcode';
  
  // Handle sending order for QR Code mode (no payment step)
  const handleSendQROrder = async () => {
    setIsSubmitting(true);
    
    try {
      const order = await createOrderInDatabase();
      
      if (order) {
        setOrderCreated(order);
        
        const locationLabel = qrTableNumber 
          ? `Mesa ${qrTableNumber}` 
          : qrComandaNumber 
            ? `Comanda ${qrComandaNumber}` 
            : '';
        
        toast.success(`Pedido #${order.orderNumber} enviado para ${locationLabel}!`);
        
        trackingService.trackPurchase(
          order.id,
          items.map(item => ({
            product_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          totalPrice
        );
      }

      clearCart();
    } catch (error) {
      console.error('Error sending QR order:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const goNext = () => {
    if (step === 'cart') {
      // QR Code mode: send order directly without payment step
      if (isQRCodeMode) {
        handleSendQROrder();
        return;
      }
      setStep('receipt_type');
    }
    else if (step === 'receipt_type') {
      if (receiptType === 'retirada' || receiptType === 'balcao') setStep('payment');
      else setStep('address');
    }
    else if (step === 'address') setStep('payment');
    else if (step === 'payment') setStep('confirm');
  };

  const goBack = () => {
    if (step === 'receipt_type') setStep('cart');
    else if (step === 'address') setStep('receipt_type');
    else if (step === 'payment') {
      if (receiptType === 'retirada' || receiptType === 'balcao') setStep('receipt_type');
      else setStep('address');
    }
    else if (step === 'confirm') setStep('payment');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Order confirmation screen
  if (orderCreated) {
    const locationLabel = qrTableNumber 
      ? `Mesa ${qrTableNumber}` 
      : qrComandaNumber 
        ? `Comanda ${qrComandaNumber}` 
        : '';
    
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col w-full sm:max-w-lg">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-green-100">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {isQRCodeMode ? 'Pedido Enviado!' : 'Pedido Confirmado!'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isQRCodeMode ? (
                <>
                  Pedido <strong>#{orderCreated.orderNumber}</strong> enviado para <strong>{locationLabel}</strong>.
                  <br />
                  <span className="text-sm">Você pode continuar fazendo pedidos.</span>
                </>
              ) : (
                <>Seu pedido <strong>#{orderCreated.orderNumber}</strong> foi criado com sucesso.</>
              )}
            </p>

            <div className="w-full max-w-sm space-y-2">
              {!isQRCodeMode && lastWhatsAppUrl && (
                <Button asChild className="w-full">
                  <a href={lastWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar pelo WhatsApp
                  </a>
                </Button>
              )}
              
              {!isQRCodeMode && !lastWhatsAppUrl && (
                <p className="text-sm text-muted-foreground">Aguarde o contato do estabelecimento.</p>
              )}

              <Button variant={isQRCodeMode ? "default" : "outline"} className="w-full" onClick={handleClose}>
                {isQRCodeMode ? 'Continuar Pedindo' : 'Fechar'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg p-0">
        {/* Header with step indicator */}
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {step === 'cart' && `Carrinho (${totalItems})`}
            {step === 'receipt_type' && 'Tipo de Recebimento'}
            {step === 'address' && 'Endereço de Entrega'}
            {step === 'payment' && 'Forma de Pagamento'}
            {step === 'confirm' && 'Confirmar Pedido'}
          </SheetTitle>
          
          {/* Progress indicator */}
          <div className="flex gap-1 mt-2">
            {['cart', 'receipt_type', 'address', 'payment', 'confirm'].map((s, i) => {
              const isActive = step === s;
              const isPast = ['cart', 'receipt_type', 'address', 'payment', 'confirm'].indexOf(step) > i;
              const isSkipped = 
                (s === 'address' && (receiptType === 'retirada' || receiptType === 'balcao')) ||
                (s === 'receipt_type' && isQRCodeMode) ||
                (s === 'address' && isQRCodeMode);
              
              if (isSkipped) return null;
              
              return (
                <div 
                  key={s}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    isActive ? 'bg-primary' : isPast ? 'bg-primary/50' : 'bg-muted'
                  )}
                />
              );
            })}
          </div>
        </SheetHeader>

        {/* STEP: Cart */}
        {step === 'cart' && (
          <>
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Seu carrinho está vazio</p>
                    <p className="text-sm">Adicione produtos para continuar</p>
                  </div>
                </div>
                
                {allProducts.length > 0 && (
                  <div className="pb-4">
                    <SalesSuggestions
                      allProducts={allProducts}
                      customerPhone={customerPhone}
                      lastOrderItems={lastOrderItems}
                      isVipCustomer={isVipCustomer}
                      onAddProduct={(p) => void handleAddProduct(p)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-3 py-4">
                    {items.map((item) => (
                      <div key={item.cartItemId} className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.price)} cada
                              {item.isPizza && item.pizzaData?.optionals_total && item.pizzaData.optionals_total > 0 && (
                                <> + {formatCurrency(item.pizzaData.optionals_total)} adicionais</>
                              )}
                            </p>
                            {/* Pizza details */}
                            {item.isPizza && item.pizzaData && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="capitalize">{item.pizzaData.size}</span>
                                {item.pizzaData.selected_flavors.length > 0 && (
                                  <> • {item.pizzaData.selected_flavors.map(f => f.name).join(' / ')}</>
                                )}
                                {/* Show removed ingredients per flavor */}
                                {item.pizzaData.selected_flavors.some(f => f.removedIngredients?.length > 0) && (
                                  <div className="mt-0.5 text-destructive">
                                    {item.pizzaData.selected_flavors
                                      .filter(f => f.removedIngredients?.length > 0)
                                      .map(f => (
                                        <span key={f.id} className="block">
                                          Sem: {f.removedIngredients.join(', ')} ({f.name})
                                        </span>
                                      ))
                                    }
                                  </div>
                                )}
                                {item.pizzaData.selected_optionals.length > 0 && (
                                  <div className="mt-0.5">
                                    + {item.pizzaData.selected_optionals.map(o => 
                                      o.target_scope === 'whole_pizza' 
                                        ? o.item_label 
                                        : `${o.item_label} (${item.pizzaData?.selected_flavors.find(f => f.id === o.target_scope)?.name || 'parte'})`
                                    ).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => void handleIncreaseCartItem(item.cartItemId, { id: item.id, name: item.name, price: item.price } as any)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeItem(item.cartItemId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-bold text-sm w-20 text-right">
                            {formatCurrency((item.price + (item.pizzaData?.optionals_total || 0)) * item.quantity)}
                          </p>
                        </div>
                        {/* Observação do item */}
                        {editingItemNotes === item.cartItemId ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ex: sem cebola, bem passado..."
                              value={item.notes || ''}
                              onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                              className="h-8 text-xs"
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8"
                              onClick={() => setEditingItemNotes(null)}
                            >
                              OK
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingItemNotes(item.cartItemId)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                          >
                            <MessageSquare className="h-3 w-3" />
                            {item.notes ? (
                              <span className="text-primary">{item.notes}</span>
                            ) : (
                              <span>Adicionar observação</span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {allProducts.length > 0 && (
                    <div className="pb-4">
                      <SalesSuggestions
                        allProducts={allProducts}
                        customerPhone={customerPhone}
                        lastOrderItems={lastOrderItems}
                        isVipCustomer={isVipCustomer}
                        onAddProduct={handleAddProduct}
                      />
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t space-y-3">
                  {/* Coupon input */}
                  {companyId && (
                    <div className="space-y-2">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Ticket className="h-4 w-4" />
                            <span className="text-sm font-medium">{appliedCoupon.coupon.code}</span>
                            <span className="text-sm">(-{formatCurrency(appliedCoupon.discount)})</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={handleRemoveCoupon}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Código do cupom"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || validateCoupon.isPending}
                          >
                            {validateCoupon.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Aplicar'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wheel reward banner with use/save option */}
                  {wheelReward && wheelDiscount > 0 && (
                    <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                        <Gift className="h-5 w-5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">🎁 Prêmio da Roleta Disponível!</p>
                          <p className="text-xs">{wheelReward.prizeName || `${wheelReward.rewardValue}% de desconto`}</p>
                        </div>
                        {useWheelReward && <span className="font-bold text-green-600">-{formatCurrency(wheelDiscount)}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={useWheelReward ? "default" : "outline"}
                          className={cn("flex-1 h-8", useWheelReward && "bg-green-600 hover:bg-green-700")}
                          onClick={() => setUseWheelReward(true)}
                        >
                          ✅ Usar agora
                        </Button>
                        <Button
                          size="sm"
                          variant={!useWheelReward ? "default" : "outline"}
                          className="flex-1 h-8"
                          onClick={() => setUseWheelReward(false)}
                        >
                          💾 Guardar
                        </Button>
                      </div>
                      {!useWheelReward && (
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Seu prêmio ficará salvo para o próximo pedido
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>Desconto cupom</span>
                      <span>-{formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  
                  {effectiveWheelDiscount > 0 && (
                    <div className="flex justify-between items-center text-yellow-600">
                      <span>Prêmio roleta</span>
                      <span>-{formatCurrency(effectiveWheelDiscount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalPrice - couponDiscount - effectiveWheelDiscount)}</span>
                  </div>
                  
                  {/* Show block reason if any */}
                  {getCartBlockReason() && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getCartBlockReason()}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { clearCart(); setAppliedCoupon(null); setWheelReward(null); setWheelDiscount(0); handleClose(); }}>
                      Limpar
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={goNext} 
                      disabled={!canProceedFromCart || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Enviando...
                        </>
                      ) : isQRCodeMode ? (
                        <>
                          Enviar Pedido
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Continuar
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Modal de opcionais: precisa existir mesmo com carrinho cheio */}
            {companyId && optionalsProduct && (
              <PublicProductOptionalsDialog
                open={optionalsOpen}
                onOpenChange={(open) => {
                  setOptionalsOpen(open);
                  if (!open) {
                    setOptionalsProduct(null);
                    setPendingAddProduct(null);
                  }
                }}
                product={optionalsProduct}
                companyId={companyId}
                onConfirm={(selectedOptions: SelectedOption[], _totalPrice: number, _desc: string) => {
                  if (!pendingAddProduct) return;
                  addItem(pendingAddProduct, selectedOptions);
                  toast.success(`${pendingAddProduct.name} adicionado`);
                  setOptionalsOpen(false);
                }}
              />
            )}
          </>
        )}

        {/* STEP: Receipt Type */}
        {step === 'receipt_type' && (
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                <div>
                  <p className="text-muted-foreground mb-4">Como deseja receber seu pedido?</p>
                  
                  <RadioGroup value={receiptType} onValueChange={(v) => setReceiptType(v as ReceiptType)} className="space-y-3">
                    <label 
                      className={cn(
                        'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all',
                        receiptType === 'balcao' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="balcao" id="balcao" />
                      <Store className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Consumir no local</p>
                        <p className="text-sm text-muted-foreground">Ficar no estabelecimento</p>
                      </div>
                    </label>

                    <label 
                      className={cn(
                        'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all',
                        receiptType === 'retirada' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="retirada" id="retirada" />
                      <Store className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Retirar no local</p>
                        <p className="text-sm text-muted-foreground">Buscar pessoalmente</p>
                      </div>
                    </label>
                    
                    <label 
                      className={cn(
                        'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all',
                        receiptType === 'entrega' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="entrega" id="entrega" />
                      <Truck className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Entrega</p>
                        <p className="text-sm text-muted-foreground">Receber em casa</p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              </div>
            </ScrollArea>
            
            <SheetFooter className="p-4 border-t gap-2">
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button className="flex-1" onClick={goNext}>
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </SheetFooter>
          </>
        )}

        {/* STEP: Address */}
        {step === 'address' && (
          <AddressStep
            companyId={companyId}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhoneInput={customerPhoneInput}
            setCustomerPhoneInput={setCustomerPhoneInput}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            customerNeighborhood={customerNeighborhood}
            setCustomerNeighborhood={setCustomerNeighborhood}
            customerCity={customerCity}
            setCustomerCity={setCustomerCity}
            customerCep={customerCep}
            setCustomerCep={setCustomerCep}
            customerLatitude={customerLatitude}
            setCustomerLatitude={setCustomerLatitude}
            customerLongitude={customerLongitude}
            setCustomerLongitude={setCustomerLongitude}
            addressNotes={addressNotes}
            setAddressNotes={setAddressNotes}
            deliveryConfig={deliveryConfig}
            neighborhoods={neighborhoods}
            effectiveDeliveryFee={effectiveDeliveryFee}
            deliveryFeeResult={deliveryFeeResult}
            canProceedFromAddress={canProceedFromAddress}
            getAddressBlockReason={getAddressBlockReason}
            goBack={goBack}
            goNext={goNext}
            formatCurrency={formatCurrency}
          />
        )}

        {/* STEP: Payment */}
        {step === 'payment' && (
          <>
            <div className="flex-1 p-4 space-y-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Forma de pagamento</span>
              </div>

              {/* If retirada or balcao, ask for name and phone here */}
              {(receiptType === 'retirada' || receiptType === 'balcao') && (
                <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name-pickup">Seu nome *</Label>
                    <Input
                      id="customer-name-pickup"
                      placeholder="Digite seu nome"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone-pickup">WhatsApp</Label>
                    <Input
                      id="customer-phone-pickup"
                      placeholder="(00) 00000-0000"
                      value={customerPhoneInput}
                      onChange={(e) => setCustomerPhoneInput(e.target.value)}
                    />
                  </div>
                  {receiptType === 'balcao' && (
                    <div className="space-y-2">
                      <Label htmlFor="table-number">Número da mesa (opcional)</Label>
                      <Input
                        id="table-number"
                        placeholder="Ex: 5"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Informe a mesa onde você vai sentar</p>
                    </div>
                  )}
                </div>
              )}
              
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <label 
                    key={method.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all',
                      paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <RadioGroupItem value={method.id} id={method.id} />
                    <span className="text-xl">{method.icon}</span>
                    <span className="font-medium">{method.label}</span>
                  </label>
                ))}
              </RadioGroup>

              {paymentMethod === 'dinheiro' && (
                <div className="space-y-2 mt-4 p-3 bg-muted/50 rounded-lg">
                  <Label htmlFor="change-for">Troco para quanto? (opcional)</Label>
                  <Input
                    id="change-for"
                    type="number"
                    placeholder="Ex: 50"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                  />
                  {changeFor && parseFloat(changeFor) < totalWithDelivery && (
                    <p className="text-xs text-destructive">O valor deve ser maior que o total ({formatCurrency(totalWithDelivery)})</p>
                  )}
                </div>
              )}
            </div>
            
            <SheetFooter className="p-4 border-t gap-2">
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button 
                className="flex-1" 
                onClick={goNext} 
                disabled={!canProceedFromPayment || ((receiptType === 'retirada' || receiptType === 'balcao') && !customerName.trim())}
              >
                Revisar Pedido
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </SheetFooter>
          </>
        )}

        {/* STEP: Confirm */}
        {step === 'confirm' && (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-4">
                {/* Summary */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Resumo do Pedido</h3>
                  
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium flex items-center gap-1">
                        {receiptType === 'entrega' ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                        {receiptType === 'retirada' && 'Retirar no local'}
                        {receiptType === 'entrega' && 'Entrega'}
                        {receiptType === 'balcao' && 'Consumir no local'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{customerName || '-'}</span>
                    </div>

                    {customerPhoneInput && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">WhatsApp:</span>
                        <span className="font-medium">{customerPhoneInput}</span>
                      </div>
                    )}

                    {receiptType === 'balcao' && tableNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mesa:</span>
                        <span className="font-medium">{tableNumber}</span>
                      </div>
                    )}
                    
                    {receiptType === 'entrega' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Endereço:</span>
                          <span className="font-medium text-right max-w-[60%]">{customerAddress || '-'}</span>
                        </div>
                        {customerNeighborhood && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bairro:</span>
                            <span className="font-medium">{customerNeighborhood}</span>
                          </div>
                        )}
                        {effectiveDeliveryFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Taxa de entrega:</span>
                            <span className="font-medium text-primary">{formatCurrency(effectiveDeliveryFee)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pagamento:</span>
                      <span className="font-medium">
                        {PAYMENT_METHODS.find(p => p.id === paymentMethod)?.label}
                        {paymentMethod === 'dinheiro' && changeFor && ` (troco p/ R$${changeFor})`}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">Itens ({totalItems})</h3>
                  {items.map((item) => (
                    <div key={item.cartItemId} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                  <div className="space-y-1">
                    {receiptType === 'entrega' && effectiveDeliveryFee > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>{formatCurrency(totalPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Taxa de entrega</span>
                          <span>{formatCurrency(effectiveDeliveryFee)}</span>
                        </div>
                      </>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto ({appliedCoupon?.coupon.code})</span>
                        <span>-{formatCurrency(couponDiscount)}</span>
                      </div>
                    )}
                    {wheelDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Prêmio roleta</span>
                        <span>-{formatCurrency(wheelDiscount)}</span>
                      </div>
                    )}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(totalWithDelivery)}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <SheetFooter className="p-4 border-t gap-2">
              <Button variant="outline" onClick={goBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSendOrder} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Enviando...' : 'Finalizar Pedido'}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
