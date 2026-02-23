import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Minus, ShoppingCart, Bell, Receipt, Trash2, Search, Settings, Maximize, ChevronLeft, ChevronRight, Download, Smartphone, Package, Loader2, X, Eye, User, FileText, Info, MapPin, Clock } from 'lucide-react';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { GeoValidationDialog } from '@/components/geo/GeoValidationDialog';
import { useGeoSecurity } from '@/hooks/useGeoSecurity';
import { motion, AnimatePresence } from 'framer-motion';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import type { SelectedOption } from '@/contexts/CartContext';
import { TabletRodizioMenu } from '@/components/tablet/TabletRodizioMenu';
import { saveTabletContext, touchTabletContext, updatePersistedTableNumber } from '@/lib/pwa/tabletPersistence';
import { useStockFilteredProducts } from '@/hooks/useStockFilteredProducts';

// Storage keys for local persistence
const STORAGE_KEYS = {
  TABLE_NUMBER: 'tablet_table_number',
  MODE: 'tablet_mode',
  ALLOW_ORDERING: 'tablet_allow_ordering',
  ALLOW_PAYMENT: 'tablet_allow_payment',
  DEVICE_ID: 'tablet_device_id',
  PIN: 'tablet_pin',
};

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
    selected_flavors: Array<{ id: string; name: string; description?: string | null; removedIngredients?: string[] }>;
    selected_optionals: SelectedOption[];
    optionals_total: number;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  composition?: string | null;
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
    category_id: string;
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

interface TabletSettings {
  idle_timeout_seconds: number;
  idle_message: string;
  idle_images: string[];
  primary_color: string;
  secondary_color: string;
  background_color: string;
  footer_text: string;
  layout_mode: 'grid' | 'list';
  require_pin: boolean;
  admin_pin_hash: string | null;
  // Sensitive: NEVER select this field in public queries.
  // Validation must happen via backend function.
  admin_password?: string | null;
  allow_pix_payment: boolean;
}

// Helper to determine if background is light or dark
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function AutoatendimentoContent() {
  const { company } = useTenant();
  const logoRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const idleCarouselTimer = useRef<NodeJS.Timeout | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showAdminPasswordDialog, setShowAdminPasswordDialog] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState<Product | null>(null);
  const [showGeoDialog, setShowGeoDialog] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [enteredAdminPassword, setEnteredAdminPassword] = useState('');
  const [isIdle, setIsIdle] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  // Categoria selecionada (filtra produtos ao clicar na sidebar)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIdleImageIndex, setCurrentIdleImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Geo security
  const geoSecurity = useGeoSecurity({
    companyId: company?.id,
    onExpired: () => {
      toast.warning('Sessão expirada. Por favor, valide sua localização novamente.');
      setShowGeoDialog(true);
    },
  });

  // Show geo dialog if geo security is enabled and session is not valid
  useEffect(() => {
    if (geoSecurity.settings?.enabled && !geoSecurity.isValidSession && !geoSecurity.isValidating) {
      setShowGeoDialog(true);
    }
  }, [geoSecurity.settings, geoSecurity.isValidSession, geoSecurity.isValidating]);

  // Config from localStorage
  const [configTableNumber, setConfigTableNumber] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.TABLE_NUMBER) || ''
  );
  const [configMode, setConfigMode] = useState<'TABLE_ONLY' | 'TABLE_WITH_COMANDA_QR'>(() => 
    (localStorage.getItem(STORAGE_KEYS.MODE) as any) || 'TABLE_ONLY'
  );
  const [configAllowOrdering, setConfigAllowOrdering] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.ALLOW_ORDERING) !== 'false'
  );
  const [configAllowPayment, setConfigAllowPayment] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.ALLOW_PAYMENT) !== 'false'
  );
  const [configPin, setConfigPin] = useState('');

  // Optionals/Pizza dialog states
  const [optionalsProduct, setOptionalsProduct] = useState<Product | null>(null);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);

  // Persist tablet context for PWA auto-restore
  useEffect(() => {
    if (company) {
      saveTabletContext({
        companyId: company.id,
        companySlug: company.slug,
        companyName: company.name,
        tableNumber: configTableNumber || undefined,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  }, [company, configTableNumber]);

  // Touch context periodically to track activity
  useEffect(() => {
    const interval = setInterval(() => {
      touchTabletContext();
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setShowPwaPrompt(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App instalado com sucesso!');
    }
    setDeferredPrompt(null);
    setShowPwaPrompt(false);
  };

  // Fetch tablet settings
  const { data: tabletSettings } = useQuery({
    queryKey: ['tablet_settings_public', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('tablet_settings')
        // IMPORTANT: do not select sensitive admin fields (admin_password/admin_pin_hash)
        .select(
          'idle_timeout_seconds, idle_message, idle_images, primary_color, secondary_color, background_color, footer_text, layout_mode, require_pin, allow_pix_payment'
        )
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      return data as TabletSettings | null;
    },
    enabled: !!company?.id,
  });

  const handleOpenAdminSettings = () => {
    handleInteraction();
    setEnteredAdminPassword('');
    setShowAdminPasswordDialog(true);
  };

  const handleAdminPasswordSubmit = async () => {
    if (!company?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke('tablet-get-active-rodizio', {
        body: {
          action: 'verify_admin_password',
          company_id: company.id,
          password: enteredAdminPassword,
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) {
        toast.error('Senha incorreta');
        setEnteredAdminPassword('');
        return;
      }

      setShowAdminPasswordDialog(false);
      setEnteredAdminPassword('');
      setShowConfigDialog(true);
    } catch (err) {
      console.error('Admin password verify failed:', err);
      toast.error('Não foi possível validar a senha. Tente novamente.');
    }
  };

  // Fetch products for tablet - include subcategory/category info for pizza detection
  const { data: products = [] } = useQuery({
    queryKey: ['tablet_products', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, description, composition, image_url, subcategory_id,
          is_on_sale, sale_price, aparece_tablet, product_type,
          subcategory:subcategories(
            id, name, category_id,
            category:categories(id, name)
          )
        `)
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('aparece_tablet', true);
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });

  // Check product has optionals
  const { checkProduct } = usePublicCheckProductHasOptionals(company?.id);

  // Fetch categories with image_url
  const { data: categories = [] } = useQuery({
    queryKey: ['tablet_categories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, show_on_tablet, image_url')
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('show_on_tablet', true);
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!company?.id,
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery({
    queryKey: ['tablet_subcategories', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, category_id, show_on_tablet, image_url')
        .eq('company_id', company.id)
        .eq('active', true)
        .eq('show_on_tablet', true);
      if (error) throw error;
      return data as Subcategory[];
    },
    enabled: !!company?.id,
  });

  // Create service call mutation
  const createServiceCall = useMutation({
    mutationFn: async ({ table_number, call_type }: { table_number: string; call_type: string }) => {
      if (!company?.id) throw new Error('Company not found');
      const { error } = await supabase
        .from('table_service_calls')
        .insert({
          company_id: company.id,
          table_number,
          status: 'pending',
          call_type,
        });
      if (error) throw error;
    },
  });

  // Theme colors
  const primaryColor = tabletSettings?.primary_color || '#000000';
  const secondaryColor = tabletSettings?.secondary_color || '#ffffff';
  const bgColor = tabletSettings?.background_color || '#1a1a1a';
  const isLightMode = isLightColor(bgColor);
  const textColor = isLightMode ? '#1a1a1a' : '#ffffff';
  const textMutedColor = isLightMode ? '#666666' : 'rgba(255,255,255,0.6)';
  const cardBg = isLightMode ? '#ffffff' : 'rgba(255,255,255,0.08)';
  const borderColor = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

  // Detect active Rodízio for this company + table (tenant autoatendimento is unauthenticated)
  const { data: activeRodizioSession } = useQuery({
    queryKey: ['tenant-active-rodizio', company?.id, configTableNumber],
    queryFn: async () => {
      if (!company?.id || !configTableNumber) return null;
      const { data, error } = await supabase.functions.invoke('tablet-get-active-rodizio', {
        body: {
          company_id: company.id,
          table_number: configTableNumber,
        },
      });
      if (error) throw error;
      if ((data as any)?.error && !(data as any)?.active) return null;
      return (data as any)?.session || null;
    },
    enabled: !!company?.id && !!configTableNumber,
    refetchInterval: 5000,
  });

  // Fullscreen management
  const enterFullscreen = useCallback(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
    const savedPin = localStorage.getItem(STORAGE_KEYS.PIN);
    const adminPin = tabletSettings?.admin_pin_hash ? atob(tabletSettings.admin_pin_hash) : '';
    
    if (enteredPin === savedPin || enteredPin === adminPin || (!savedPin && !adminPin)) {
      setShowPinDialog(false);
      setEnteredPin('');
      setShowConfigDialog(true);
    } else {
      toast.error('PIN incorreto');
      setEnteredPin('');
    }
  };

  const handleSaveConfig = () => {
    if (!configTableNumber.trim()) {
      toast.error('Número da mesa é obrigatório');
      return;
    }

    localStorage.setItem(STORAGE_KEYS.TABLE_NUMBER, configTableNumber);
    localStorage.setItem(STORAGE_KEYS.MODE, configMode);
    localStorage.setItem(STORAGE_KEYS.ALLOW_ORDERING, configAllowOrdering ? 'true' : 'false');
    localStorage.setItem(STORAGE_KEYS.ALLOW_PAYMENT, configAllowPayment ? 'true' : 'false');
    if (configPin) {
      localStorage.setItem(STORAGE_KEYS.PIN, configPin);
    }

    // Also persist to PWA context for auto-restore
    updatePersistedTableNumber(configTableNumber);

    setShowConfigDialog(false);
    toast.success('Configuração salva!');
  };

  // Filter products
  // Filter products by stock availability - products with low stock are hidden
  const { products: stockFilteredProducts } = useStockFilteredProducts(products, company?.id);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Busca sempre tem prioridade
    if (q) {
      return stockFilteredProducts.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Sem busca: filtra por categoria selecionada (se houver)
    if (!selectedCategoryId) return stockFilteredProducts;

    const subToCat = new Map<string, string>();
    subcategories.forEach((s) => subToCat.set(s.id, s.category_id));

    return stockFilteredProducts.filter((p) => {
      if (!p.subcategory_id) return false;
      return subToCat.get(p.subcategory_id) === selectedCategoryId;
    });
  }, [stockFilteredProducts, searchQuery, selectedCategoryId, subcategories]);

  const handleCategoryClick = useCallback(
    (categoryId: string | null) => {
      handleInteraction();
      setSelectedCategoryId(categoryId);
      // Mantém a busca (se o usuário digitou) como prioridade.
    },
    [handleInteraction]
  );

  const renderProductCard = useCallback(
    (product: Product) => {
      const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
      const cartItem = cart.find((i) => i.product_id === product.id && !i.selectedOptions && !i.isPizza);

      return (
        <motion.div
          key={product.id}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl overflow-hidden cursor-pointer transition-all"
          style={{
            backgroundColor: cardBg,
            boxShadow: '0 8px 30px -10px rgba(0,0,0,0.3)',
          }}
          onClick={() => setShowProductDetail(product)}
        >
          {/* Imagem */}
          <div className="aspect-square relative overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: isLightMode ? '#f3f4f6' : 'rgba(255,255,255,0.05)' }}
              >
                <Package className="w-12 h-12" style={{ color: textMutedColor }} />
              </div>
            )}

            {/* Badge de promoção */}
            {product.is_on_sale && (
              <div
                className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                OFERTA
              </div>
            )}

            {/* Badge de quantidade no carrinho */}
            {cartItem && cartItem.quantity > 0 && (
              <div
                className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: primaryColor, color: 'white' }}
              >
                {cartItem.quantity}
              </div>
            )}

            {/* Botão info */}
            <button
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={(e) => {
                e.stopPropagation();
                setShowProductDetail(product);
              }}
            >
              <Info className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Info */}
          <div className="p-3">
            <h3 className="font-medium text-sm line-clamp-2 mb-2" style={{ color: textColor }}>
              {product.name}
            </h3>

            <div className="flex items-center justify-between">
              <div>
                {product.is_on_sale && product.sale_price ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through" style={{ color: textMutedColor }}>
                      R$ {product.price.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold" style={{ color: primaryColor }}>
                      R$ {product.sale_price.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold" style={{ color: primaryColor }}>
                    R$ {price.toFixed(2)}
                  </span>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}
              >
                <Plus className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      );
    },
    [cardBg, cart, isLightMode, primaryColor, textColor, textMutedColor]
  );

  // Cart functions
  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = (product: Product) => isPizzaCategory(product);

  async function addToCart(product: Product) {
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
  }

  function addSimpleToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id && !i.selectedOptions && !i.isPizza);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id && !i.selectedOptions && !i.isPizza ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: price }];
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  }

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
    setOptionalsProduct(null);
    toast.success(`${optionalsProduct.name} adicionado ao carrinho!`);
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
            description: f.description ?? null,
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
    setPizzaProduct(null);
    toast.success(`${pizzaProduct.name} adicionado ao carrinho!`);
  };

  const updateQuantity = (index: number, delta: number) => {
    handleInteraction();
    setCart((prev) =>
      prev
        .map((item, i) => (i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (index: number) => {
    handleInteraction();
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Service calls
  const handleCallWaiter = async () => {
    handleInteraction();
    if (!configTableNumber) {
      toast.error('Mesa não configurada');
      return;
    }
    try {
      await createServiceCall.mutateAsync({ table_number: configTableNumber, call_type: 'waiter' });
      toast.success('Garçom chamado! Aguarde um momento.');
    } catch {
      toast.error('Erro ao chamar garçom');
    }
  };

  const handleAskBill = async () => {
    handleInteraction();
    if (!configTableNumber) {
      toast.error('Mesa não configurada');
      return;
    }
    try {
      await createServiceCall.mutateAsync({ table_number: configTableNumber, call_type: 'bill' });
      toast.success('Conta solicitada! O garçom trará em instantes.');
    } catch {
      toast.error('Erro ao solicitar conta');
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    if (!configTableNumber) {
      toast.error('Mesa não configurada');
      return;
    }
    if (!configAllowOrdering) {
      toast.error('Pedidos desabilitados neste tablet');
      return;
    }

    try {
      // Build payload in the format expected by the backend function
      const orderItems = cart.map((item) => {
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
              selected_optionals: item.pizzaData.selected_optionals.map((opt: any) => ({
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

      // Use backend function to bypass RLS (totem/autoatendimento is unauthenticated)
      const { data, error } = await supabase.functions.invoke('public-create-order', {
        body: {
          company_id: company!.id,
          customer_name: `Mesa ${configTableNumber}`,
          customer_phone: null,
          customer_address: null,
          order_type: 'mesa',
          receipt_type: 'mesa',
          fulfillment_type: 'pickup',
          payment_method: null,
          table_number: configTableNumber,
          comanda_number: null,
          total: cartTotal,
          notes: `Tablet Autoatendimento - Mesa ${configTableNumber}`,
          items: orderItems,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error(String((data as any).error));

      setCart([]);
      setShowCart(false);
      const orderNumber = (data as any)?.orderNumber;
      toast.success(orderNumber ? `Pedido #${orderNumber} enviado!` : 'Pedido enviado!');
    } catch (err) {
      console.error('Error creating order:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar pedido. Tente novamente.');
    }
  };

  // Loading state
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  // Idle screen
  if (isIdle) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center cursor-pointer"
        style={{ backgroundColor: bgColor }}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {tabletSettings?.idle_images && tabletSettings.idle_images.length > 0 ? (
          <div className="relative w-full h-screen">
            {tabletSettings.idle_images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="Idle"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  idx === currentIdleImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
              <p className="text-white text-3xl font-bold text-center">
                {tabletSettings.idle_message || 'Toque para fazer seu pedido'}
              </p>
              {configTableNumber && (
                <p className="text-white/70 text-xl text-center mt-2">Mesa {configTableNumber}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            {company?.logo_url && (
              <img src={company.logo_url} alt={company.name} className="w-32 h-32 object-contain mx-auto mb-6" />
            )}
            <p className="text-3xl font-bold" style={{ color: textColor }}>
              {tabletSettings?.idle_message || 'Toque para fazer seu pedido'}
            </p>
            {configTableNumber && (
              <p className="text-xl mt-4" style={{ color: textMutedColor }}>Mesa {configTableNumber}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // If Rodízio is active, hide à la carte and show the Rodízio menu
  if (activeRodizioSession) {
    const rodizioTypeName = Array.isArray((activeRodizioSession as any)?.rodizio_types)
      ? (activeRodizioSession as any)?.rodizio_types?.[0]?.name
      : (activeRodizioSession as any)?.rodizio_types?.name;

    const tableNumberNum = Number.parseInt(String((activeRodizioSession as any)?.table_number ?? configTableNumber), 10);

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
        <header className="flex items-center justify-between px-4 py-3 shadow-lg" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center gap-3 select-none">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-12 h-12 object-contain rounded-lg" />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">{company?.name?.[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-white font-bold text-lg">{company?.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0">Mesa {configTableNumber}</Badge>
                <Badge className="bg-white text-black border-0">{rodizioTypeName || 'Rodízio'}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleCallWaiter}>
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleAskBill}>
              <Receipt className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={handleOpenAdminSettings}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0">
          <TabletRodizioMenu
            rodizioSessionId={(activeRodizioSession as any).id}
            rodizioTypeId={(activeRodizioSession as any).rodizio_type_id}
            rodizioTypeName={rodizioTypeName || 'Rodízio'}
            primaryColor={primaryColor}
            companyId={company!.id}
            mode="table"
            tableSessionId={(activeRodizioSession as any).table_session_id}
            tableId={(activeRodizioSession as any).table_id}
            tableNumber={Number.isNaN(tableNumberNum) ? undefined : tableNumberNum}
          />
        </main>

        {/* Admin Password Dialog - also available in Rodízio mode */}
        <Dialog open={showAdminPasswordDialog} onOpenChange={setShowAdminPasswordDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações do Tablet
              </DialogTitle>
              <DialogDescription>
                Digite a senha para acessar as configurações.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin_password_rodizio">Senha</Label>
                <Input
                  id="admin_password_rodizio"
                  type="password"
                  value={enteredAdminPassword}
                  onChange={(e) => setEnteredAdminPassword(e.target.value)}
                  placeholder="********"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdminPasswordDialog(false)}>Cancelar</Button>
              <Button onClick={handleAdminPasswordSubmit}>Acessar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Config Dialog - also available in Rodízio mode */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configurar Tablet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tableNumber_rodizio">Número da Mesa</Label>
                <Input
                  id="tableNumber_rodizio"
                  value={configTableNumber}
                  onChange={(e) => setConfigTableNumber(e.target.value)}
                  placeholder="Ex: 1, 2, 3..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="mode_rodizio">Modo de Operação</Label>
                <Select value={configMode} onValueChange={(v) => setConfigMode(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TABLE_ONLY">Mesa Nativa (Pedido direto)</SelectItem>
                    <SelectItem value="TABLE_WITH_COMANDA_QR">Mesa + Comanda QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowOrdering_rodizio">Permitir pedidos</Label>
                <Switch
                  id="allowOrdering_rodizio"
                  checked={configAllowOrdering}
                  onCheckedChange={setConfigAllowOrdering}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowPayment_rodizio">Permitir pagamento</Label>
                <Switch
                  id="allowPayment_rodizio"
                  checked={configAllowPayment}
                  onCheckedChange={setConfigAllowPayment}
                />
              </div>
              <div>
                <Label htmlFor="newPin_rodizio">Novo PIN (opcional)</Label>
                <Input
                  id="newPin_rodizio"
                  type="password"
                  value={configPin}
                  onChange={(e) => setConfigPin(e.target.value)}
                  placeholder="Deixe em branco para manter"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveConfig}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: bgColor }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* PWA Install Prompt */}
      <AnimatePresence>
        {showPwaPrompt && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 p-4 flex items-center justify-between z-50"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <Smartphone className="w-6 h-6 text-white" />
              <div>
                <p className="font-semibold text-white">Instalar App</p>
                <p className="text-sm text-white/80">Melhor experiência como aplicativo</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleInstallPwa}>
                <Download className="w-4 h-4 mr-1" />
                Instalar
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowPwaPrompt(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header com ações rotuladas */}
      <header 
        className="flex items-center justify-between px-4 py-3 shadow-lg"
        style={{ backgroundColor: primaryColor }}
      >
        <div 
          ref={logoRef}
          className="flex items-center gap-3 cursor-pointer select-none"
          onTouchStart={handleLogoTouchStart}
          onTouchEnd={handleLogoTouchEnd}
          onMouseDown={handleLogoTouchStart}
          onMouseUp={handleLogoTouchEnd}
          onMouseLeave={handleLogoTouchEnd}
        >
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-12 h-12 object-contain rounded-lg" />
          ) : (
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">{company?.name?.[0]}</span>
            </div>
          )}
          <div>
            <h1 className="text-white font-bold text-lg">{company?.name}</h1>
            {configTableNumber && (
              <Badge className="bg-white/20 text-white border-0">Mesa {configTableNumber}</Badge>
            )}
          </div>
        </div>

        {/* Ações com ícones E rótulos */}
        <div className="flex items-center gap-2">
          {/* Busca */}
          <div className="relative mr-2 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 w-48"
            />
          </div>

          {/* Chamar Garçom - com rótulo */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20 flex items-center gap-2"
            onClick={handleCallWaiter}
          >
            <Bell className="w-5 h-5" />
            <span className="hidden sm:inline">Chamar Garçom</span>
          </Button>

          {/* Ver Conta - com rótulo */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20 flex items-center gap-2"
            onClick={() => setShowBillDialog(true)}
          >
            <Eye className="w-5 h-5" />
            <span className="hidden sm:inline">Ver Conta</span>
          </Button>

          {/* Pedir Conta - com rótulo */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20 flex items-center gap-2"
            onClick={handleAskBill}
          >
            <Receipt className="w-5 h-5" />
            <span className="hidden sm:inline">Pedir Conta</span>
          </Button>

          {/* Tela cheia */}
          {!isFullscreen && (
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={enterFullscreen}>
              <Maximize className="w-5 h-5" />
            </Button>
          )}

          {/* Configurações (senha) */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleOpenAdminSettings}
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* Carrinho */}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20 relative flex items-center gap-2"
            onClick={() => setShowCart(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
                style={{ backgroundColor: secondaryColor, color: primaryColor }}
              >
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Busca mobile */}
      <div className="md:hidden px-4 py-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: textMutedColor }} />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{ 
              backgroundColor: cardBg, 
              borderColor: borderColor,
              color: textColor 
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar com imagens e efeitos */}
        <aside 
          className="w-56 overflow-y-auto p-3"
          style={{ borderRight: `1px solid ${borderColor}` }}
        >
          <h3 className="font-semibold mb-3 text-sm" style={{ color: textMutedColor }}>CATEGORIAS</h3>
          <div className="space-y-2">
            {/* Todos */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCategoryClick(null)}
              className="w-full rounded-xl overflow-hidden transition-all"
              style={{
                backgroundColor: cardBg,
                boxShadow: '0 4px 12px -2px rgba(0,0,0,0.15)',
              }}
            >
              <div className="p-4 text-left">
                <span 
                  className="font-medium"
                  style={{ color: textColor }}
                >
                  Todos os Produtos
                </span>
                <p 
                  className="text-xs mt-1"
                  style={{ color: textMutedColor }}
                >
                  {products.length} itens
                </p>
              </div>
            </motion.button>

            {/* Categorias */}
            {categories.map((cat) => {
              const productCount = products.filter(p => {
                const sub = subcategories.find(s => s.id === p.subcategory_id);
                return sub?.category_id === cat.id;
              }).length;

              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryClick(cat.id)}
                  className="w-full rounded-xl overflow-hidden transition-all"
                  style={{
                    backgroundColor: selectedCategoryId === cat.id ? primaryColor : cardBg,
                    boxShadow: selectedCategoryId === cat.id 
                      ? '0 8px 25px -5px rgba(0,0,0,0.3)' 
                      : '0 4px 12px -2px rgba(0,0,0,0.15)',
                  }}
                >
                  {cat.image_url ? (
                    <div className="relative aspect-[16/9] w-full">
                      <img 
                        src={cat.image_url} 
                        alt={cat.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                        <span className="font-medium text-white">{cat.name}</span>
                        <p className="text-xs text-white/70">{productCount} itens</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-left">
                      <span
                        className="font-medium"
                        style={{ color: selectedCategoryId === cat.id ? '#ffffff' : textColor }}
                      >
                        {cat.name}
                      </span>
                      <p 
                        className="text-xs mt-1"
                        style={{ color: selectedCategoryId === cat.id ? 'rgba(255,255,255,0.7)' : textMutedColor }}
                      >
                        {productCount} itens
                      </p>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Products Grid - Design moderno */}
        <main className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Package className="w-16 h-16 mb-4" style={{ color: textMutedColor }} />
              <p className="text-lg" style={{ color: textMutedColor }}>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map(renderProductCard)}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      {tabletSettings?.footer_text && (
        <footer 
          className="text-center py-3 text-sm"
          style={{ borderTop: `1px solid ${borderColor}`, color: textMutedColor }}
        >
          {tabletSettings.footer_text}
        </footer>
      )}

      {/* Cart Floating Button (mobile) */}
      {cartCount > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center md:hidden"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setShowCart(true)}
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          <Badge 
            className="absolute -top-1 -right-1 w-6 h-6 p-0 flex items-center justify-center"
            style={{ backgroundColor: secondaryColor, color: primaryColor }}
          >
            {cartCount}
          </Badge>
        </motion.button>
      )}

      {/* Product Detail Modal */}
      <Dialog open={!!showProductDetail} onOpenChange={(open) => !open && setShowProductDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          {showProductDetail && (
            <>
              {/* Imagem grande */}
              {showProductDetail.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={showProductDetail.image_url} 
                    alt={showProductDetail.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6 flex-1 overflow-y-auto">
                <DialogHeader className="text-left mb-4">
                  <DialogTitle className="text-2xl">{showProductDetail.name}</DialogTitle>
                  {showProductDetail.is_on_sale && (
                    <Badge variant="destructive" className="w-fit">Em Promoção</Badge>
                  )}
                </DialogHeader>

                {/* Descrição */}
                {showProductDetail.description && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Descrição
                    </h4>
                    <p className="text-muted-foreground">{showProductDetail.description}</p>
                  </div>
                )}

                {/* Composição */}
                {showProductDetail.composition && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Composição / Ingredientes
                    </h4>
                    <p className="text-muted-foreground">{showProductDetail.composition}</p>
                  </div>
                )}

                {/* Preço */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      {showProductDetail.is_on_sale && showProductDetail.sale_price ? (
                        <div>
                          <span className="text-sm text-muted-foreground line-through block">
                            De: R$ {showProductDetail.price.toFixed(2)}
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            R$ {showProductDetail.sale_price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold">
                          R$ {showProductDetail.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => {
                        addToCart(showProductDetail);
                        setShowProductDetail(null);
                      }}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Ver Conta Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Sua Conta
            </DialogTitle>
            <DialogDescription>
              Mesa {configTableNumber || '?'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item no seu pedido ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.quantity}x {item.product_name}</p>
                      {item.optionalsDescription && (
                        <p className="text-xs text-muted-foreground">{item.optionalsDescription}</p>
                      )}
                    </div>
                    <span className="font-medium">R$ {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 text-lg font-bold">
                  <span>Total</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowBillDialog(false)}>Fechar</Button>
            <Button onClick={() => { setShowBillDialog(false); handleAskBill(); }}>
              <Receipt className="w-4 h-4 mr-2" />
              Solicitar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho ({cartCount} {cartCount === 1 ? 'item' : 'itens'})
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Seu carrinho está vazio</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <motion.div 
                    key={`${item.product_id}-${index}`} 
                    layout
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {item.optionalsDescription && (
                        <p className="text-xs text-muted-foreground">{item.optionalsDescription}</p>
                      )}
                      {item.isPizza && item.pizzaData && (
                        <div className="text-xs text-muted-foreground">
                          <span>
                            {item.pizzaData.size} - {item.pizzaData.selected_flavors
                              .map(f => (f.description ? `${f.name} (${f.description})` : f.name))
                              .join(', ')}
                          </span>
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
                      <p className="text-sm font-semibold text-primary">R$ {item.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(index, -1)}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(index, 1)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="pt-4 border-t space-y-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            <Button 
              className="w-full h-12 text-lg" 
              size="lg" 
              onClick={handlePlaceOrder}
              disabled={cart.length === 0 || !configAllowOrdering}
            >
              Enviar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pin">Digite o PIN de acesso</Label>
              <Input
                id="pin"
                type="password"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                placeholder="****"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>Cancelar</Button>
            <Button onClick={handlePinSubmit}>Acessar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Password Dialog */}
      <Dialog open={showAdminPasswordDialog} onOpenChange={setShowAdminPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Tablet
            </DialogTitle>
            <DialogDescription>
              Digite a senha para acessar as configurações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="admin_password">Senha</Label>
              <Input
                id="admin_password"
                type="password"
                value={enteredAdminPassword}
                onChange={(e) => setEnteredAdminPassword(e.target.value)}
                placeholder="********"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdminPasswordSubmit}>Acessar</Button>
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
            <div>
              <Label htmlFor="tableNumber">Número da Mesa</Label>
              <Input
                id="tableNumber"
                value={configTableNumber}
                onChange={(e) => setConfigTableNumber(e.target.value)}
                placeholder="Ex: 1, 2, 3..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mode">Modo de Operação</Label>
              <Select value={configMode} onValueChange={(v) => setConfigMode(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TABLE_ONLY">Mesa Nativa (Pedido direto)</SelectItem>
                  <SelectItem value="TABLE_WITH_COMANDA_QR">Mesa + Comanda QR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allowOrdering">Permitir pedidos</Label>
              <Switch
                id="allowOrdering"
                checked={configAllowOrdering}
                onCheckedChange={setConfigAllowOrdering}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allowPayment">Permitir pagamento</Label>
              <Switch
                id="allowPayment"
                checked={configAllowPayment}
                onCheckedChange={setConfigAllowPayment}
              />
            </div>
            <div>
              <Label htmlFor="newPin">Novo PIN (opcional)</Label>
              <Input
                id="newPin"
                type="password"
                value={configPin}
                onChange={(e) => setConfigPin(e.target.value)}
                placeholder="Deixe em branco para manter"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optionals Dialog */}
      {optionalsProduct && company && (
        <PublicProductOptionalsDialog
          open={!!optionalsProduct}
          onOpenChange={(open) => !open && setOptionalsProduct(null)}
          product={{ id: optionalsProduct.id, name: optionalsProduct.name, price: optionalsProduct.is_on_sale && optionalsProduct.sale_price ? optionalsProduct.sale_price : optionalsProduct.price, product_type: optionalsProduct.product_type } as any}
          companyId={company.id}
          onConfirm={handleOptionalsConfirm}
        />
      )}

      {/* Pizza Dialog */}
      {pizzaProduct && company && (
        <PizzaConfiguratorDialog
          open={!!pizzaProduct}
          onClose={() => setPizzaProduct(null)}
          companyId={company.id}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}

      {/* Geo Validation Dialog */}
      {geoSecurity.settings?.enabled && (
        <GeoValidationDialog
          open={showGeoDialog}
          onClose={() => setShowGeoDialog(false)}
          isValidating={geoSecurity.isValidating}
          isValidSession={geoSecurity.isValidSession}
          error={geoSecurity.error}
          distance={geoSecurity.distance}
          radiusMeters={geoSecurity.settings.radiusMeters}
          timeRemaining={geoSecurity.timeRemaining}
          onValidate={geoSecurity.validateLocation}
        />
      )}

      {/* Geo session indicator */}
      {geoSecurity.settings?.enabled && geoSecurity.isValidSession && geoSecurity.timeRemaining && (
        <div 
          className="fixed bottom-20 left-4 z-40 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg bg-green-600 text-white"
        >
          <MapPin className="h-3 w-3" />
          <span>Localização verificada</span>
          <Clock className="h-3 w-3 ml-1" />
          <span>{Math.floor(geoSecurity.timeRemaining / 60)}:{(geoSecurity.timeRemaining % 60).toString().padStart(2, '0')}</span>
        </div>
      )}
    </div>
  );
}

export default function TenantAutoatendimento() {
  return (
    <TenantProvider>
      <AutoatendimentoContent />
    </TenantProvider>
  );
}
