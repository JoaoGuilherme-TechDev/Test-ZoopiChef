import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Minus, ShoppingCart, Bell, Receipt, Trash2, Search, Settings, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { TabletDevice } from '@/hooks/useTabletDevices';
import { TabletSettings } from '@/hooks/useTabletSettings';
import { useGetOrCreateTableSession } from '@/hooks/useTableSessionAtomic';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import type { SelectedOption } from '@/contexts/CartContext';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  selectedOptions?: SelectedOption[];
  optionalsDescription?: string;
  isPizza?: boolean;
  pizzaData?: {
    size: string;
    parts_count: number;
    pricing_model: string;
    selected_flavors: Array<{ id: string; name: string; removedIngredients?: string[] }>;
    selected_optionals: SelectedOption[];
    optionals_total: number;
  };
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  background_color: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  subcategory_id: string | null;
  is_on_sale: boolean;
  sale_price: number | null;
  aparece_tablet: boolean;
  product_type?: string | null;
  // Category info for pizza detection (STRICT: only category.name determines pizza behavior)
  subcategory?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  show_on_tablet: boolean;
  image_url?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  show_on_tablet: boolean;
  image_url?: string | null;
}

export default function TabletKiosk() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const idleCarouselTimer = useRef<NodeJS.Timeout | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [isIdle, setIsIdle] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIdleImageIndex, setCurrentIdleImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Optionals/Pizza dialog states
  const [optionalsProduct, setOptionalsProduct] = useState<Product | null>(null);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);

  // Config form states
  const [configTableNumber, setConfigTableNumber] = useState('');
  const [configMode, setConfigMode] = useState<'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR'>('TABLE_ONLY');
  const [configAllowOrdering, setConfigAllowOrdering] = useState(true);
  const [configPin, setConfigPin] = useState('');

  const getOrCreateSession = useGetOrCreateTableSession();

  // Fetch device by token
  const { data: device, isLoading: deviceLoading, refetch: refetchDevice } = useQuery({
    queryKey: ['tablet_device_token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('tablet_devices')
        .select('*')
        .eq('access_token', token)
        .single();
      if (error) throw error;
      return data as TabletDevice & { access_token: string };
    },
    enabled: !!token,
  });

  // Fetch tablet settings
  const { data: tabletSettings } = useQuery({
    queryKey: ['tablet_settings_public', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return null;
      const { data, error } = await supabase
        .from('tablet_settings')
        .select('*')
        .eq('company_id', device.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as TabletSettings & { show_table_number_on_idle?: boolean } | null;
    },
    enabled: !!device?.company_id,
  });

  // Fetch company
  const { data: company } = useQuery({
    queryKey: ['company_public', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return null;
      const { data, error } = await supabase
        .from('public_companies')
        .select('id, name')
        .eq('id', device.company_id)
        .single();
      if (error) throw error;
      
      // Get additional company data
      const { data: fullData } = await supabase
        .from('companies')
        .select('logo_url, primary_color, background_color')
        .eq('id', device.company_id)
        .single();
        
      return { ...data, ...fullData } as Company;
    },
    enabled: !!device?.company_id,
  });

  // Fetch products for tablet
  const { data: products = [] } = useQuery({
    queryKey: ['tablet_products', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, description, image_url, subcategory_id, is_on_sale, sale_price, aparece_tablet, product_type,
          subcategory:subcategories!inner(
            id, name,
            category:categories!inner(id, name)
          )
        `)
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('aparece_tablet', true);
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!device?.company_id,
  });

  // Check product has optionals
  const { checkProduct } = usePublicCheckProductHasOptionals(device?.company_id);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['tablet_categories', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, show_on_tablet, image_url')
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('show_on_tablet', true);
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!device?.company_id,
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery({
    queryKey: ['tablet_subcategories', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return [];
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, category_id, show_on_tablet, image_url')
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('show_on_tablet', true);
      if (error) throw error;
      return data as Subcategory[];
    },
    enabled: !!device?.company_id,
  });

  // Update device mutation
  const updateDevice = useMutation({
    mutationFn: async (updates: { 
      assigned_table_number?: string | null;
      mode?: 'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR';
      allow_ordering?: boolean;
      pin_hash?: string | null;
    }) => {
      if (!device?.id) throw new Error('Device not found');
      const { data, error } = await supabase
        .from('tablet_devices')
        .update(updates)
        .eq('id', device.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchDevice();
      queryClient.invalidateQueries({ queryKey: ['tablet_device_token', token] });
    },
  });

  // Create service call mutation
  const createServiceCall = useMutation({
    mutationFn: async ({ table_number, call_type }: { table_number: string; call_type: string }) => {
      if (!device?.company_id) throw new Error('Company not found');
      const { error } = await supabase
        .from('table_service_calls')
        .insert({
          company_id: device.company_id,
          table_number,
          status: 'pending',
          call_type,
          tablet_device_id: device.id,
        });
      if (error) throw error;
    },
  });

  // Fullscreen management
  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Track fullscreen changes and re-enter automatically (kiosk protection)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // Auto re-enter fullscreen if exited (kiosk mode)
      if (!isNowFullscreen && device?.pin_hash) {
        // Wait a bit and re-enter fullscreen
        setTimeout(() => {
          enterFullscreen();
        }, 500);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [device?.pin_hash, enterFullscreen]);

  // Block keyboard shortcuts for exiting (kiosk mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common exit keys when device has PIN (kiosk mode)
      if (device?.pin_hash) {
        // Block: Escape, F11, Alt+Tab, Alt+F4, Ctrl+W, Ctrl+Q, Cmd+W, Cmd+Q
        if (
          e.key === 'Escape' ||
          e.key === 'F11' ||
          (e.altKey && (e.key === 'Tab' || e.key === 'F4')) ||
          ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W' || e.key === 'q' || e.key === 'Q'))
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [device?.pin_hash]);

  // Block context menu (right click)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (device?.pin_hash) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [device?.pin_hash]);

  // Auto-enter fullscreen on load if PIN is configured (kiosk mode)
  useEffect(() => {
    if (device?.pin_hash && !isFullscreen) {
      // Try to enter fullscreen after user interaction
      const handleFirstInteraction = () => {
        enterFullscreen();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
      document.addEventListener('click', handleFirstInteraction);
      document.addEventListener('touchstart', handleFirstInteraction);
      return () => {
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('touchstart', handleFirstInteraction);
      };
    }
  }, [device?.pin_hash, isFullscreen, enterFullscreen]);

  // Reset interaction timer
  const handleInteraction = useCallback(() => {
    setLastInteraction(Date.now());
    if (isIdle) {
      setIsIdle(false);
      setCurrentIdleImageIndex(0);
    }
  }, [isIdle]);

  // Idle timeout check
  useEffect(() => {
    const timeout = tabletSettings?.idle_timeout_seconds ?? 60;
    const interval = setInterval(() => {
      if (Date.now() - lastInteraction > timeout * 1000) {
        setIsIdle(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastInteraction, tabletSettings?.idle_timeout_seconds]);

  // Idle carousel rotation
  useEffect(() => {
    if (isIdle && tabletSettings?.idle_images && tabletSettings.idle_images.length > 1) {
      idleCarouselTimer.current = setInterval(() => {
        setCurrentIdleImageIndex((prev) => (prev + 1) % (tabletSettings.idle_images?.length || 1));
      }, 5000);
    }
    return () => {
      if (idleCarouselTimer.current) {
        clearInterval(idleCarouselTimer.current);
      }
    };
  }, [isIdle, tabletSettings?.idle_images]);

  // Long press on logo
  const handleLogoTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPinDialog(true);
    }, 5000);
  };

  const handleLogoTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePinSubmit = () => {
    const correctPin = device?.pin_hash ? atob(device.pin_hash) : '';
    const adminPin = tabletSettings?.admin_pin_hash ? atob(tabletSettings.admin_pin_hash) : '';
    
    if (enteredPin === correctPin || enteredPin === adminPin || (!correctPin && !adminPin)) {
      setShowPinDialog(false);
      setEnteredPin('');
      setConfigTableNumber(device?.assigned_table_number || '');
      setConfigMode(device?.mode || 'TABLE_ONLY');
      setConfigAllowOrdering(device?.allow_ordering ?? true);
      setConfigPin('');
      setShowConfigDialog(true);
    } else {
      toast.error('PIN incorreto');
      setEnteredPin('');
    }
  };

  const handleSaveConfig = async () => {
    if (!configTableNumber.trim()) {
      toast.error('Número da mesa é obrigatório');
      return;
    }

    try {
      const updates: Partial<TabletDevice> = {
        assigned_table_number: configTableNumber,
        mode: configMode,
        allow_ordering: configAllowOrdering,
      };
      
      if (configPin) {
        updates.pin_hash = btoa(configPin);
      }

      await updateDevice.mutateAsync(updates);
      setShowConfigDialog(false);
      toast.success('Configuração salva!');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
  };

  // Filter products by subcategory -> category mapping
  const filteredProducts = products.filter((p) => {
    // Product must have a valid subcategory that's visible on tablet
    if (p.subcategory_id) {
      const sub = subcategories.find(s => s.id === p.subcategory_id);
      if (!sub) return false;
      
      // Get category from subcategory
      const cat = categories.find(c => c.id === sub.category_id);
      if (!cat) return false;
      
      const matchesCategory = !selectedCategory || sub.category_id === selectedCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }
    
    // If no subcategory, show all (if no category filter) or hide
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return !selectedCategory && matchesSearch;
  });

  // Cart functions
  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = (product: Product) => isPizzaCategory(product);

  const addToCart = async (product: Product) => {
    handleInteraction();
    
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog
    // Pizza dialog handles optionals internally
    if (isPizza(product)) {
      setPizzaProduct(product);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsProduct(product);
      return;
    }

    // PRIORITY 3: Simple products go directly to cart
    addSimpleToCart(product);
  };

  const addSimpleToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id && !i.selectedOptions && !i.isPizza);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id && !i.selectedOptions && !i.isPizza ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: price }];
    });
    toast.success(`${product.name} adicionado`);
  };

  const handleOptionalsConfirm = (selectedOptions: SelectedOption[], totalPrice: number, optionalsDescription: string) => {
    if (!optionalsProduct) return;
    
    setCart((prev) => [
      ...prev,
      {
        product_id: optionalsProduct.id,
        product_name: optionalsProduct.name,
        quantity: 1,
        unit_price: totalPrice,
        selectedOptions,
        optionalsDescription,
      },
    ]);
    toast.success(`${optionalsProduct.name} adicionado`);
    setOptionalsProduct(null);
  };

  const handlePizzaConfirm = (selection: any) => {
    if (!pizzaProduct) return;
    
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPrice = (Number(selection.totalPrice) || 0) + doughDelta + borderTypeDelta;
    
    setCart((prev) => [
      ...prev,
      {
        product_id: pizzaProduct.id,
        product_name: pizzaProduct.name,
        quantity: 1,
        unit_price: totalPrice,
        isPizza: true,
        pizzaData: {
          size: selection.size,
          parts_count: selection.flavors?.length || 1,
          pricing_model: selection.pricing_model || 'average',
          selected_flavors: (selection.flavors || []).map((f: any) => ({
            id: f.id,
            name: f.name,
            removedIngredients: Array.isArray(f.removedIngredients) ? f.removedIngredients : [],
            observation: f.observation || undefined,
          })),
          selected_optionals: (selection.selectedOptionals || []) as any,
          optionals_total: Number(selection.optionalsTotal) || 0,
          selected_dough_type: selection.selectedDoughType || null,
          selected_border_type: selection.selectedBorderType || null,
        },
      },
    ]);
    toast.success(`${pizzaProduct.name} adicionado`);
    setPizzaProduct(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    handleInteraction();
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    handleInteraction();
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Service calls
  const handleCallWaiter = async () => {
    handleInteraction();
    if (!device?.assigned_table_number) {
      toast.error('Mesa não configurada');
      return;
    }
    try {
      await createServiceCall.mutateAsync({
        table_number: device.assigned_table_number,
        call_type: 'waiter',
      });
      toast.success('Garçom chamado!');
    } catch {
      toast.error('Erro ao chamar garçom');
    }
  };

  const handleAskBill = async () => {
    handleInteraction();
    if (!device?.assigned_table_number) {
      toast.error('Mesa não configurada');
      return;
    }
    try {
      await createServiceCall.mutateAsync({
        table_number: device.assigned_table_number,
        call_type: 'bill',
      });
      toast.success('Conta solicitada!');
    } catch {
      toast.error('Erro ao solicitar conta');
    }
  };

  const handlePlaceOrder = async () => {
    handleInteraction();
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    if (!device?.company_id || !device?.assigned_table_number) {
      toast.error('Mesa não configurada');
      return;
    }

    try {
      const tableNumber = parseInt(device.assigned_table_number);
      if (isNaN(tableNumber)) {
        toast.error('Número de mesa inválido');
        return;
      }

      // Build order items for the edge function
      const orderItems = cart.map((item) => {
        // Build selected_options_json
        let selectedOptionsJson: any = null;
        
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          selectedOptionsJson = { selected_options: JSON.parse(JSON.stringify(item.selectedOptions)) };
        }

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
                items: opt.items,
              })),
              optionals_total: item.pizzaData.optionals_total,
            },
          };
        }

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || null,
          selected_options_json: selectedOptionsJson,
        };
      });

      // Use public-create-order backend function (bypasses RLS)
      const { data, error } = await supabase.functions.invoke('public-create-order', {
        body: {
          company_id: device.company_id,
          customer_name: `Mesa ${device.assigned_table_number}`,
          customer_phone: null,
          customer_address: null,
          // IMPORTANT: Tablet autoatendimento deve cair em "Pedidos" (Kanban), não em "Mesa".
          // Mantemos table_number apenas como referência/identificação do tablet.
          order_type: 'counter',
          receipt_type: 'balcao',
          fulfillment_type: 'pickup',
          payment_method: null,
          table_number: tableNumber,
          comanda_number: null,
          total: cartTotal,
          notes: `Tablet Autoatendimento - Mesa ${device.assigned_table_number}`,
          items: orderItems,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCart([]);
      setShowCart(false);
      toast.success(`Pedido #${data.orderNumber} enviado para a cozinha!`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erro ao enviar pedido');
    }
  };

  // Get theme colors
  const primaryColor = tabletSettings?.primary_color || company?.primary_color || '#000000';
  const backgroundColor = tabletSettings?.background_color || company?.background_color || '#f5f5f5';
  const idleMessage = tabletSettings?.idle_message || 'Toque para começar';
  const idleImages = tabletSettings?.idle_images || [];

  if (deviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Tablet não encontrado</h1>
        <p className="text-muted-foreground mb-4">Verifique se o link está correto</p>
        <p className="text-sm text-muted-foreground">Token: {token}</p>
      </div>
    );
  }

  if (!device.is_active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor }}>
        <h1 className="text-2xl font-bold mb-4">Tablet desativado</h1>
        <p className="text-muted-foreground">Este dispositivo foi desativado pelo administrador</p>
      </div>
    );
  }

  // Idle screen with carousel
  if (isIdle) {
    const hasImages = idleImages.length > 0;
    const currentImage = hasImages ? idleImages[currentIdleImageIndex] : null;

    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center cursor-pointer relative overflow-hidden"
        style={{ backgroundColor }}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {/* Background image carousel */}
        {currentImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${currentImage})` }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 text-center">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-32 mb-8 animate-pulse mx-auto drop-shadow-lg"
            />
          )}
          <h1 
            className={`text-4xl md:text-6xl font-bold mb-4 ${hasImages ? 'text-white drop-shadow-lg' : ''}`}
            style={{ color: hasImages ? undefined : primaryColor }}
          >
            {idleMessage}
          </h1>
          {device.assigned_table_number && (
            <p className={`text-2xl ${hasImages ? 'text-white/90' : 'text-muted-foreground'}`}>
              Mesa {device.assigned_table_number}
            </p>
          )}
          
          {/* Carousel indicators */}
          {hasImages && idleImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {idleImages.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all ${idx === currentIdleImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Fullscreen button */}
        {!isFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4 bg-black/30 text-white hover:bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              enterFullscreen();
            }}
          >
            <Maximize className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col select-none"
      style={{ backgroundColor }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div 
            ref={logoRef}
            className="flex items-center gap-3 cursor-pointer"
            onTouchStart={handleLogoTouchStart}
            onTouchEnd={handleLogoTouchEnd}
            onMouseDown={handleLogoTouchStart}
            onMouseUp={handleLogoTouchEnd}
            onMouseLeave={handleLogoTouchEnd}
          >
            {company?.logo_url ? (
              <img src={company.logo_url} alt="" className="h-10" />
            ) : (
              <div className="h-10 w-10 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold">{company?.name?.[0]}</span>
              </div>
            )}
            <div>
              <h1 className="font-bold text-sm md:text-base" style={{ color: primaryColor }}>
                {company?.name}
              </h1>
              {device.assigned_table_number ? (
                <Badge variant="outline">Mesa {device.assigned_table_number}</Badge>
              ) : (
                <Badge variant="destructive">Mesa não configurada</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="outline" size="sm" onClick={handleCallWaiter} className="text-xs md:text-sm">
              <Bell className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Garçom</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleAskBill} className="text-xs md:text-sm">
              <Receipt className="h-4 w-4 md:mr-1" />
              <span className="hidden md:inline">Conta</span>
            </Button>
            {device.allow_ordering && (
              <Button onClick={() => setShowCart(true)} className="relative" size="sm">
                <ShoppingCart className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Carrinho</span>
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories sidebar - desktop */}
        <aside className="w-48 border-r bg-card p-2 hidden md:block overflow-y-auto">
          <div className="space-y-1">
            <Button
              variant={!selectedCategory ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </aside>

        {/* Products grid */}
        <main className="flex-1 p-3 md:p-4 overflow-y-auto">
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Mobile categories */}
          <div className="flex gap-2 overflow-x-auto pb-3 md:hidden">
            <Button size="sm" variant={!selectedCategory ? 'secondary' : 'outline'} onClick={() => setSelectedCategory(null)}>
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'secondary' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap"
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Products */}
          <div className={`grid gap-3 ${tabletSettings?.layout_mode === 'list' ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.product_id === product.id);
              const displayPrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
              const isListMode = tabletSettings?.layout_mode === 'list';
              
              return (
                <Card key={product.id} className={`overflow-hidden ${isListMode ? 'flex flex-row' : ''}`}>
                  {product.image_url && (
                    <div className={isListMode ? 'w-24 h-24 flex-shrink-0' : 'aspect-video bg-muted'}>
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className={`p-3 ${isListMode ? 'flex-1 flex flex-col justify-center' : ''}`}>
                    <div className={isListMode ? 'flex items-center justify-between gap-3' : ''}>
                      <div className={isListMode ? 'flex-1 min-w-0' : ''}>
                        <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                        {product.description && !isListMode && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          {product.is_on_sale && product.sale_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {product.price.toFixed(2)}
                            </span>
                          )}
                          <span className="text-primary font-bold" style={{ color: primaryColor }}>
                            R$ {displayPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {device.allow_ordering && (
                        <div className={isListMode ? 'flex-shrink-0' : 'mt-2'}>
                          {cartItem && !isPizza(product) && !cartItem.selectedOptions ? (
                            <div className="flex items-center justify-between gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, -1)}>
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-bold w-6 text-center">{cartItem.quantity}</span>
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" className={isListMode ? '' : 'w-full'} onClick={() => addToCart(product)} style={{ backgroundColor: primaryColor }}>
                              <Plus className="h-4 w-4 mr-1" />
                              {isPizza(product) ? 'Escolher' : 'Adicionar'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      {tabletSettings?.footer_text && (
        <footer className="border-t p-3 text-center text-sm text-muted-foreground">
          {tabletSettings.footer_text}
        </footer>
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carrinho - Mesa {device.assigned_table_number}</DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3 pr-4">
                {cart.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      {item.optionalsDescription && (
                        <p className="text-xs text-muted-foreground">{item.optionalsDescription}</p>
                      )}
                      {item.isPizza && item.pizzaData && (
                        <div className="text-xs text-muted-foreground">
                          <span>{item.pizzaData.selected_flavors.map(f => f.name).join(', ')}</span>
                          {/* Show removed ingredients */}
                          {item.pizzaData.selected_flavors.some(f => f.removedIngredients?.length > 0) && (
                            <span className="block text-destructive">
                              {item.pizzaData.selected_flavors
                                .filter(f => f.removedIngredients?.length > 0)
                                .map(f => `Sem: ${f.removedIngredients.join(', ')} (${f.name})`)
                                .join(' | ')}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">R$ {item.unit_price.toFixed(2)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.isPizza && !item.selectedOptions && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {(item.isPizza || item.selectedOptions) && (
                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCart(false)}>
                Continuar pedindo
              </Button>
              <Button 
                onClick={handlePlaceOrder} 
                disabled={cart.length === 0 || !device.assigned_table_number}
                style={{ backgroundColor: primaryColor }}
              >
                Enviar Pedido
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite o PIN de administração</p>
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPinDialog(false); setEnteredPin(''); }}>
              Cancelar
            </Button>
            <Button onClick={handlePinSubmit}>
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Tablet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número da Mesa</Label>
              <Input
                value={configTableNumber}
                onChange={(e) => setConfigTableNumber(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>

            <div className="space-y-2">
              <Label>Modo de Operação</Label>
              <Select value={configMode} onValueChange={(v) => setConfigMode(v as 'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TABLE_ONLY">Apenas Mesa</SelectItem>
                  <SelectItem value="TABLE_WITH_COMANDA_QR">Mesa + Comanda (QR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Permitir Pedidos</Label>
              <Switch checked={configAllowOrdering} onCheckedChange={setConfigAllowOrdering} />
            </div>

            <div className="space-y-2">
              <Label>Novo PIN (4 dígitos)</Label>
              <Input
                type="password"
                maxLength={4}
                placeholder="Deixe vazio para manter"
                value={configPin}
                onChange={(e) => setConfigPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="border-t pt-4 space-y-2">
              <Button variant="outline" className="w-full" onClick={enterFullscreen}>
                <Maximize className="h-4 w-4 mr-2" />
                Entrar em Tela Cheia
              </Button>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => {
                  // Exit fullscreen and allow navigation
                  exitFullscreen();
                  setShowConfigDialog(false);
                  // Navigate to home or allow browser controls
                  window.location.href = '/';
                }}
              >
                Sair do App (Administrador)
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={updateDevice.isPending}>
              {updateDevice.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optionals Dialog */}
      <PublicProductOptionalsDialog
        open={!!optionalsProduct}
        onOpenChange={(open) => !open && setOptionalsProduct(null)}
        product={optionalsProduct ? { id: optionalsProduct.id, name: optionalsProduct.name, price: optionalsProduct.is_on_sale && optionalsProduct.sale_price ? optionalsProduct.sale_price : optionalsProduct.price } : { id: '', name: '', price: 0 }}
        companyId={device?.company_id || ''}
        onConfirm={handleOptionalsConfirm}
      />

      {/* Pizza Dialog */}
      <PizzaConfiguratorDialog
        open={!!pizzaProduct}
        onClose={() => setPizzaProduct(null)}
        companyId={device?.company_id}
        productId={pizzaProduct?.id}
        productName={pizzaProduct?.name || ''}
        onConfirm={handlePizzaConfirm}
      />
    </div>
  );
}
