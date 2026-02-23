import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDeliveryMenu, DeliveryProduct } from '@/hooks/useDeliveryMenu';
import { useCompanyAccessBySlug } from '@/hooks/useCompanyAccessBySlug';
import { usePublicBanners } from '@/hooks/useBanners';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MapPin, Phone, Store, Package, Loader2, Clock, Truck, Info, Sparkles, Plus, Minus, ChevronLeft, ChevronRight, Search, Gift, UtensilsCrossed, Crown } from 'lucide-react';
import { DailyMenuButton } from '@/components/delivery/DailyMenuButton';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { CartButton } from '@/components/menu/CartButton';
import { CartSheet } from '@/components/menu/CartSheet';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { PublicChatWidget } from '@/components/public/PublicChatWidget';
import { MenuLayout, MenuLayoutType } from '@/components/menu/layouts';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { usePizzaLowestPrice } from '@/hooks/usePizzaLowestPrice';
import { useStockFilteredDeliveryCategories } from '@/hooks/useStockFilteredProducts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Helper component for pizza price display
function ProductPriceText({ product }: { product: DeliveryProduct }) {
  const isPizza = isPizzaCategory(product);
  const { data: lowestPrice, isLoading } = usePizzaLowestPrice(
    isPizza ? product.id : undefined,
    { enabled: isPizza }
  );

  if (isPizza) {
    if (isLoading) return <span className="text-sm font-bold text-purple-400">Carregando...</span>;
    if (lowestPrice !== null && lowestPrice !== undefined && lowestPrice > 0) {
      return <span className="text-sm font-bold text-purple-400">A partir de {formatCurrency(lowestPrice)}</span>;
    }
    return <span className="text-sm font-bold text-purple-400">Escolha uma opção</span>;
  }

  if (product.is_on_sale && product.sale_price) {
    return <span className="text-sm font-bold text-orange-400">{formatCurrency(product.sale_price)}</span>;
  }
  if (Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0) {
    return <span className="text-sm font-bold text-purple-400">A partir de {formatCurrency(product.min_optional_price)}</span>;
  }
  if (Number(product.price) === 0) {
    return <span className="text-sm font-bold text-purple-400">Escolha uma opção</span>;
  }
  return <span className="text-sm font-bold text-purple-400">{formatCurrency(product.price)}</span>;
}

const formatWhatsApp = (phone: string) => {
  const numbers = phone.replace(/\D/g, '');
  return `https://wa.me/55${numbers}`;
};

// Format opening hours from JSON to readable format
const formatOpeningHours = (hours: any) => {
  if (!hours) return null;
  
  // If it's a string, just show it
  if (typeof hours === 'string') {
    return <span>{hours}</span>;
  }
  
  // Handle { hours: [], enabled: boolean } format
  if (typeof hours === 'object' && 'hours' in hours) {
    if (!hours.enabled) {
      return <span className="text-red-400">Fechado</span>;
    }
    if (Array.isArray(hours.hours) && hours.hours.length > 0) {
      return hours.hours.map((h: any, idx: number) => (
        <div key={idx} className="flex justify-between gap-4">
          <span>{h.day || h.weekday || `Período ${idx + 1}`}</span>
          <span className="text-orange-400">{h.open || h.start} - {h.close || h.end}</span>
        </div>
      ));
    }
    return <span className="text-yellow-400">Horário não definido</span>;
  }
  
  // Handle array format directly
  if (Array.isArray(hours)) {
    if (hours.length === 0) {
      return <span className="text-yellow-400">Horário não definido</span>;
    }
    return hours.map((h: any, idx: number) => (
      <div key={idx} className="flex justify-between gap-4">
        <span>{h.day || h.weekday || `Período ${idx + 1}`}</span>
        <span className="text-orange-400">{h.open || h.start} - {h.close || h.end}</span>
      </div>
    ));
  }
  
  // Handle object with day keys like { segunda: { open, close }, ... }
  if (typeof hours === 'object') {
    const days = Object.entries(hours);
    if (days.length === 0) {
      return <span className="text-yellow-400">Horário não definido</span>;
    }
    return days.map(([day, time]: [string, any]) => (
      <div key={day} className="flex justify-between gap-4">
        <span className="capitalize">{day}</span>
        <span className="text-orange-400">
          {typeof time === 'object' ? `${time.open || time.start} - ${time.close || time.end}` : time}
        </span>
      </div>
    ));
  }
  
  return <span className="text-yellow-400">Horário não definido</span>;
};

// Featured Products Auto-Scrolling Carousel Component
function FeaturedCarousel({ products, companyId }: { products: DeliveryProduct[]; companyId: string }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (products.length <= 3 || isPaused) return;
    
    const container = scrollRef.current;
    if (!container) return;

    const scrollSpeed = 1; // pixels per frame
    let animationId: number;
    
    const animate = () => {
      if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
        container.scrollLeft = 0;
      } else {
        container.scrollLeft += scrollSpeed;
      }
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [products.length, isPaused]);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 shadow-neon-mixed">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-white">Destaques</h2>
      </div>
      <div 
        ref={scrollRef}
        className="flex gap-3 pb-2 overflow-x-auto scrollbar-hide -mx-4 px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
      >
        {/* Duplicate products for seamless infinite scroll */}
        {[...products, ...products].map((product, idx) => (
          <CarouselProductCard key={`${product.id}-${idx}`} product={product} companyId={companyId} />
        ))}
      </div>
    </section>
  );
}

// Banner Carousel Component - Premium Design
function BannerCarousel({ companyId, slug }: { companyId: string; slug?: string }) {
  const { data: banners = [] } = usePublicBanners(companyId);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handlePrev = () => setCurrentIndex(prev => prev === 0 ? banners.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex(prev => (prev + 1) % banners.length);

  const currentBanner = banners[currentIndex];
  const hasBanners = banners.length > 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Banner Image - Clean, sem texto sobreposto */}
      {hasBanners && (
        <>
          <div className="relative w-full aspect-[16/7] md:aspect-[21/9] overflow-hidden rounded-2xl shadow-neon-mixed">
            {banners.map((banner, index) => (
              <div 
                key={banner.id}
                className={cn(
                  "absolute inset-0 transition-all duration-700",
                  index === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                )}
              >
                <img 
                  src={banner.image_url} 
                  alt={banner.title || 'Banner'}
                  className="w-full h-full object-cover"
                />
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>
            ))}
            
            {banners.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/10 shadow-lg"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/10 shadow-lg"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                
                {/* Premium dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === currentIndex 
                          ? "bg-gradient-to-r from-purple-500 to-orange-500 w-6" 
                          : "bg-white/50 w-1.5 hover:bg-white/70"
                      )}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Description ABAIXO do banner - Neon style */}
          {currentBanner?.description && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/50 via-purple-800/30 to-orange-900/50 border border-purple-500/30 p-4 animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-orange-500/5" />
              <p className="relative text-white text-base md:text-lg font-medium leading-relaxed">
                <span className="text-gradient-orange">✨</span> {currentBanner.description}
              </p>
            </div>
          )}
        </>
      )}

      {/* Roleta Banner - SUPER NEON com luzes e brilho - Sempre visível em mobile e desktop */}
      {slug && (
        <a 
          href={`/roleta/${slug}`}
          className="group relative block overflow-hidden rounded-2xl animate-fade-in hover:scale-[1.03] transition-all duration-500 min-h-[80px]"
        >
          {/* Glow effect background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 rounded-2xl blur-md opacity-75 group-hover:opacity-100 animate-pulse transition-opacity duration-500" />
          <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          
          {/* Sparkle particles */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="absolute top-2 left-[10%] w-1.5 h-1.5 bg-yellow-300 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '1.5s' }} />
            <div className="absolute top-3 left-[30%] w-1 h-1 bg-amber-200 rounded-full animate-ping" style={{ animationDelay: '0.3s', animationDuration: '2s' }} />
            <div className="absolute top-1 left-[50%] w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.6s', animationDuration: '1.8s' }} />
            <div className="absolute top-2 left-[70%] w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.9s', animationDuration: '1.6s' }} />
            <div className="absolute top-3 left-[90%] w-1.5 h-1.5 bg-yellow-200 rounded-full animate-ping" style={{ animationDelay: '1.2s', animationDuration: '2s' }} />
          </div>

          {/* Main container with neon border */}
          <div className="relative bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-[3px] rounded-2xl">
            <div className="relative flex items-center gap-4 bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 rounded-[13px] px-5 py-4 overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              
              {/* Animated gift icon with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-60 animate-pulse" />
                <div className="relative p-3 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-bounce" style={{ animationDuration: '2s' }}>
                  <Gift className="w-6 h-6 text-purple-950" />
                </div>
              </div>
              
              {/* Text with neon effect */}
              <div className="flex-1 text-center">
                <p className="text-base md:text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
                  🎰 Gire a Roleta da Sorte e ganhe prêmios exclusivos!
                </p>
                <p className="text-xs md:text-sm text-amber-200/80 mt-1 font-medium">
                  ⭐ Disponível para clientes VIP com 2+ pedidos ⭐
                </p>
              </div>
              
              {/* Arrow with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity" />
                <ChevronRight className="relative w-7 h-7 text-yellow-400 group-hover:translate-x-2 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Reservation Banner - Elegant style - Sempre visível em mobile e desktop */}
      {slug && (
        <a 
          href={`/reserva/${slug}`}
          className="group relative block overflow-hidden rounded-2xl animate-fade-in hover:scale-[1.02] transition-all duration-500 min-h-[70px]"
        >
          {/* Subtle glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
          
          {/* Main container with elegant border */}
          <div className="relative bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 p-[2px] rounded-2xl">
            <div className="relative flex items-center gap-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-[14px] px-5 py-4 overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-purple-500/10" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
              
              {/* Table icon with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400 rounded-full blur-md opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative p-3 rounded-full bg-gradient-to-br from-purple-500 via-violet-500 to-purple-600 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* Text */}
              <div className="flex-1 text-center">
                <p className="text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-purple-200">
                  🍽️ Deseja fazer uma reserva de mesa?
                </p>
                <p className="text-xs md:text-sm text-purple-300/80 mt-1 font-medium">
                  Reserve agora e garanta seu lugar especial
                </p>
              </div>
              
              {/* Arrow with glow */}
              <div className="relative">
                <div className="absolute inset-0 bg-purple-400 rounded-full blur-sm opacity-30 group-hover:opacity-60 transition-opacity" />
                <ChevronRight className="relative w-6 h-6 text-purple-300 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

// Featured Product Carousel Card
function CarouselProductCard({ product, companyId }: { product: DeliveryProduct; companyId: string }) {
  const { items, addItem, addPizzaItem, updateQuantity } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);

  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);
  const cartItem = items.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const addDirect = () => {
    addItem({ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const handleAdd = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog
    // Pizza dialog handles optionals internally
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    // PRIORITY 3: Simple products go directly to cart
    addDirect();
  };

  const handleIncrement = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    if (cartItem) updateQuantity(cartItem.cartItemId, quantity + 1);
  };

  const handleDecrement = () => {
    if (cartItem) updateQuantity(cartItem.cartItemId, quantity - 1);
  };

  const handleConfirmPizza = (selection: any) => {
    addPizzaItem({
      id: product.id,
      name: product.name,
      price: Number(selection.totalPrice) || 0,
      size: selection.size,
      parts_count: selection.flavors?.length || 1,
      pricing_model: selection.pricing_model || 'average',
      selected_flavors: (selection.flavors || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        removedIngredients: Array.isArray(f.removedIngredients) ? f.removedIngredients : [],
        observation: f.observation || undefined,
      })),
      selected_border: selection.selectedBorder || null,
      selected_optionals: (selection.selectedOptionals || []) as any,
      optionals_total: Number(selection.optionalsTotal) || 0,
      border_total: Number(selection.borderTotal) || 0,
    });

    trackingService.trackAddToCart({ ...product, price: selection.totalPrice, quantity: 1 } as any);
    setPizzaOpen(false);
  };

  return (
    <>
      <Card
        className={cn(
          "min-w-[180px] max-w-[180px] overflow-hidden transition-all snap-start shrink-0 bg-gradient-to-br from-slate-900/90 to-purple-950/90 border-purple-500/20 backdrop-blur-sm",
          quantity > 0 
            ? "ring-2 ring-orange-500 shadow-neon-orange" 
            : "hover:border-purple-400/40 hover:shadow-neon-purple"
        )}
      >
        <div className="h-32 bg-gradient-to-br from-purple-900/30 to-slate-900/50 overflow-hidden relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-10 h-10 text-purple-500/30" />
            </div>
          )}
          {product.is_on_sale && (
            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 border-0 text-white text-xs shadow-lg">
              ✨ Destaque
            </Badge>
          )}
        </div>
        <CardContent className="p-3 bg-gradient-to-b from-transparent to-purple-950/30">
          <h4 className="font-medium text-sm line-clamp-2 mb-1 text-white">{product.name}</h4>
          <div className="flex items-center justify-between">
            <div>
              <ProductPriceText product={product} />
            </div>
            {quantity > 0 ? (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-6 w-6 border-purple-500/30 bg-purple-900/50 text-white hover:bg-purple-800/70" onClick={handleDecrement}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-4 text-center text-white">{quantity}</span>
                <Button size="icon" className="h-6 w-6 bg-gradient-to-r from-purple-600 to-orange-500 border-0 text-white hover:opacity-90" onClick={() => void handleIncrement()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button size="icon" className="h-7 w-7 bg-gradient-to-r from-purple-600 to-orange-500 border-0 text-white hover:opacity-90 shadow-lg" onClick={() => void handleAdd()}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PublicProductOptionalsDialog
        open={optionalsOpen}
        onOpenChange={setOptionalsOpen}
        product={{ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any}
        companyId={companyId}
        onConfirm={(selectedOptions, totalPrice, optionalsDescription) => {
          addItem({ id: product.id, name: product.name, price: effectivePrice } as any, selectedOptions, optionalsDescription);
          trackingService.trackAddToCart({ ...product, price: totalPrice, quantity: 1 } as any);
        }}
      />

      <PizzaConfiguratorDialog
        open={pizzaOpen}
        onClose={() => setPizzaOpen(false)}
        companyId={companyId}
        productId={product.id}
        productName={product.name}
        onConfirm={handleConfirmPizza}
      />
    </>
  );
}

// Product Card - Horizontal layout
function ProductCard({ product, companyId }: { product: DeliveryProduct; companyId: string }) {
  const { items, addItem, addPizzaItem, updateQuantity, removeItem } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);

  const cartItems = items.filter((i) => i.id === product.id);
  const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];
  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const addDirect = () => {
    addItem({ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const handleAdd = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog
    // Pizza dialog handles optionals internally
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    // PRIORITY 3: Simple products go directly to cart
    addDirect();
  };

  const handleConfirmPizza = (selection: any) => {
    addPizzaItem({
      id: product.id,
      name: product.name,
      price: Number(selection.totalPrice) || 0,
      size: selection.size,
      parts_count: selection.flavors?.length || 1,
      pricing_model: selection.pricing_model || 'average',
      selected_flavors: (selection.flavors || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        removedIngredients: Array.isArray(f.removedIngredients) ? f.removedIngredients : [],
        observation: f.observation || undefined,
      })),
      selected_border: selection.selectedBorder || null,
      selected_optionals: (selection.selectedOptionals || []) as any,
      optionals_total: Number(selection.optionalsTotal) || 0,
      border_total: Number(selection.borderTotal) || 0,
    });

    trackingService.trackAddToCart({ ...product, price: selection.totalPrice, quantity: 1 } as any);
    setPizzaOpen(false);
  };

  const handleConfirmOptionals = (selectedOptions: any[], totalPrice: number, optionalsDescription: string) => {
    addItem({ id: product.id, name: product.name, price: effectivePrice } as any, selectedOptions, optionalsDescription);
    trackingService.trackAddToCart({ ...product, price: totalPrice, quantity: 1 } as any);
  };

  const handleIncrement = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }

    if (firstCartItem) updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity + 1);
    else addDirect();
  };

  const handleDecrement = () => {
    if (!firstCartItem) return;

    if (firstCartItem.quantity > 1) updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
    else removeItem(firstCartItem.cartItemId);
  };

  return (
    <>
      <div
        className={cn(
          "flex gap-3 p-4 bg-gradient-to-r from-slate-900/80 to-purple-950/80 border border-purple-500/20 rounded-xl transition-all backdrop-blur-sm hover:border-purple-400/40",
          quantity > 0 && "ring-2 ring-orange-500 shadow-neon-orange"
        )}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white line-clamp-2">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-purple-200/60 line-clamp-2 mt-1">{product.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {product.is_on_sale && product.sale_price ? (
              <>
                <span className="text-xs text-purple-300/50 line-through">{formatCurrency(product.price)}</span>
                <span className="font-bold text-orange-400">{formatCurrency(product.sale_price)}</span>
              </>
            ) : Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0 ? (
              <span className="font-bold text-purple-400">A partir de {formatCurrency(product.min_optional_price)}</span>
            ) : Number(product.price) === 0 ? (
              <span className="font-bold text-purple-400">Escolha uma opção</span>
            ) : (
              <span className="font-bold text-white">{formatCurrency(product.price)}</span>
            )}
            {quantity > 0 ? (
              <div className="flex items-center gap-1 ml-auto">
                <Button size="icon" variant="outline" className="h-8 w-8 border-purple-500/30 bg-purple-900/50 text-white hover:bg-purple-800/70" onClick={handleDecrement}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-6 text-center text-white">{quantity}</span>
                <Button size="icon" className="h-8 w-8 bg-gradient-to-r from-purple-600 to-orange-500 border-0 text-white hover:opacity-90" onClick={() => void handleIncrement()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="ml-auto bg-gradient-to-r from-purple-600 to-orange-500 text-white border-0 hover:opacity-90 shadow-lg"
                onClick={() => void handleAdd()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
        </div>
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/50 to-slate-900/50 shrink-0 border border-purple-500/10">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-purple-500/30" />
            </div>
          )}
        </div>
      </div>

      <PublicProductOptionalsDialog
        open={optionalsOpen}
        onOpenChange={setOptionalsOpen}
        product={{ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any}
        companyId={companyId}
        onConfirm={handleConfirmOptionals}
      />

      <PizzaConfiguratorDialog
        open={pizzaOpen}
        onClose={() => setPizzaOpen(false)}
        companyId={companyId}
        productId={product.id}
        productName={product.name}
        onConfirm={handleConfirmPizza}
      />
    </>
  );
}

function PublicMenuBySlugContent() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useDeliveryMenu(slug || '');
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessBySlug(slug);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ALL HOOKS CALLED UNCONDITIONALLY AT THE TOP
  const allProducts = useMemo(() => {
    if (!data) return [];
    return data.categories.flatMap(cat =>
      cat.subcategories.flatMap(sub =>
        sub.products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.is_on_sale && p.sale_price ? p.sale_price : p.price,
          product_type: p.product_type,
          has_flavors: p.has_flavors,
        }))
      )
    );
  }, [data]);

  const menuUrl = useMemo(() => {
    if (!slug) return '';
    return `${window.location.origin}/${slug}`;
  }, [slug]);

  const { categories: stockFilteredCategories, unavailableProductIds } = useStockFilteredDeliveryCategories(
    data?.categories || [],
    data?.company?.id || ''
  );

  const availableFeaturedProducts = useMemo(() => {
    if (!data) return [];
    return data.featuredProducts.filter(p => !unavailableProductIds.has(p.id));
  }, [data, unavailableProductIds]);

  const availableSaleProducts = useMemo(() => {
    if (!data) return [];
    return data.saleProducts.filter(p => !unavailableProductIds.has(p.id));
  }, [data, unavailableProductIds]);

  // CONDITIONAL GUARDS IN JSX ONLY - AFTER ALL HOOKS
  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={accessStatus.companyName} />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold mb-2">Empresa não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </Card>
      </div>
    );
  }

  const { company, categories, featuredProducts, saleProducts, neighborhoods } = data;

  const displayCategories = selectedCategory 
    ? stockFilteredCategories.filter(c => c.id === selectedCategory)
    : stockFilteredCategories;

  return (
    <div className="min-h-screen bg-animated-gradient pb-24">
      {/* Premium Fixed Header with Neon glow */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-purple-950/95 via-slate-950/95 to-purple-950/95 backdrop-blur-xl border-b border-purple-500/20 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-orange-500/20 shrink-0 ring-2 ring-purple-500/30 shadow-neon-purple">
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center shrink-0 shadow-neon-mixed">
                <Store className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white truncate">{company.name}</h1>
              <p className="text-xs text-purple-300/70">Delivery Online</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-purple-500/20">
              <Search className="h-5 w-5" />
            </Button>
            
            {/* Loyalty Portal Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/20"
              onClick={() => window.open(`/${slug}/fidelidade`, '_blank')}
              title="Programa de Fidelidade"
            >
              <Crown className="h-5 w-5" />
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-purple-500/20">
                  <Info className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-gradient-to-br from-slate-900 to-purple-950 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Store className="w-5 h-5 text-purple-400" />
                    {company.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {company.address && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <MapPin className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Endereço</p>
                        <p className="text-sm text-purple-200/70">{company.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {company.whatsapp && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Phone className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Telefone / WhatsApp</p>
                        <a 
                          href={formatWhatsApp(company.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orange-400 hover:text-orange-300"
                        >
                          {company.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}

                  {neighborhoods.length > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Truck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Taxa de Entrega</p>
                        <div className="text-sm text-purple-200/70 space-y-1 mt-1">
                          {neighborhoods.slice(0, 5).map((n: any) => (
                            <div key={n.id} className="flex justify-between gap-4">
                              <span>{n.neighborhood}</span>
                              <span className="font-medium text-orange-400">{formatCurrency(n.fee)}</span>
                            </div>
                          ))}
                          {neighborhoods.length > 5 && (
                            <p className="text-xs text-purple-300/50">E mais {neighborhoods.length - 5} bairros...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {company.opening_hours && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">Horário de Atendimento</p>
                        <div className="text-sm text-purple-200/70 space-y-1 mt-1">
                          {formatOpeningHours(company.opening_hours)}
                        </div>
                      </div>
                    </div>
                  )}

                  {company.welcome_message && (
                    <div className="p-4 bg-gradient-to-r from-purple-500/20 to-orange-500/20 rounded-xl border border-purple-500/30">
                      <p className="text-sm text-white">{company.welcome_message}</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto">
        {/* Banner Carousel with description below and wheel link */}
        <div className="p-4">
          <BannerCarousel companyId={company.id} slug={slug} />

          {/* Menu do Dia - only shown when enabled */}
          {company.daily_menu_enabled && company.daily_menu_image_url && (
            <div className="mt-3">
              <DailyMenuButton
                imageUrl={company.daily_menu_image_url}
                description={company.daily_menu_description}
              />
            </div>
          )}
        </div>

        {/* Premium Category Pills with neon effect */}
        <div className="sticky top-[64px] z-10 bg-gradient-to-r from-slate-950/95 via-purple-950/95 to-slate-950/95 backdrop-blur-xl py-3 px-4 border-b border-purple-500/20">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    selectedCategory === cat.id 
                      ? "bg-gradient-to-r from-purple-600 to-orange-500 text-white border-0 shadow-neon-mixed" 
                      : "bg-purple-900/30 border-purple-500/30 text-purple-200 hover:bg-purple-800/40 hover:border-purple-400/50 hover:text-white"
                  )}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="px-4 space-y-6 py-4">
          {/* Featured Products Auto-Scrolling Carousel with neon styling */}
          {featuredProducts.length > 0 && !selectedCategory && (
            <FeaturedCarousel products={featuredProducts} companyId={company.id} />
          )}

          {/* Categories and Products - Use layout from company settings */}
          {(() => {
            const layout = (company.public_menu_layout as MenuLayoutType) || 'classic';
            // Adapt categories for MenuLayout component - include product_type, has_flavors, and subcategory!
            const menuCategories = displayCategories.map(cat => ({
              id: cat.id,
              name: cat.name,
              subcategories: cat.subcategories.map(sub => ({
                id: sub.id,
                name: sub.name,
                products: sub.products.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  price: p.price,
                  image_url: p.image_url,
                  is_featured: p.is_featured,
                  is_on_sale: p.is_on_sale,
                  sale_price: p.sale_price,
                  product_type: p.product_type,
                  has_flavors: p.has_flavors,
                  min_optional_price: p.min_optional_price,
                  // CRITICAL: Pass subcategory structure for isPizzaCategory() detection
                  subcategory: p.subcategory,
                }))
              }))
            }));
            return <MenuLayout layout={layout} categories={menuCategories} companyId={company.id} />;
          })()}
        </div>
      </main>


      {/* Cart Button and Sheet - Only rendered when content is loaded */}
      <CartButton />
      <CartSheet 
        whatsapp={company.whatsapp} 
        companyName={company.name}
        companyId={company.id}
        allProducts={allProducts}
        mode="delivery"
      />

      {/* AI Chat Widget */}
      <PublicChatWidget 
        companyId={company.id} 
        companyInfo={{
          name: company.name,
          address: company.address,
          whatsapp: company.whatsapp,
          openingHours: company.opening_hours,
        }}
        menuUrl={menuUrl}
      />
    </div>
  );
}

export default function PublicMenuBySlug() {
  return (
    <CartProvider>
      <PublicMenuBySlugContent />
    </CartProvider>
  );
}
