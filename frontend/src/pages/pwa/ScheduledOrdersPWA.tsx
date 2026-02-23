/**
 * ScheduledOrdersPWA - ISOLATED Scheduled Orders PWA
 * 
 * Routes:
 * - /scheduled-orders (shows slug entry screen)
 * - /scheduled-orders/:companySlug (direct access with slug)
 * - /:slug/scheduled-orders (legacy)
 * - /pwa/scheduled-orders (legacy)
 * 
 * This component is COMPLETELY ISOLATED from Delivery:
 * - Own local cart state (NOT using CartContext)
 * - Own data fetching (NOT using useDeliveryMenu)
 * - Own manifest and service worker
 * - No shared hooks with Delivery
 */

import { useEffect, useState, useMemo, createContext, useContext, useCallback, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Store, Package, Plus, Minus, ShoppingCart, 
  CalendarClock, ChevronLeft, ChevronRight, Check, MapPin, Search
} from 'lucide-react';
import { ScheduleOrderOption } from '@/components/menu/ScheduleOrderOption';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =============================================================================
// ISOLATED TYPES (not shared with Delivery)
// =============================================================================

interface ScheduledProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_on_sale: boolean;
  sale_price: number | null;
}

interface ScheduledCategory {
  id: string;
  name: string;
  products: ScheduledProduct[];
}

interface ScheduledCompany {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  whatsapp: string | null;
  address: string | null;
}

interface ScheduledCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  cartItemId: string;
}

// =============================================================================
// ISOLATED CART CONTEXT (not shared with Delivery)
// =============================================================================

interface ScheduledCartContextType {
  items: ScheduledCartItem[];
  addItem: (product: { id: string; name: string; price: number }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const ScheduledCartContext = createContext<ScheduledCartContextType | undefined>(undefined);

function ScheduledCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ScheduledCartItem[]>([]);

  const addItem = useCallback((product: { id: string; name: string; price: number }) => {
    const cartItemId = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setItems(prev => [...prev, { ...product, quantity: 1, cartItemId }]);
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    } else {
      setItems(prev => prev.map(item =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      ));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <ScheduledCartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice
    }}>
      {children}
    </ScheduledCartContext.Provider>
  );
}

function useScheduledCart() {
  const context = useContext(ScheduledCartContext);
  if (!context) throw new Error('useScheduledCart must be used within ScheduledCartProvider');
  return context;
}

// =============================================================================
// ISOLATED DATA HOOKS (not shared with Delivery)
// =============================================================================

function useScheduledCompanyBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-orders-company', slug],
    queryFn: async (): Promise<ScheduledCompany | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name, slug, whatsapp, address')
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      
      // Get logo from companies table
      if (data) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('logo_url')
          .eq('id', data.id)
          .maybeSingle();
        return { ...data, logo_url: companyData?.logo_url || null } as ScheduledCompany;
      }
      return null;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch products for Scheduled Orders - Uses SAME logic as Delivery
 * Products are fetched with subcategory->category structure, filtered by:
 * - company_id
 * - active = true
 * - aparece_delivery = true (same visibility as Delivery)
 */
function useScheduledProducts(companyId: string | undefined) {
  return useQuery({
    queryKey: ['scheduled-orders-products', companyId],
    queryFn: async (): Promise<ScheduledCategory[]> => {
      if (!companyId) return [];
      
      // Fetch products with subcategory and category info - SAME as Delivery
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          is_on_sale,
          sale_price,
          subcategory:subcategories!inner(
            id,
            name,
            active,
            category:categories!inner(
              id,
              name,
              active
            )
          )
        `)
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('aparece_delivery', true)
        .order('name');
      
      if (error) {
        console.error('[useScheduledProducts] Error fetching products:', error);
        throw error;
      }
      
      // Filter products with active subcategory and category
      const activeProducts = (products || []).filter((p: any) => {
        return p.subcategory?.active && p.subcategory?.category?.active;
      });
      
      // Group by category
      const categoriesMap = new Map<string, ScheduledCategory>();
      
      activeProducts.forEach((product: any) => {
        const categoryId = product.subcategory.category.id;
        const categoryName = product.subcategory.category.name;
        
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            products: [],
          });
        }
        
        const category = categoriesMap.get(categoryId)!;
        category.products.push({
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          image_url: product.image_url,
          is_on_sale: product.is_on_sale ?? false,
          sale_price: product.sale_price ? Number(product.sale_price) : null,
        });
      });
      
      return Array.from(categoriesMap.values());
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });
}

function useCreateScheduledOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      companyId: string;
      customerName: string;
      customerPhone: string;
      scheduledDate: Date;
      scheduledTime: string;
      orderType: 'delivery' | 'pickup';
      deliveryAddress?: { address: string };
      items: ScheduledCartItem[];
      totalCents: number;
    }) => {
      // Format date as YYYY-MM-DD for the date column
      const dateStr = format(data.scheduledDate, 'yyyy-MM-dd');
      // Time is already in HH:mm format
      const timeStr = data.scheduledTime;
      
      const itemsJson = data.items.map(i => ({
        product_id: i.id,
        product_name: i.name,
        quantity: i.quantity,
        unit_price_cents: Math.round(i.price * 100),
      }));
      
      const { data: order, error } = await supabase
        .from('scheduled_orders')
        .insert({
          company_id: data.companyId,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          order_type: data.orderType,
          delivery_address: data.deliveryAddress || null,
          items: itemsJson,
          subtotal_cents: data.totalCents,
          total_cents: data.totalCents,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
    },
  });
}

// =============================================================================
// FORMATTERS
// =============================================================================

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// =============================================================================
// SLUG ENTRY SCREEN (when accessed via /scheduled-orders)
// =============================================================================

function SlugEntryScreen({ onSlugSubmit }: { onSlugSubmit: (slug: string) => void }) {
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data } = await supabase
        .from('public_companies')
        .select('slug')
        .eq('slug', slug.trim().toLowerCase())
        .maybeSingle();
      
      if (data) {
        onSlugSubmit(data.slug);
      } else {
        setError('Restaurante não encontrado');
      }
    } catch {
      setError('Erro ao buscar restaurante');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <CalendarClock className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Pedidos Agendados</h1>
      <p className="text-muted-foreground text-center mb-6">
        Digite o código do restaurante para agendar seu pedido
      </p>
      
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <Label htmlFor="slug">Código do Restaurante</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: meu-restaurante"
            className="text-center"
          />
          {error && <p className="text-destructive text-sm mt-1">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !slug.trim()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Buscar
        </Button>
      </form>
    </div>
  );
}

// =============================================================================
// PRODUCT CARD (isolated - no shared hooks)
// =============================================================================

function ScheduledProductCard({ product }: { product: ScheduledProduct }) {
  const { items, addItem, updateQuantity, removeItem } = useScheduledCart();
  
  const cartItems = items.filter((i) => i.id === product.id);
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];
  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const handleAdd = () => {
    addItem({ id: product.id, name: product.name, price: effectivePrice });
  };

  const handleIncrement = () => {
    if (firstCartItem) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity + 1);
    } else {
      handleAdd();
    }
  };

  const handleDecrement = () => {
    if (!firstCartItem) return;
    if (firstCartItem.quantity > 1) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
    } else {
      removeItem(firstCartItem.cartItemId);
    }
  };

  return (
    <div className={cn(
      "flex gap-3 p-4 bg-card border rounded-xl transition-all",
      quantity > 0 && "ring-2 ring-primary"
    )}>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground line-clamp-2">{product.name}</h4>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-primary">{formatCurrency(effectivePrice)}</span>
          {quantity > 0 ? (
            <div className="flex items-center gap-1 ml-auto">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={handleDecrement}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="font-bold text-sm w-6 text-center">{quantity}</span>
              <Button size="icon" className="h-8 w-8" onClick={handleIncrement}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="ml-auto" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </div>
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CONTENT
// =============================================================================

type CheckoutStep = 'cart' | 'schedule' | 'customer' | 'confirm';

function ScheduledOrdersContent({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading, error: companyError } = useScheduledCompanyBySlug(slug);
  const { data: categories = [], isLoading: productsLoading } = useScheduledProducts(company?.id);
  const createOrder = useCreateScheduledOrder();
  const { items, totalPrice, clearCart } = useScheduledCart();
  
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);

  // Set PWA manifest
  useEffect(() => {
    let manifestLink = document.querySelector('link[rel="manifest"]');
    const originalHref = manifestLink?.getAttribute('href');
    
    if (manifestLink) {
      manifestLink.setAttribute('href', '/manifest-scheduled-orders.webmanifest');
    } else {
      manifestLink = document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      manifestLink.setAttribute('href', '/manifest-scheduled-orders.webmanifest');
      document.head.appendChild(manifestLink);
    }

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const originalThemeColor = themeColorMeta?.getAttribute('content');
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', '#059669');
    } else {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      themeColorMeta.setAttribute('content', '#059669');
      document.head.appendChild(themeColorMeta);
    }

    return () => {
      if (manifestLink && originalHref) manifestLink.setAttribute('href', originalHref);
      if (themeColorMeta && originalThemeColor) themeColorMeta.setAttribute('content', originalThemeColor);
    };
  }, []);

  const handleSubmitOrder = async () => {
    if (!company?.id || !scheduledDate || items.length === 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createOrder.mutateAsync({
        companyId: company.id,
        customerName: customerName || 'Cliente',
        customerPhone: customerPhone || '',
        scheduledDate,
        scheduledTime,
        orderType: customerAddress ? 'delivery' : 'pickup',
        deliveryAddress: customerAddress ? { address: customerAddress } : undefined,
        items,
        totalCents: Math.round(totalPrice * 100),
      });

      setOrderCreated(true);
      clearCart();
    } catch (error) {
      console.error('Error creating scheduled order:', error);
      toast.error('Erro ao agendar pedido. Tente novamente.');
    }
  };

  const isLoading = companyLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (companyError || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Restaurante não encontrado</h1>
          <p className="text-muted-foreground mb-4">Verifique o código e tente novamente.</p>
          <Button onClick={() => navigate('/scheduled-orders')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  // Order success screen
  if (orderCreated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CalendarClock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Pedido Agendado!</h1>
        <p className="text-muted-foreground text-center mb-4">
          Seu pedido foi agendado para<br />
          <strong className="text-foreground">
            {scheduledDate && format(scheduledDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {scheduledTime}
          </strong>
        </p>
        <Button 
          onClick={() => {
            setOrderCreated(false);
            setStep('cart');
            setScheduledDate(undefined);
            setScheduledTime('12:00');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
          }}
        >
          Fazer novo pedido
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">{company.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Pedidos Agendados
            </p>
          </div>
        </div>
      </header>

      {/* Cart Step */}
      {step === 'cart' && (
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-2">Agendar Pedido</h2>
            <p className="text-muted-foreground text-sm">
              Escolha os produtos e agende para uma data futura
            </p>
          </div>

          {categories.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum produto disponível para agendamento</p>
            </Card>
          ) : (
            categories.map(category => (
              <div key={category.id}>
                <h3 className="text-lg font-bold mb-3">{category.name}</h3>
                <div className="space-y-3">
                  {category.products.map(product => (
                    <ScheduledProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      )}

      {/* Schedule Step */}
      {step === 'schedule' && (
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-2">Quando deseja receber?</h2>
            <p className="text-muted-foreground text-sm">
              Escolha a data e horário para seu pedido
            </p>
          </div>

          <ScheduleOrderOption
            isScheduled={true}
            setIsScheduled={() => {}}
            scheduledDate={scheduledDate}
            setScheduledDate={setScheduledDate}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
          />
        </main>
      )}

      {/* Customer Step */}
      {step === 'customer' && (
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-2">Seus dados</h2>
            <p className="text-muted-foreground text-sm">
              Informe seus dados para o pedido
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input 
                id="phone" 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="address">Endereço (opcional - para entrega)</Label>
              <Input 
                id="address" 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
          </div>
        </main>
      )}

      {/* Confirm Step */}
      {step === 'confirm' && (
        <main className="max-w-3xl mx-auto p-4 space-y-6">
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-2">Confirmar Pedido</h2>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Data e Hora</p>
                  <p className="text-sm text-muted-foreground">
                    {scheduledDate && format(scheduledDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} às {scheduledTime}
                  </p>
                </div>
              </div>
              
              {customerAddress && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">{customerAddress}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="font-medium mb-2">Itens</p>
                {items.map(item => (
                  <div key={item.cartItemId} className="flex justify-between text-sm py-1">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalPrice)}</span>
              </div>
            </CardContent>
          </Card>
        </main>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          {step !== 'cart' && (
            <Button 
              variant="outline" 
              onClick={() => {
                if (step === 'schedule') setStep('cart');
                if (step === 'customer') setStep('schedule');
                if (step === 'confirm') setStep('customer');
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          
          {step === 'cart' && items.length > 0 && (
            <Button className="flex-1" onClick={() => setStep('schedule')}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {items.length} itens - {formatCurrency(totalPrice)}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {step === 'schedule' && scheduledDate && (
            <Button className="flex-1" onClick={() => setStep('customer')}>
              Continuar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {step === 'customer' && (
            <Button className="flex-1" onClick={() => setStep('confirm')}>
              Revisar Pedido
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button 
              className="flex-1" 
              onClick={handleSubmitOrder}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar Agendamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN EXPORT - Handles routing
// =============================================================================

export default function ScheduledOrdersPWA() {
  const { slug, companySlug } = useParams<{ slug?: string; companySlug?: string }>();
  const [enteredSlug, setEnteredSlug] = useState<string | null>(null);
  
  // Determine the active slug from URL params or entered value
  const activeSlug = slug || companySlug || enteredSlug;
  
  // If no slug is available, show the slug entry screen
  if (!activeSlug) {
    return <SlugEntryScreen onSlugSubmit={setEnteredSlug} />;
  }
  
  return (
    <ScheduledCartProvider>
      <ScheduledOrdersContent slug={activeSlug} />
    </ScheduledCartProvider>
  );
}
