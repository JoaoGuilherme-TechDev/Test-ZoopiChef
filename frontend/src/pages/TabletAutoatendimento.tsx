import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { parseFunctionInvokeError } from '@/lib/edgeFunctionError';
import { Plus, Minus, ShoppingCart, Bell, Receipt, Trash2, Search, ChevronLeft, Wine, UtensilsCrossed, FileText, Star, Sparkles, Eye, Settings, Pizza } from 'lucide-react';
import { TabletBillDialog } from '@/components/tablet/TabletBillDialog';
import { TabletFeaturedCarousel } from '@/components/tablet/TabletFeaturedCarousel';
import { TabletFeedbackDialog } from '@/components/tablet/TabletFeedbackDialog';
import { TabletProductDetailDialog } from '@/components/tablet/TabletProductDetailDialog';
import { TabletUpsellSection } from '@/components/tablet/TabletUpsellSection';
import { useTabletProducts } from '@/hooks/useTabletProducts';
import { useCreateServiceCall } from '@/hooks/useTableServiceCalls';
import { useActiveRodizioSession } from '@/hooks/useRodizio';
import { TabletRodizioMenu } from '@/components/tablet/TabletRodizioMenu';
import { TabletDevice } from '@/hooks/useTabletDevices';
import { TabletSettings } from '@/hooks/useTabletSettings';
import { ScrollSpyCategoryNav, useScrollSpyNav, FloatingCategoryBadge, CategorySection } from '@/components/menu/ScrollSpyCategoryNav';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { useStockFilteredProducts } from '@/hooks/useStockFilteredProducts';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  selectedOptions?: any[];
}

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  background_color: string | null;
}

export default function TabletAutoatendimento() {
  const params = useParams<{ deviceId?: string }>();
  const location = useLocation();
  const deviceId = useMemo(() => {
    // Suporte aos dois formatos:
    // 1) /tablet-autoatendimento/:deviceId
    // 2) /tablet-autoatendimento?deviceId=...
    const fromPath = params.deviceId;
    if (fromPath) return fromPath;
    const qs = new URLSearchParams(location.search);
    return qs.get('deviceId') || undefined;
  }, [location.search, params.deviceId]);

  const debug = useMemo(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get('debug') === '1';
  }, [location.search]);
  const navigate = useNavigate();
  const logoRef = useRef<HTMLImageElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showTableNumberDialog, setShowTableNumberDialog] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isIdle, setIsIdle] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rodizioViewTab, setRodizioViewTab] = useState<'rodizio' | 'bebidas'>('rodizio');
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showPizzaDialog, setShowPizzaDialog] = useState(false);
  const [pizzaProduct, setPizzaProduct] = useState<any | null>(null);
  
  // Fetch device info
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ['tablet_device', deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      const { data, error } = await supabase
        .from('tablet_devices')
        .select('*')
        .eq('id', deviceId)
        .single();
      if (error) throw error;
      return data as TabletDevice;
    },
    enabled: !!deviceId,
  });

  // Fetch tablet settings
  const { data: tabletSettings } = useQuery({
    queryKey: ['tablet_settings', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return null;
      const { data, error } = await supabase
        .from('tablet_settings')
        .select('*')
        .eq('company_id', device.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as TabletSettings | null;
    },
    enabled: !!device?.company_id,
  });

  // Fetch company info
  const { data: company } = useQuery({
    queryKey: ['company', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, primary_color, background_color')
        .eq('id', device.company_id)
        .single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!device?.company_id,
  });

  // Fetch products for tablet
  const { data: tabletData } = useTabletProducts(device?.company_id);
  const products = tabletData?.products || [];
  const categories = tabletData?.categories || [];
  const subcategories = tabletData?.subcategories || [];

  // Filter products by stock availability - products with low stock are hidden
  const { products: stockFilteredProducts } = useStockFilteredProducts(products, device?.company_id);

  const createServiceCall = useCreateServiceCall();

  // Debug: ajuda a validar se o tablet está realmente com deviceId correto e mesa atribuída
  useEffect(() => {
    console.info('[TabletAutoatendimento] deviceId resolved:', deviceId);
  }, [deviceId]);

  useEffect(() => {
    if (!device) return;
    console.info('[TabletAutoatendimento] device loaded:', {
      id: device.id,
      is_active: device.is_active,
      company_id: device.company_id,
      assigned_table_number: device.assigned_table_number,
    });
  }, [device]);

  // Check for active rodizio session for this table
  // Note: This requires fetching the table_session_id from the device's assigned table
  const rodizioDebugRef = useRef<any>(null);
  const { data: activeRodizioSession, error: rodizioDetectError } = useQuery({
    queryKey: ['tablet-rodizio-session', device?.id],
    queryFn: async () => {
      if (!device?.id) return null;

      // Tablet é um fluxo não autenticado; leitura direta pode falhar por RLS.
      // Usamos função de backend com service role para detectar rodízio ativo.
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'tablet-get-active-rodizio',
        {
          body: { device_id: device.id },
        }
      );

      rodizioDebugRef.current = responseData;
      console.info('[TabletAutoatendimento] tablet-get-active-rodizio response:', responseData);

      if (fnError) {
        throw new Error((fnError as any)?.message || 'Falha ao detectar rodízio');
      }
      if (responseData?.error) {
        throw new Error(String(responseData.error));
      }

      return responseData?.session || null;
    },
    enabled: !!device?.id,
    refetchInterval: 5000, // Check every 5 seconds for faster response
  });

  // Exibir erro de detecção apenas uma vez por mensagem (evita spam a cada refetch)
  const lastRodizioErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const msg = rodizioDetectError instanceof Error ? rodizioDetectError.message : null;
    if (!msg) return;
    if (lastRodizioErrorRef.current === msg) return;
    lastRodizioErrorRef.current = msg;
    toast.error('Falha ao detectar rodízio', { description: msg });
  }, [rodizioDetectError]);

  // Fetch beverage products (categories with name containing "bebida", "drink", etc)
  const { data: beverageProducts = [] } = useQuery({
    queryKey: ['tablet-beverage-products', device?.company_id],
    queryFn: async () => {
      if (!device?.company_id) return [];
      
      // Find beverage categories
      const { data: beverageCategories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('show_on_tablet', true);
      
      // Filter by name patterns
      const beverageCategoryIds = (beverageCategories || [])
        .filter(c => {
          const n = c.name.toLowerCase();
          return n.includes('bebida') || n.includes('drink') || n.includes('refri') || n.includes('suco');
        })
        .map(c => c.id);
      
      if (beverageCategoryIds.length === 0) return [];
      
      // Find subcategories in these categories
      const { data: subCats } = await supabase
        .from('subcategories')
        .select('id')
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('show_on_tablet', true)
        .in('category_id', beverageCategoryIds);
      
      const subCatIds = (subCats || []).map(s => s.id);
      if (subCatIds.length === 0) return [];
      
      // Fetch products
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, title, description, image_url, price, is_on_sale, sale_price, subcategory_id')
        .eq('company_id', device.company_id)
        .eq('active', true)
        .eq('aparece_tablet', true)
        .in('subcategory_id', subCatIds)
        .order('name');
      
      return prods || [];
    },
    enabled: !!device?.company_id && !!activeRodizioSession,
  });

  // Reset interaction timer on any touch/click
  const handleInteraction = useCallback(() => {
    setLastInteraction(Date.now());
    if (isIdle) {
      setIsIdle(false);
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

  // Long press on logo for config
  const handleLogoTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPinDialog(true);
    }, 5000); // 5 seconds
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
    
    if (enteredPin === correctPin || enteredPin === adminPin) {
      setShowPinDialog(false);
      setEnteredPin('');
      navigate('/settings/tablet-autoatendimento');
    } else {
      toast.error('PIN incorreto');
      setEnteredPin('');
    }
  };

  // Handle password submit for settings access
  const handlePasswordSubmit = () => {
    const correctPassword = tabletSettings?.admin_password || 'zoopi603329';
    
    if (enteredPassword === correctPassword) {
      setShowPasswordDialog(false);
      setEnteredPassword('');
      navigate('/settings/tablet-autoatendimento');
    } else {
      toast.error('Senha incorreta');
      setEnteredPassword('');
    }
  };

  // Open settings with password protection
  const handleOpenSettings = () => {
    handleInteraction();
    setShowPasswordDialog(true);
  };

  // Handle table number change via edge function (unauthenticated)
  const handleTableNumberChange = async () => {
    const parsed = parseInt(newTableNumber, 10);
    if (!parsed || parsed <= 0) {
      toast.error('Número de mesa inválido');
      return;
    }
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('tablet-update-table-number', {
        body: {
          device_id: device?.id,
          table_number: parsed,
        },
      });

      if (fnError) {
        throw new Error((fnError as any)?.message || 'Falha ao alterar mesa');
      }
      if (data?.error) {
        throw new Error(String(data.error));
      }
      
      toast.success(`Mesa alterada para ${parsed}`);
      setShowTableNumberDialog(false);
      setNewTableNumber('');
      // Force refetch device data
      window.location.reload();
    } catch (err) {
      console.error('Error updating table number:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar mesa');
    }
  };

  // Handle logo click - show table number dialog
  const handleLogoClick = () => {
    handleInteraction();
    setNewTableNumber(device?.assigned_table_number?.toString() || '');
    setShowTableNumberDialog(true);
  };

  // Group products by subcategory for scroll spy - use stock filtered products
  const productsBySubcategory = useMemo(() => {
    const groups = new Map<string, { subcategory: typeof subcategories[0]; products: typeof stockFilteredProducts }>();
    
    stockFilteredProducts.forEach((product) => {
      const sub = subcategories.find(s => s.id === product.subcategory_id);
      if (sub) {
        if (!groups.has(sub.id)) {
          groups.set(sub.id, { subcategory: sub, products: [] });
        }
        groups.get(sub.id)!.products.push(product);
      }
    });
    
    return Array.from(groups.values());
  }, [stockFilteredProducts, subcategories]);

  // Build section list for scroll spy
  const scrollSpySections: CategorySection[] = useMemo(() => {
    return categories.map(cat => {
      const catSubs = subcategories.filter(s => s.category_id === cat.id);
      const productCount = catSubs.reduce((count, sub) => {
        const group = productsBySubcategory.find(g => g.subcategory.id === sub.id);
        return count + (group?.products.length || 0);
      }, 0);
      return {
        id: cat.id,
        name: cat.name,
        image_url: cat.image_url,
        productCount,
      };
    }).filter(s => s.productCount > 0);
  }, [categories, subcategories, productsBySubcategory]);

  // Scroll spy hook for product grid
  const {
    activeId: activeScrollCategory,
    registerRef: registerSubcategoryRef,
    scrollToSection: scrollToSubcategory,
    containerRef: productGridRef,
  } = useScrollSpyNav(
    productsBySubcategory.map(g => g.subcategory.id),
    { offset: 100 }
  );

  // Get active category from active subcategory
  const activeCategoryId = useMemo(() => {
    if (selectedCategory) return selectedCategory;
    if (!activeScrollCategory) return null;
    const activeSub = subcategories.find(s => s.id === activeScrollCategory);
    return activeSub?.category_id || null;
  }, [activeScrollCategory, selectedCategory, subcategories]);

  // Filter products for display (only when search is active) - use stock filtered products
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return null; // Use grouped view
    return stockFilteredProducts.filter((p) => {
      const matchesCategory = !selectedCategory || 
        subcategories.find(s => s.id === p.subcategory_id)?.category_id === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [stockFilteredProducts, selectedCategory, searchQuery, subcategories]);

  // Get filtered groups for scroll spy - ALWAYS return all groups for continuous scroll
  const filteredGroups = useMemo(() => {
    if (searchQuery) return []; // Use flat list when searching
    // Always return ALL groups to enable continuous scroll between categories
    return productsBySubcategory;
  }, [productsBySubcategory, searchQuery]);

  // Handle category click - scroll to first subcategory of that category
  const handleCategoryClick = (categoryId: string) => {
    // Clear selected category to enable continuous scroll mode
    setSelectedCategory(null);
    const firstSub = subcategories.find(s => s.category_id === categoryId);
    if (firstSub) {
      scrollToSubcategory(firstSub.id);
    }
  };

  // Get active category name for floating indicator
  const activeCategoryName = categories.find(c => c.id === activeCategoryId)?.name || '';

  // Cart functions - internal, called after pizza/optionals check passes
  const addToCartDirect = (product: typeof products[0], quantity = 1, selectedOptions?: any[], totalPrice?: number) => {
    setCart((prev) => {
      const price = totalPrice || (product.is_on_sale && product.sale_price ? product.sale_price : product.price);
      const unitPrice = totalPrice ? price / quantity : price;
      
      // If product has options, always add as new item
      if (selectedOptions && selectedOptions.length > 0) {
        return [...prev, { 
          product_id: product.id, 
          product_name: product.name, 
          quantity, 
          unit_price: unitPrice,
          selectedOptions 
        }];
      }
      
      const existing = prev.find((i) => i.product_id === product.id && !i.selectedOptions);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id && !i.selectedOptions ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity, unit_price: unitPrice }];
    });
    toast.success(`${product.name} adicionado`);
  };

  // Public addToCart function that respects pizza/optionals priority
  // PRIORITY: Pizza > ProductDetail (which handles optionals) > Direct add
  const addToCart = (product: typeof products[0]) => {
    handleInteraction();
    // PIZZA CHECK FIRST - STRICT: Only category name === "Pizza" enables pizza behavior
    if (isPizzaCategory(product)) {
      setPizzaProduct(product);
      setShowPizzaDialog(true);
      return;
    }
    // For non-pizza products, open the detail dialog to handle optionals
    openProductDetail(product);
  };

  // Open product detail dialog (or pizza modal for pizza products)
  const openProductDetail = (product: any) => {
    handleInteraction();
    // PIZZA CHECK FIRST - STRICT: Only category name === "Pizza" enables pizza behavior
    if (isPizzaCategory(product)) {
      setPizzaProduct(product);
      setShowPizzaDialog(true);
      return;
    }
    setSelectedProductForDetail(product);
    setShowProductDetail(true);
  };
  
  // Handle pizza confirmation
  const handlePizzaConfirm = (selection: any) => {
    if (!pizzaProduct) return;
    
    const flavorsDetails = (selection.flavors || []).map((f: any) => {
      let detail = f.name;
      if (f.removedIngredients?.length > 0) detail += ` (sem ${f.removedIngredients.join(', ')})`;
      if (f.observation) detail += ` [${f.observation}]`;
      return detail;
    }).join(', ');
    
    const borderNote = selection.selectedBorder ? ` | Borda: ${selection.selectedBorder.name}` : '';
    const doughTypeNote = selection.selectedDoughType ? ` | Massa: ${selection.selectedDoughType.name}` : '';
    const borderTypeNote = selection.selectedBorderType ? ` | Tipo Borda: ${selection.selectedBorderType.name}` : '';
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPrice = (selection.totalPrice || 0) + (selection.borderTotal || 0) + (selection.optionalsTotal || 0) + doughDelta + borderTypeDelta;
    const description = `${selection.size} - ${flavorsDetails}${doughTypeNote}${borderNote}${borderTypeNote}`;
    
    setCart(prev => [...prev, {
      product_id: pizzaProduct.id,
      product_name: pizzaProduct.name,
      quantity: 1,
      unit_price: totalPrice,
      notes: description,
      selectedOptions: [{
        pizza_snapshot: {
          size: selection.size,
          pricing_model: selection.pricing_model,
          selected_flavors: selection.flavors || [],
          selected_border: selection.selectedBorder || null,
          selected_optionals: selection.selectedOptionals || [],
          selected_dough_type: selection.selectedDoughType || null,
          selected_border_type: selection.selectedBorderType || null,
        }
      }],
    }]);
    
    toast.success(`${pizzaProduct.name} adicionada`);
    setShowPizzaDialog(false);
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
        tablet_device_id: device.id,
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
        tablet_device_id: device.id,
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
    if (!device?.company_id) {
      toast.error('Dispositivo não configurado');
      return;
    }

    try {
      // Use backend function because the tablet flow is unauthenticated
      const { data: responseData, error: fnError } = await supabase.functions.invoke('tablet-place-order', {
        body: {
          device_id: device.id,
          cart,
          total: cartTotal,
        },
      });

      if (fnError) {
        const parsed = await parseFunctionInvokeError(fnError);
        throw new Error(parsed.message || 'Falha ao enviar pedido');
      }
      if (responseData?.error) {
        throw new Error(String(responseData.error));
      }

      setCart([]);
      setShowCart(false);
      toast.success('Pedido enviado para a cozinha!');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido');
    }
  };

  // Get theme colors
  const primaryColor = tabletSettings?.primary_color || company?.primary_color || '#000000';
  const backgroundColor = tabletSettings?.background_color || company?.background_color || '#f5f5f5';
  const idleMessage = tabletSettings?.idle_message || 'Toque para começar';

  if (deviceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor }}>
        <h1 className="text-2xl font-bold mb-4">Dispositivo não encontrado</h1>
        <p className="text-muted-foreground">Verifique se o link está correto</p>
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

  // Idle screen
  if (isIdle) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center cursor-pointer"
        style={{ backgroundColor }}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {company?.logo_url && (
          <img 
            src={company.logo_url} 
            alt={company.name} 
            className="h-32 mb-8 animate-pulse"
          />
        )}
        <h1 
          className="text-4xl font-bold mb-4 text-center"
          style={{ color: primaryColor }}
        >
          {idleMessage}
        </h1>
        <p className="text-xl text-muted-foreground">
          Mesa {device.assigned_table_number}
        </p>
      </div>
    );
  }

  // Check if Rodízio session is active - show Rodízio menu instead
  if (activeRodizioSession) {
    return (
      <div 
        className="min-h-screen flex flex-col"
        style={{ backgroundColor }}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {debug && (
          <div className="fixed bottom-2 left-2 right-2 z-50 rounded-md border bg-background/95 p-2 text-xs shadow">
            <div className="font-semibold">DEBUG</div>
            <div>deviceId: <span className="font-mono">{deviceId || '—'}</span></div>
            <div>device.id: <span className="font-mono">{device.id}</span></div>
            <div>mesa(device): <span className="font-mono">{String(device.assigned_table_number ?? '—')}</span></div>
            <div>rodizio(active): <span className="font-mono">true</span></div>
          </div>
        )}
        {/* Header with Rodízio badge */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logo_url && (
                <img 
                  ref={logoRef}
                  src={company.logo_url} 
                  alt="" 
                  className="h-10 cursor-pointer"
                  onClick={handleLogoClick}
                  onTouchStart={handleLogoTouchStart}
                  onTouchEnd={handleLogoTouchEnd}
                  onMouseDown={handleLogoTouchStart}
                  onMouseUp={handleLogoTouchEnd}
                  onMouseLeave={handleLogoTouchEnd}
                />
              )}
              <div>
                <h1 className="font-bold" style={{ color: primaryColor }}>
                  {company?.name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted"
                    onClick={handleLogoClick}
                  >
                    Mesa {device.assigned_table_number}
                  </Badge>
                  <Badge style={{ backgroundColor: primaryColor }} className="text-white">
                    {activeRodizioSession.rodizio_types?.name || 'Rodízio'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFeedbackDialog(true)}>
                <Star className="h-4 w-4 mr-1" />
                Avaliar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBillDialog(true)}>
                <FileText className="h-4 w-4 mr-1" />
                Minha Conta
              </Button>
              <Button variant="outline" size="sm" onClick={handleCallWaiter}>
                <Bell className="h-4 w-4 mr-1" />
                Garçom
              </Button>
              <Button variant="ghost" size="icon" onClick={handleOpenSettings} title="Configurações">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Tabs: Rodízio / Bebidas */}
        <Tabs value={rodizioViewTab} onValueChange={(v) => setRodizioViewTab(v as 'rodizio' | 'bebidas')} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-12 bg-transparent gap-2">
              <TabsTrigger value="rodizio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 px-4">
                <UtensilsCrossed className="h-4 w-4" />
                Rodízio
              </TabsTrigger>
              <TabsTrigger value="bebidas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 px-4">
                <Wine className="h-4 w-4" />
                Bebidas {beverageProducts.length > 0 && `(${beverageProducts.length})`}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Rodízio Menu Tab */}
          <TabsContent value="rodizio" className="flex-1 overflow-hidden m-0">
            <TabletRodizioMenu
              rodizioSessionId={activeRodizioSession.id}
              rodizioTypeId={activeRodizioSession.rodizio_type_id}
              rodizioTypeName={activeRodizioSession.rodizio_types?.name || 'Rodízio'}
              primaryColor={primaryColor}
              companyId={device.company_id}
              mode="table"
              tableSessionId={activeRodizioSession.table_session_id}
              tableId={activeRodizioSession.table_session_id ? (activeRodizioSession as any).table_id : undefined}
              tableNumber={device.assigned_table_number ? Number(device.assigned_table_number) : undefined}
            />
          </TabsContent>

          {/* Bebidas Tab */}
          <TabsContent value="bebidas" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {beverageProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Wine className="h-12 w-12 mb-4" />
                    <p>Nenhuma bebida disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {beverageProducts.map((product) => {
                      const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
                      const cartItem = cart.find(i => i.product_id === product.id);
                      const quantity = cartItem?.quantity || 0;
                      
                      return (
                        <Card key={product.id} className="overflow-hidden">
                          {product.image_url && (
                            <div className="aspect-square bg-muted">
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-3">
                            <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                            <p className="text-sm font-bold mb-2" style={{ color: primaryColor }}>
                              R$ {(price / 100).toFixed(2).replace('.', ',')}
                            </p>
                            
                            {/* +/- controls */}
                            <div className="flex items-center justify-between gap-2">
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8"
                                onClick={() => updateQuantity(product.id, -1)}
                                disabled={quantity === 0}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-bold text-lg min-w-[2ch] text-center">{quantity}</span>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-8 w-8"
                                onClick={() => addToCart(product as any)}
                                style={{ backgroundColor: quantity === 0 ? primaryColor : undefined, color: quantity === 0 ? 'white' : undefined }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Cart button when viewing bebidas */}
        {rodizioViewTab === 'bebidas' && cartCount > 0 && (
          <div className="border-t p-4">
            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => setShowCart(true)}
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Ver Carrinho ({cartCount}) - R$ {(cartTotal / 100).toFixed(2).replace('.', ',')}
            </Button>
          </div>
        )}

        {/* Footer */}
        {tabletSettings?.footer_text && (
          <footer className="border-t p-3 text-center text-sm text-muted-foreground">
            {tabletSettings.footer_text}
          </footer>
        )}

        {/* Bill Dialog */}
        <TabletBillDialog
          open={showBillDialog}
          onOpenChange={setShowBillDialog}
          companyId={device.company_id}
          tableNumber={device.assigned_table_number ? Number(device.assigned_table_number) : 0}
          deviceId={device.id}
          primaryColor={primaryColor}
        />

        {/* Feedback Dialog */}
        <TabletFeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={setShowFeedbackDialog}
          companyId={device.company_id}
          deviceId={device.id}
          tableSessionId={activeRodizioSession?.table_session_id}
          tableNumber={device.assigned_table_number || undefined}
          primaryColor={primaryColor}
        />

        {/* PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Configurações do Tablet</DialogTitle>
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
              <Button variant="outline" onClick={() => {
                setShowPinDialog(false);
                setEnteredPin('');
              }}>
                Cancelar
              </Button>
              <Button onClick={handlePinSubmit} disabled={enteredPin.length !== 4}>
                Entrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Table Number Change Dialog */}
        <Dialog open={showTableNumberDialog} onOpenChange={setShowTableNumberDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Alterar Número da Mesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Digite o novo número da mesa</p>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Ex: 10"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value.replace(/\D/g, ''))}
                className="text-center text-3xl font-bold"
                autoFocus
                min={1}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowTableNumberDialog(false);
                setNewTableNumber('');
              }}>
                Cancelar
              </Button>
              <Button onClick={handleTableNumberChange} disabled={!newTableNumber}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Dialog for Settings */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Configurações do Tablet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Digite a senha de administração</p>
              <Input
                type="password"
                placeholder="Senha"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                className="text-center"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowPasswordDialog(false);
                setEnteredPassword('');
              }}>
                Cancelar
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={!enteredPassword}>
                Entrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {debug && (
        <div className="fixed bottom-2 left-2 right-2 z-50 rounded-md border bg-background/95 p-2 text-xs shadow">
          <div className="font-semibold">DEBUG</div>
          <div>deviceId: <span className="font-mono">{deviceId || '—'}</span></div>
          <div>device.id: <span className="font-mono">{device.id}</span></div>
          <div>mesa(device): <span className="font-mono">{String(device.assigned_table_number ?? '—')}</span></div>
          <div>rodizio(active): <span className="font-mono">false</span></div>
          {rodizioDetectError && (
            <div className="text-destructive">erro: {(rodizioDetectError as any)?.message || String(rodizioDetectError)}</div>
          )}
          <div className="mt-1 line-clamp-3">resp: <span className="font-mono">{JSON.stringify(rodizioDebugRef.current)}</span></div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url && (
              <img 
                ref={logoRef}
                src={company.logo_url} 
                alt="" 
                className="h-10 cursor-pointer"
                onTouchStart={handleLogoTouchStart}
                onTouchEnd={handleLogoTouchEnd}
                onMouseDown={handleLogoTouchStart}
                onMouseUp={handleLogoTouchEnd}
                onMouseLeave={handleLogoTouchEnd}
              />
            )}
            <div>
              <h1 className="font-bold" style={{ color: primaryColor }}>
                {company?.name}
              </h1>
              <Badge variant="outline">Mesa {device.assigned_table_number}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFeedbackDialog(true)}>
              <Star className="h-4 w-4 mr-1" />
              Avaliar
            </Button>
            <Button variant="outline" size="sm" onClick={handleCallWaiter}>
              <Bell className="h-4 w-4 mr-1" />
              Garçom
            </Button>
            <Button variant="outline" size="sm" onClick={handleAskBill}>
              <Receipt className="h-4 w-4 mr-1" />
              Conta
            </Button>
            {device.allow_ordering && (
              <Button onClick={() => setShowCart(true)} className="relative">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Carrinho
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleOpenSettings} title="Configurações">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Featured Products Carousel - "Mural da Casa" */}
      <TabletFeaturedCarousel
        companyId={device.company_id}
        primaryColor={primaryColor}
        onProductClick={(product) => addToCart(product as any)}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Categories sidebar with scroll spy */}
        <aside className="w-48 border-r bg-card flex flex-col hidden md:flex">
          <div className="p-2 border-b">
            <h3 className="text-sm font-semibold text-muted-foreground">Categorias</h3>
          </div>
          <ScrollSpyCategoryNav
            sections={scrollSpySections}
            activeSection={activeCategoryId}
            onSectionClick={handleCategoryClick}
            orientation="vertical"
            primaryColor={primaryColor}
            showAllOption
            onAllClick={() => setSelectedCategory(null)}
            isAllActive={!selectedCategory}
            className="flex-1"
          />
        </aside>

        {/* Products grid with independent scroll */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Floating category indicator */}
          <FloatingCategoryBadge 
            categoryName={activeCategoryName} 
            visible={!searchQuery && !selectedCategory}
            primaryColor={primaryColor}
          />

          {/* Search bar - fixed */}
          <div className="p-4 border-b flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Mobile categories - horizontal scroll spy */}
          <div className="md:hidden border-b flex-shrink-0">
            <ScrollSpyCategoryNav
              sections={scrollSpySections}
              activeSection={activeCategoryId}
              onSectionClick={handleCategoryClick}
              orientation="horizontal"
              primaryColor={primaryColor}
              showAllOption
              onAllClick={() => setSelectedCategory(null)}
              isAllActive={!selectedCategory}
            />
          </div>

          {/* Products with scroll spy sections */}
          <div className="flex-1 overflow-auto" ref={(el) => { (productGridRef as any).current = el; }}>
            <div className="p-4 space-y-6">
              {/* Search results - flat list */}
              {filteredProducts ? (
                <>
                  <div className={`grid gap-3 ${tabletSettings?.layout_mode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
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
                                  {cartItem ? (
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
                                      Adicionar
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
                </>
              ) : (
                /* Grouped by subcategory - scroll spy mode */
                filteredGroups.map((group) => (
                  <section 
                    key={group.subcategory.id}
                    ref={registerSubcategoryRef(group.subcategory.id)}
                    className="scroll-mt-24"
                  >
                    {/* Sticky subcategory header with category */}
                    <div 
                      className="sticky top-0 z-10 -mx-4 px-4 py-2 backdrop-blur-sm border-b mb-3"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          {group.subcategory.category_id && (
                            <span className="text-xs text-muted-foreground block">
                              {categories.find(c => c.id === group.subcategory.category_id)?.name}
                            </span>
                          )}
                          <h3 className="font-semibold" style={{ color: primaryColor }}>
                            {group.subcategory.name}
                          </h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {group.products.length} itens
                        </Badge>
                      </div>
                    </div>

                    {/* Products grid */}
                    <div className={`grid gap-3 ${tabletSettings?.layout_mode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                      {group.products.map((product) => {
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
                                    {cartItem ? (
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
                                        Adicionar
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
                  </section>
                ))
              )}
            </div>
          </div>
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">R$ {item.unit_price.toFixed(2)} cada</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
                disabled={cart.length === 0}
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
            <DialogTitle>Configurações do Tablet</DialogTitle>
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
            <Button variant="outline" onClick={() => {
              setShowPinDialog(false);
              setEnteredPin('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handlePinSubmit} disabled={enteredPin.length !== 4}>
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog for Settings (à la carte mode) */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Configurações do Tablet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Digite a senha de administração</p>
            <Input
              type="password"
              placeholder="Senha"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              className="text-center"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setEnteredPassword('');
            }}>
              Cancelar
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={!enteredPassword}>
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <TabletFeedbackDialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
        companyId={device.company_id}
        deviceId={device.id}
        tableNumber={device.assigned_table_number || undefined}
        primaryColor={primaryColor}
      />

      {/* Product Detail Dialog */}
      <TabletProductDetailDialog
        open={showProductDetail}
        onOpenChange={setShowProductDetail}
        product={selectedProductForDetail}
        companyId={device.company_id}
        primaryColor={primaryColor}
        onAddToCart={(product, quantity, selectedOptions, totalPrice) => {
          addToCartDirect(product as any, quantity, selectedOptions, totalPrice);
        }}
      />
      
      {/* Pizza Configurator Dialog */}
      {pizzaProduct && device && (
        <PizzaConfiguratorDialog
          open={showPizzaDialog}
          onClose={() => {
            setShowPizzaDialog(false);
            setPizzaProduct(null);
          }}
          companyId={device.company_id}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}
    </div>
  );
}
