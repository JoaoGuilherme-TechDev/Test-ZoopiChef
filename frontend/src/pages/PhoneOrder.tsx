import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePhoneOrder, PhoneOrderStep, PhoneOrderItem } from '@/hooks/usePhoneOrder';
import { useDeliveryConfig, calculateDeliveryFee } from '@/hooks/useDeliveryConfig';
import { useCompany } from '@/hooks/useCompany';
import { useCustomers } from '@/hooks/useCustomers';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCustomerAddresses, fetchAddressByCep, CustomerAddress } from '@/hooks/useCustomerAddresses';
import { useCheckProductHasOptionals } from '@/hooks/useProductOptionalGroups';
import { useCustomerLookup } from '@/hooks/useCustomerLookup';
import { usePublicCustomerReward } from '@/hooks/useCustomerRewards';
import { useGenerateProductTickets, useOrderTickets, TicketRecord } from '@/hooks/useProductTickets';
import { ProductOptionalsDialog } from '@/components/orders/ProductOptionalsDialog';
import { CustomerGreetingBanner } from '@/components/orders/CustomerGreetingBanner';
import { usePDVKeyboardShortcuts } from '@/hooks/usePDVKeyboardShortcuts';
import { printProductTickets, ProductTicketData } from '@/lib/print/productTicketPrint';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Phone, User, MapPin, ShoppingBag, CreditCard, CheckCircle2,
  Search, Plus, Minus, Trash2, Truck, Store, UtensilsCrossed, LayoutGrid,
  ChevronRight, ChevronLeft, Loader2, AlertTriangle, Banknote, Smartphone, CreditCard as CardIcon, Link, Keyboard, Gift, Ticket, Printer
} from 'lucide-react';

const STEP_ICONS: Record<PhoneOrderStep, React.ReactNode> = {
  customer: <User className="w-5 h-5" />,
  receipt: <Truck className="w-5 h-5" />,
  address: <MapPin className="w-5 h-5" />,
  products: <ShoppingBag className="w-5 h-5" />,
  payment: <CreditCard className="w-5 h-5" />,
  confirmation: <CheckCircle2 className="w-5 h-5" />,
};

const STEP_LABELS: Record<PhoneOrderStep, string> = {
  customer: 'Cliente',
  receipt: 'Recebimento',
  address: 'Endereço',
  products: 'Produtos',
  payment: 'Pagamento',
  confirmation: 'Confirmação',
};

const RECEIPT_ICONS: Record<string, React.ReactNode> = {
  delivery: <Truck className="w-6 h-6" />,
  pickup: <Store className="w-6 h-6" />,
  dine_in: <UtensilsCrossed className="w-6 h-6" />,
  table: <LayoutGrid className="w-6 h-6" />,
  counter: <User className="w-6 h-6" />,
};

const PAYMENT_OPTIONS = [
  { code: 'money', label: 'Dinheiro', icon: <Banknote className="w-5 h-5" /> },
  { code: 'pix', label: 'Pix', icon: <Smartphone className="w-5 h-5" /> },
  { code: 'credit', label: 'Crédito', icon: <CardIcon className="w-5 h-5" /> },
  { code: 'debit', label: 'Débito', icon: <CardIcon className="w-5 h-5" /> },
  { code: 'link', label: 'Link', icon: <Link className="w-5 h-5" /> },
];

export default function PhoneOrder() {
  const phoneOrder = usePhoneOrder();
  const { config, neighborhoods, ranges, receiptTypes, isLoading: configLoading } = useDeliveryConfig();
  const { data: company } = useCompany();
  const { customers = [] } = useCustomers();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { data: products = [] } = useProducts();
  const { addresses, addAddress } = useCustomerAddresses(phoneOrder.orderData.customer?.id);
  const generateTickets = useGenerateProductTickets();
  const [generatedTickets, setGeneratedTickets] = useState<TicketRecord[]>([]);

  // Auto-fetch customer reward (desconto roleta) quando cliente está identificado
  const customerWhatsapp = phoneOrder.orderData.customer?.whatsapp;
  const { reward: customerReward, isLoading: rewardLoading } = usePublicCustomerReward(
    company?.id, 
    customerWhatsapp
  );

  // Customer search with auto-lookup
  const [phoneSearch, setPhoneSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', whatsapp: '', alerts: '' });
  const [showGreeting, setShowGreeting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const productSearchRef = useRef<HTMLInputElement>(null);

  // Customer lookup by phone - auto fills when found
  const customerLookup = useCustomerLookup({
    showToast: true,
    onCustomerFound: (foundCustomer) => {
      phoneOrder.updateOrderData({
        customer: {
          id: foundCustomer.id,
          name: foundCustomer.name,
          whatsapp: foundCustomer.whatsapp,
          alerts: foundCustomer.internal_notes || undefined,
          isNew: false,
        }
      });
      setShowNewCustomer(false);
      // Mostrar saudação personalizada quando cliente é reconhecido
      setShowGreeting(true);
    }
  });

  // Keyboard shortcuts
  usePDVKeyboardShortcuts({
    onSearch: () => productSearchRef.current?.focus(),
    onFinalize: () => {
      if (phoneOrder.step === 'payment') {
        // Usar nextStep para avançar para confirmação
        phoneOrder.nextStep();
      }
    },
    onCancel: () => {
      if (showGreeting) setShowGreeting(false);
    },
    onNewSale: () => phoneOrder.reset(),
  }, true);

  // Address form
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: 'SP', reference: ''
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [deliveryFeeResult, setDeliveryFeeResult] = useState<ReturnType<typeof calculateDeliveryFee> | null>(null);
  const [manualFeeMode, setManualFeeMode] = useState(false);
  const [manualFee, setManualFee] = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Optionals dialog
  const { checkProduct } = useCheckProductHasOptionals();
  const [optionalsDialogOpen, setOptionalsDialogOpen] = useState(false);
  const [selectedProductForOptionals, setSelectedProductForOptionals] = useState<Product | null>(null);

  // Filter customers by phone (also use phone field)
  const normalizedSearch = phoneSearch.replace(/\D/g, '');
  const filteredCustomers = normalizedSearch.length >= 3
    ? customers.filter(c => 
        c.whatsapp.includes(normalizedSearch) || 
        (c.phone && c.phone.includes(normalizedSearch))
      )
    : [];

  // Handle phone search change - trigger auto-lookup
  const handlePhoneSearchChange = (value: string) => {
    setPhoneSearch(value);
    customerLookup.searchWithDebounce(value, 600);
  };

  // Filter products - busca por nome, código interno ou EAN
  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    const matchesCategory = !selectedCategory || subcategories.find(s => s.id === p.subcategory_id)?.category_id === selectedCategory;
    if (!matchesCategory) return false;
    
    if (productSearch === '') return true;
    const term = productSearch.toLowerCase();
    const matchesName = p.name.toLowerCase().includes(term);
    const matchesCode = p.internal_code?.toLowerCase().includes(term);
    const matchesEan = p.ean_code?.includes(term);
    return matchesName || matchesCode || matchesEan;
  });

  // Handle CEP lookup
  const handleCepBlur = async () => {
    if (addressForm.cep.length >= 8) {
      setLoadingCep(true);
      const data = await fetchAddressByCep(addressForm.cep);
      setLoadingCep(false);
      if (data) {
        setAddressForm(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
      }
    }
  };

  // Calculate delivery fee when neighborhood changes
  useEffect(() => {
    if (phoneOrder.orderData.receipt_type === 'delivery' && addressForm.neighborhood) {
      const result = calculateDeliveryFee(config, neighborhoods, ranges, addressForm.neighborhood, addressForm.city);
      setDeliveryFeeResult(result);
      if (result.isServiced) {
        phoneOrder.updateOrderData({ delivery_fee: result.fee });
      }
    }
  }, [addressForm.neighborhood, addressForm.city, config, neighborhoods, ranges]);

  // When pickup is selected, save store address
  useEffect(() => {
    if (phoneOrder.orderData.receipt_type === 'pickup' && company?.address) {
      phoneOrder.updateOrderData({ 
        store_address: company.address,
        delivery_fee: 0  // No delivery fee for pickup
      });
    } else if (phoneOrder.orderData.receipt_type !== 'pickup') {
      phoneOrder.updateOrderData({ store_address: undefined });
    }
  }, [phoneOrder.orderData.receipt_type, company?.address]);

  // Generate tickets when order is confirmed
  useEffect(() => {
    if (phoneOrder.step === 'confirmation' && phoneOrder.createOrder.data && generatedTickets.length === 0) {
      const order = phoneOrder.createOrder.data as any;
      const ticketEnabled = (company as any)?.ticket_system_enabled;
      if (!ticketEnabled) return;

      // We need the order items - use the orderData items since they match
      const orderItems = (phoneOrder.orderData.items || []).map((item, idx) => ({
        id: `item-${idx}-${Date.now()}`, // temp ID, will be replaced by DB
        product_name: item.product_name,
        quantity: item.quantity,
      }));

      // Fetch actual order items from DB to get real IDs
      (async () => {
        try {
          const { data: dbItems } = await import('@/integrations/supabase/client').then(m => 
            (m.supabase as any).from('order_items').select('id, product_name, quantity').eq('order_id', order.id)
          );
          
          if (dbItems && dbItems.length > 0) {
            const tickets = await generateTickets.mutateAsync({
              orderId: order.id,
              orderItems: dbItems,
              customerName: phoneOrder.orderData.customer?.name,
              attendantName: undefined,
            });
            setGeneratedTickets(tickets);
          }
        } catch (e) {
          console.error('Erro ao gerar tickets:', e);
        }
      })();
    }
  }, [phoneOrder.step, phoneOrder.createOrder.data, company]);

  // Select customer
  const selectCustomer = (customer: typeof customers[0]) => {
    phoneOrder.updateOrderData({
      customer: {
        id: customer.id,
        name: customer.name,
        whatsapp: customer.whatsapp,
        alerts: customer.alerts || undefined,
        isNew: false,
      }
    });
    setPhoneSearch('');
    setShowNewCustomer(false);
  };

  // Create new customer
  const handleNewCustomer = () => {
    // Para balcão, nome e telefone são opcionais
    // Se não preencheu nada, pode avançar sem cliente
    const hasData = newCustomer.name || newCustomer.whatsapp;
    phoneOrder.updateOrderData({
      customer: {
        name: newCustomer.name,
        whatsapp: newCustomer.whatsapp.replace(/\D/g, ''),
        alerts: newCustomer.alerts,
        isNew: true,
      }
    });
    setShowNewCustomer(false);
  };

  // Select address
  const selectAddress = (addr: CustomerAddress) => {
    phoneOrder.updateOrderData({ delivery_address: addr });
    const result = calculateDeliveryFee(config, neighborhoods, ranges, addr.neighborhood, addr.city);
    setDeliveryFeeResult(result);
    if (result.isServiced) {
      phoneOrder.updateOrderData({ delivery_fee: result.fee });
    }
  };

  // Save new address (with manual fee fallback)
  const handleSaveAddress = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.neighborhood) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    // Check if we need manual fee mode and it's not filled
    if (manualFeeMode) {
      const fee = parseFloat(manualFee.replace(',', '.'));
      if (isNaN(fee) || fee < 0) {
        toast.error('Digite uma taxa de entrega válida');
        return;
      }
      phoneOrder.updateOrderData({ delivery_fee: fee });
    } else if (!deliveryFeeResult?.isServiced) {
      toast.error('Configure a taxa de entrega');
      return;
    }
    
    // For new customers, save temp address
    if (phoneOrder.orderData.customer?.isNew) {
      phoneOrder.updateOrderData({
        delivery_address: {
          id: 'temp-' + Date.now(),
          street: addressForm.street,
          number: addressForm.number,
          complement: addressForm.complement,
          neighborhood: addressForm.neighborhood,
          city: addressForm.city,
          state: addressForm.state,
          cep: addressForm.cep,
          reference: addressForm.reference,
          label: null,
          is_default: false,
        } as any,
        delivery_fee: manualFeeMode ? parseFloat(manualFee.replace(',', '.')) : deliveryFeeResult?.fee,
      });
      setShowNewAddress(false);
      setManualFeeMode(false);
      return;
    }
    
    if (!phoneOrder.orderData.customer?.id) {
      toast.error('Selecione um cliente primeiro');
      return;
    }
    
    const newAddr = await addAddress.mutateAsync({
      customer_id: phoneOrder.orderData.customer.id,
      ...addressForm,
      label: null,
      latitude: null,
      longitude: null,
      is_default: false,
    });
    
    selectAddress(newAddr);
    setShowNewAddress(false);
    setManualFeeMode(false);
  };
  
  // Enable manual fee mode
  const handleEnableManualFee = () => {
    setManualFeeMode(true);
    setManualFee('');
  };

  // Add product to cart - check for optionals first
  const handleAddProduct = async (product: Product) => {
    const hasOptionals = await checkProduct(product.id);
    
    if (hasOptionals) {
      setSelectedProductForOptionals(product);
      setOptionalsDialogOpen(true);
    } else {
      phoneOrder.addItem({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
      });
    }
  };

  // Handle confirm from optionals dialog
  const handleConfirmOptionals = (
    selectedOptionals: Array<{ groupId: string; groupName: string; items: Array<{ id: string; label: string; price: number }> }>,
    totalPrice: number,
    _optionalsDescription: string // We don't use this anymore - data comes from structured options
  ) => {
    if (!selectedProductForOptionals) return;

    // Use clean product name - optionals will be shown from structured data in print
    const productName = selectedProductForOptionals.name;

    // Build selected_options_json structure for proper printing
    const selectedOptionsJson = {
      selected_options: selectedOptionals.map(g => ({
        group_id: g.groupId,
        group_name: g.groupName,
        items: g.items.map(i => ({
          id: i.id,
          label: i.label,
          price: i.price,
        })),
      })),
    };

    phoneOrder.addItem({
      product_id: selectedProductForOptionals.id,
      product_name: productName,
      quantity: 1,
      unit_price: totalPrice,
      notes: null, // Don't store description as notes - use structured data
      selected_options_json: selectedOptionsJson,
    } as any);

    setSelectedProductForOptionals(null);
  };

  // Render step content
  const renderStepContent = () => {
    switch (phoneOrder.step) {
      case 'customer':
        return (
          <div className="space-y-6">
            {/* Mostrar campo de busca APENAS se não tiver cliente identificado */}
            {!phoneOrder.orderData.customer && (
              <>
                <div>
                  <Label>Telefone do Cliente</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="(11) 99999-9999"
                      value={phoneSearch}
                      onChange={(e) => handlePhoneSearchChange(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                    {customerLookup.isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {filteredCustomers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Clientes encontrados</Label>
                    {filteredCustomers.map(c => (
                      <Card key={c.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => selectCustomer(c)}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-sm text-muted-foreground">{c.whatsapp}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {phoneOrder.orderData.customer && (
              <>
                {/* Saudação personalizada */}
                {showGreeting && phoneOrder.orderData.customer.id && (
                  <CustomerGreetingBanner
                    customer={{
                      id: phoneOrder.orderData.customer.id,
                      name: phoneOrder.orderData.customer.name || 'Cliente',
                    }}
                    onDismiss={() => setShowGreeting(false)}
                  />
                )}

                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{phoneOrder.orderData.customer.name}</p>
                      <p className="text-sm text-muted-foreground">{phoneOrder.orderData.customer.whatsapp}</p>
                      {phoneOrder.orderData.customer.alerts && (
                        <Badge variant="outline" className="mt-1 text-warning border-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {phoneOrder.orderData.customer.alerts}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      phoneOrder.updateOrderData({ customer: undefined });
                      setShowGreeting(false);
                    }}>
                      Trocar
                    </Button>
                  </CardContent>
                </Card>

                {/* Desconto da roleta disponível - busca automática pelo whatsapp do cliente */}
                {rewardLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando descontos disponíveis...
                  </div>
                )}
                
                {customerReward && !rewardLoading && (
                  <Card className="border-green-500 bg-green-500/10">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-green-700 dark:text-green-400">
                          🎉 Desconto disponível!
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {customerReward.reward_type === 'percentage' 
                            ? `${customerReward.reward_value}% de desconto`
                            : `R$ ${(customerReward.reward_value / 100).toFixed(2)} de desconto`}
                          {customerReward.prize_name && ` - ${customerReward.prize_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Será aplicado automaticamente no pagamento
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {!phoneOrder.orderData.customer && (
              <>
                <Separator />
                <Button variant="outline" className="w-full" onClick={() => setShowNewCustomer(!showNewCustomer)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>

                {showNewCustomer && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label>Nome (opcional)</Label>
                        <Input value={newCustomer.name} onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>WhatsApp (opcional)</Label>
                        <Input value={newCustomer.whatsapp} onChange={(e) => setNewCustomer(p => ({ ...p, whatsapp: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Observações (alergias, etc)</Label>
                        <Textarea value={newCustomer.alerts} onChange={(e) => setNewCustomer(p => ({ ...p, alerts: e.target.value }))} />
                      </div>
                      <Button onClick={handleNewCustomer} className="w-full">Confirmar Cliente</Button>
                    </CardContent>
                  </Card>
                )}

                <Separator />
                <Button 
                  variant="outline" 
                  className="w-full border-dashed border-2"
                  onClick={() => {
                    phoneOrder.updateOrderData({ receipt_type: 'counter' });
                    phoneOrder.nextStep();
                  }}
                >
                  <Store className="w-4 h-4 mr-2" />
                  Continuar sem cliente (balcão)
                </Button>
              </>
            )}
          </div>
        );

      case 'receipt':
        // Default options if no receipt types configured
        const defaultReceiptOptions = [
          { id: 'default-delivery', code: 'delivery', name: 'Entrega' },
          { id: 'default-pickup', code: 'pickup', name: 'Retirada' },
          { id: 'default-counter', code: 'counter', name: 'Balcão' },
        ];
        const availableReceiptTypes = receiptTypes.length > 0 ? receiptTypes : defaultReceiptOptions;
        
        return (
          <div className="space-y-6">
            <Label>Forma de Recebimento</Label>
            <div className="grid grid-cols-2 gap-3">
              {availableReceiptTypes.map(rt => (
                <Card
                  key={rt.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    phoneOrder.orderData.receipt_type === rt.code && 'ring-2 ring-primary bg-primary/5'
                  )}
                  onClick={() => phoneOrder.updateOrderData({ receipt_type: rt.code })}
                >
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-muted flex items-center justify-center mb-2">
                      {RECEIPT_ICONS[rt.code] || <ShoppingBag className="w-6 h-6" />}
                    </div>
                    <p className="font-medium">{rt.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {phoneOrder.orderData.receipt_type === 'pickup' && company?.address && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço para retirada</p>
                      <p className="font-medium">{company.address}</p>
                      <p className="text-xs text-success mt-1">Este endereço será enviado ao cliente via WhatsApp</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {phoneOrder.orderData.receipt_type === 'table' && (
              <div>
                <Label>Número da Mesa</Label>
                <Input
                  placeholder="Ex: 5"
                  value={phoneOrder.orderData.table_number || ''}
                  onChange={(e) => phoneOrder.updateOrderData({ table_number: e.target.value })}
                />
              </div>
            )}

            {/* Counter (Balcão) option - eat here or take away */}
            {phoneOrder.orderData.receipt_type === 'counter' && (
              <Card className="border-muted">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Pedido Balcão</p>
                      <p className="text-sm text-muted-foreground">Apenas nome e telefone necessários</p>
                    </div>
                  </div>

                  {/* Eat here or take away selection */}
                  <div>
                    <Label className="mb-2 block">O cliente vai...</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          !phoneOrder.orderData.eat_here && 'ring-2 ring-amber-500 bg-amber-500/10'
                        )}
                        onClick={() => phoneOrder.updateOrderData({ eat_here: false })}
                      >
                        <CardContent className="p-4 text-center">
                          <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                          <p className="font-bold text-amber-700">LEVAR</p>
                        </CardContent>
                      </Card>
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          phoneOrder.orderData.eat_here && 'ring-2 ring-orange-600 bg-orange-600/10'
                        )}
                        onClick={() => phoneOrder.updateOrderData({ eat_here: true })}
                      >
                        <CardContent className="p-4 text-center">
                          <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                          <p className="font-bold text-orange-700">COMER AQUI</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <Label>Número da Mesa (opcional)</Label>
                    <Input
                      placeholder="Ex: 5 (apenas para referência)"
                      value={phoneOrder.orderData.table_number || ''}
                      onChange={(e) => phoneOrder.updateOrderData({ table_number: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas para saber onde o cliente está sentado, sem controle de mesa
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'address':
        return (
          <div className="space-y-6">
            {addresses.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Endereços salvos</Label>
                {addresses.map(addr => {
                  const fee = calculateDeliveryFee(config, neighborhoods, ranges, addr.neighborhood, addr.city);
                  return (
                    <Card
                      key={addr.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        phoneOrder.orderData.delivery_address?.id === addr.id && 'ring-2 ring-primary bg-primary/5'
                      )}
                      onClick={() => selectAddress(addr)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{addr.street}, {addr.number}</p>
                            <p className="text-sm text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                          </div>
                          <div className="text-right">
                            {fee.isServiced ? (
                              <>
                                <p className="font-medium text-success">R$ {fee.fee.toFixed(2)}</p>
                                {fee.estimatedMinutes && (
                                  <p className="text-xs text-muted-foreground">{fee.estimatedMinutes} min</p>
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive">Não atendido</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setShowNewAddress(!showNewAddress)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Endereço
            </Button>

            {showNewAddress && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input
                          value={addressForm.cep}
                          onChange={(e) => setAddressForm(p => ({ ...p, cep: e.target.value }))}
                          onBlur={handleCepBlur}
                          placeholder="00000-000"
                        />
                        {loadingCep && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label>Rua *</Label>
                      <Input value={addressForm.street} onChange={(e) => setAddressForm(p => ({ ...p, street: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Número *</Label>
                      <Input value={addressForm.number} onChange={(e) => setAddressForm(p => ({ ...p, number: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Complemento</Label>
                      <Input value={addressForm.complement} onChange={(e) => setAddressForm(p => ({ ...p, complement: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Bairro *</Label>
                      <Input value={addressForm.neighborhood} onChange={(e) => setAddressForm(p => ({ ...p, neighborhood: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cidade</Label>
                      <Input value={addressForm.city} onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Referência</Label>
                      <Input value={addressForm.reference} onChange={(e) => setAddressForm(p => ({ ...p, reference: e.target.value }))} />
                    </div>
                  </div>

                  {/* Show manual option when no config exists */}
                  {!deliveryFeeResult && !manualFeeMode && addressForm.neighborhood && (
                    <Card className="border-2 border-warning bg-warning/5">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="w-5 h-5" />
                          <span>Configuração de entrega não encontrada</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={handleEnableManualFee}
                        >
                          Digitar taxa manualmente
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Delivery fee result or manual mode */}
                  {deliveryFeeResult && !manualFeeMode && (
                    <Card className={cn(
                      'border-2',
                      deliveryFeeResult.isServiced ? 'border-success bg-success/5' : 'border-warning bg-warning/5'
                    )}>
                      <CardContent className="p-3">
                        {deliveryFeeResult.isServiced ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-success" />
                              <span>Área atendida</span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">Taxa: R$ {deliveryFeeResult.fee.toFixed(2)}</p>
                              {deliveryFeeResult.estimatedMinutes && (
                                <p className="text-sm text-muted-foreground">{deliveryFeeResult.estimatedMinutes} min</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-warning">
                              <AlertTriangle className="w-5 h-5" />
                              <span>{deliveryFeeResult.message || 'Configuração de entrega não encontrada'}</span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={handleEnableManualFee}
                            >
                              Digitar taxa manualmente
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Manual fee input */}
                  {manualFeeMode && (
                    <Card className="border-2 border-primary bg-primary/5">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Taxa de Entrega Manual</Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setManualFeeMode(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">R$</span>
                          <Input
                            type="text"
                            placeholder="0,00"
                            value={manualFee}
                            onChange={(e) => setManualFee(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Digite a taxa de entrega negociada com o cliente
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Button 
                    onClick={handleSaveAddress} 
                    disabled={!manualFeeMode && !deliveryFeeResult?.isServiced}
                    className="w-full"
                  >
                    Confirmar Endereço
                  </Button>
                </CardContent>
              </Card>
            )}

            {phoneOrder.orderData.delivery_address && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{phoneOrder.orderData.delivery_address.street}, {phoneOrder.orderData.delivery_address.number}</p>
                      <p className="text-sm text-muted-foreground">{phoneOrder.orderData.delivery_address.neighborhood}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-success">R$ {phoneOrder.orderData.delivery_fee?.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'products':
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={productSearchRef}
                placeholder="Buscar por nome, código ou EAN... (F2)"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <ScrollArea className="h-12">
              <div className="flex gap-2">
                <Badge
                  variant={!selectedCategory ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todos
                </Badge>
                {categories.filter(c => c.active).map(cat => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </ScrollArea>

            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {filteredProducts.slice(0, 20).map(product => (
                <Card key={product.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-primary">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddProduct(product)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {phoneOrder.orderData.items && phoneOrder.orderData.items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Carrinho ({phoneOrder.orderData.items.length} itens)</Label>
                  {phoneOrder.orderData.items.map((item, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => phoneOrder.updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => phoneOrder.updateItem(idx, { quantity: item.quantity + 1 })}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">R$ {(item.unit_price * item.quantity).toFixed(2)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => phoneOrder.removeItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div>
              <Label>Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <Card
                    key={opt.code}
                    className={cn(
                      'cursor-pointer transition-all text-center',
                      phoneOrder.orderData.payment_method === opt.code && 'ring-2 ring-primary bg-primary/5'
                    )}
                    onClick={() => phoneOrder.updateOrderData({ payment_method: opt.code })}
                  >
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center gap-1">
                        {opt.icon}
                        <span className="text-sm">{opt.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {phoneOrder.orderData.payment_method === 'money' && (
              <div>
                <Label>Troco para</Label>
                <Input
                  type="number"
                  placeholder="R$ 100,00"
                  value={phoneOrder.orderData.change_for || ''}
                  onChange={(e) => phoneOrder.updateOrderData({ change_for: parseFloat(e.target.value) || undefined })}
                />
                {phoneOrder.orderData.change_for && phoneOrder.orderData.change_for > phoneOrder.getTotal() && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Troco: R$ {(phoneOrder.orderData.change_for - phoneOrder.getTotal()).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Observações do Pedido</Label>
              <Textarea
                placeholder="Alguma observação geral..."
                value={phoneOrder.orderData.notes || ''}
                onChange={(e) => phoneOrder.updateOrderData({ notes: e.target.value })}
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>R$ {phoneOrder.getSubtotal().toFixed(2)}</span>
                </div>
                {phoneOrder.orderData.delivery_fee && phoneOrder.orderData.delivery_fee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de entrega</span>
                    <span>R$ {phoneOrder.orderData.delivery_fee.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-medium">
                  <span>Total</span>
                  <span className="text-primary">R$ {phoneOrder.getTotal().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 rounded-full gradient-primary mx-auto flex items-center justify-center shadow-glow animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-display">Pedido Confirmado!</h2>
              <p className="text-muted-foreground">Enviado para produção</p>
            </div>

            <Card>
              <CardContent className="p-4 text-left space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{phoneOrder.orderData.customer?.name}</span>
                </div>
                {phoneOrder.orderData.receipt_type === 'delivery' && phoneOrder.orderData.delivery_address && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span>{phoneOrder.orderData.delivery_address.street}, {phoneOrder.orderData.delivery_address.number}</span>
                  </div>
                )}
                {phoneOrder.orderData.receipt_type === 'pickup' && phoneOrder.orderData.store_address && (
                  <div className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Retirada em:</p>
                      <p className="text-sm">{phoneOrder.orderData.store_address}</p>
                      <p className="text-xs text-success">Endereço enviado via WhatsApp</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>{PAYMENT_OPTIONS.find(p => p.code === phoneOrder.orderData.payment_method)?.label}</span>
                  <span className="ml-auto font-medium">R$ {phoneOrder.getTotal().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tickets gerados */}
            {generatedTickets.length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 justify-center">
                    <Ticket className="w-5 h-5 text-primary" />
                    <span className="font-medium">{generatedTickets.length} ticket(s) gerado(s)</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const order = phoneOrder.createOrder.data as any;
                      const orderNumber = order?.order_number
                        ? String(order.order_number).padStart(3, '0')
                        : undefined;
                      const ticketData: ProductTicketData[] = generatedTickets.map(t => ({
                        companyName: company?.name || 'Estabelecimento',
                        productName: t.product_name,
                        ticketIndex: t.ticket_index,
                        ticketTotal: t.ticket_total,
                        ticketCode: t.ticket_code,
                        orderId: t.order_id,
                        orderNumber,
                        customerName: t.customer_name || undefined,
                        attendantName: t.attendant_name || undefined,
                        showQRCode: (company as any)?.ticket_qr_control ?? false,
                        footerSite: company?.print_footer_site || undefined,
                        footerPhone: company?.print_footer_phone || undefined,
                      }));
                      printProductTickets(ticketData);
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir Tickets
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setGeneratedTickets([]); phoneOrder.reset(); }}>
                Novo Pedido
              </Button>
              <Button className="flex-1" onClick={() => window.location.href = '/orders'}>
                Ver Pedidos
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (phoneOrder.step) {
      case 'customer': 
        // Para balcão/counter, cliente é opcional
        if (phoneOrder.orderData.receipt_type === 'counter') return true;
        return !!phoneOrder.orderData.customer;
      case 'receipt': return !!phoneOrder.orderData.receipt_type;
      case 'address': return phoneOrder.orderData.receipt_type !== 'delivery' || !!phoneOrder.orderData.delivery_address;
      case 'products': return (phoneOrder.orderData.items?.length || 0) > 0;
      case 'payment': return !!phoneOrder.orderData.payment_method;
      default: return true;
    }
  };

  if (configLoading) {
    return (
      <DashboardLayout title="Novo Pedido por Ligação">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Novo Pedido por Ligação">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {(['customer', 'receipt', 'products', 'payment'] as PhoneOrderStep[]).map((s, idx) => {
            const isActive = phoneOrder.step === s;
            const isPast = ['customer', 'receipt', 'address', 'products', 'payment', 'confirmation'].indexOf(phoneOrder.step) > ['customer', 'receipt', 'address', 'products', 'payment', 'confirmation'].indexOf(s);
            return (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isActive && 'gradient-primary text-primary-foreground shadow-glow',
                    isPast && 'bg-success text-success-foreground',
                    !isActive && !isPast && 'bg-muted text-muted-foreground'
                  )}
                  onClick={() => isPast && phoneOrder.goToStep(s)}
                  style={{ cursor: isPast ? 'pointer' : 'default' }}
                >
                  {STEP_ICONS[s]}
                </div>
                {idx < 3 && (
                  <div className={cn('w-12 h-1 mx-1', isPast ? 'bg-success' : 'bg-muted')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                {STEP_ICONS[phoneOrder.step]}
              </div>
              <div>
                <CardTitle>{STEP_LABELS[phoneOrder.step]}</CardTitle>
                <CardDescription>
                  {phoneOrder.step === 'customer' && 'Busque ou cadastre o cliente'}
                  {phoneOrder.step === 'receipt' && 'Como o cliente vai receber?'}
                  {phoneOrder.step === 'address' && 'Endereço de entrega'}
                  {phoneOrder.step === 'products' && 'Adicione os produtos'}
                  {phoneOrder.step === 'payment' && 'Finalize o pedido'}
                  {phoneOrder.step === 'confirmation' && 'Pedido enviado!'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        {phoneOrder.step !== 'confirmation' && (
          <div className="flex gap-3">
            {phoneOrder.step !== 'customer' && (
              <Button variant="outline" onClick={phoneOrder.prevStep} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            )}
            {phoneOrder.step === 'payment' ? (
              <Button
                onClick={() => phoneOrder.createOrder.mutate()}
                disabled={!canProceed() || phoneOrder.createOrder.isPending}
                className="flex-1 gradient-primary"
              >
                {phoneOrder.createOrder.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Confirmar Pedido
                <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">F10</kbd>
              </Button>
            ) : (
              <Button onClick={phoneOrder.nextStep} disabled={!canProceed()} className="flex-1">
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-4 mt-2">
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Atalhos:
          </span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F2</kbd> Buscar</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F10</kbd> Finalizar</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F12</kbd> Nova Venda</span>
        </div>

        {/* Cart Summary (sticky at bottom on products step) */}
        {phoneOrder.step === 'products' && (phoneOrder.orderData.items?.length || 0) > 0 && (
          <Card className="sticky bottom-0 shadow-large border-primary/20 bg-card z-10">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{phoneOrder.orderData.items?.length} itens</p>
                <p className="text-lg font-medium">R$ {phoneOrder.getSubtotal().toFixed(2)}</p>
              </div>
              <Button onClick={phoneOrder.nextStep}>
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Optionals Dialog */}
      {selectedProductForOptionals && (
        <ProductOptionalsDialog
          open={optionalsDialogOpen}
          onOpenChange={setOptionalsDialogOpen}
          product={{
            id: selectedProductForOptionals.id,
            name: selectedProductForOptionals.name,
            price: selectedProductForOptionals.price,
          }}
          onConfirm={handleConfirmOptionals}
        />
      )}
    </DashboardLayout>
  );
}
