import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMenuByToken, MenuProduct } from '@/hooks/useMenuByToken';
import { usePublicBanners } from '@/hooks/useBanners';
import { useCompanyAccessByToken } from '@/hooks/useCompanyAccess';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CartButton } from '@/components/menu/CartButton';
import { MenuLayout, MenuLayoutType } from '@/components/menu/layouts';
import { CartSheet } from '@/components/menu/CartSheet';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { MarketingScripts } from '@/components/marketing/MarketingScripts';
import { SocialLinks } from '@/components/marketing/SocialLinks';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { PublicChatWidget } from '@/components/public/PublicChatWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { validateTokenPrefix, isLegacyToken } from '@/utils/tokenValidation';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { usePizzaLowestPrice } from '@/hooks/usePizzaLowestPrice';
import { useStockFilteredMenuCategories } from '@/hooks/useStockFilteredProducts';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Loader2,
  MapPin,
  Package,
  Percent,
  Phone,
  Plus,
  Minus,
  Search,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Helper component for pizza price display in this file
function TokenProductPriceText({ product }: { product: MenuProduct }) {
  const isPizza = isPizzaCategory(product);
  const { data: lowestPrice, isLoading } = usePizzaLowestPrice(
    isPizza ? product.id : undefined,
    { enabled: isPizza }
  );

  if (isPizza) {
    if (isLoading) return <span className="text-sm font-bold text-primary">Carregando...</span>;
    if (lowestPrice !== null && lowestPrice !== undefined && lowestPrice > 0) {
      return <span className="text-sm font-bold text-primary">A partir de {formatCurrency(lowestPrice)}</span>;
    }
    return <span className="text-sm font-bold text-primary">Escolha uma opção</span>;
  }

  if (product.is_on_sale && product.sale_price) {
    return <span className="text-sm font-bold text-destructive">{formatCurrency(product.sale_price)}</span>;
  }
  if (Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0) {
    return <span className="text-sm font-bold text-primary">A partir de {formatCurrency(product.min_optional_price)}</span>;
  }
  if (Number(product.price) === 0) {
    return <span className="text-sm font-bold text-primary">Escolha uma opção</span>;
  }
  return <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>;
}

const formatWhatsApp = (phone: string) => {
  const numbers = phone.replace(/\D/g, '');
  return `https://wa.me/55${numbers}`;
};

function BannerCarousel({ companyId }: { companyId: string }) {
  const { data: banners = [] } = usePublicBanners(companyId);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full aspect-[16/7] md:aspect-[21/9] overflow-hidden rounded-xl bg-muted">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={cn('absolute inset-0 transition-opacity duration-500', i === idx ? 'opacity-100' : 'opacity-0')}
        >
          <img src={b.image_url} alt={b.title || 'Banner'} className="w-full h-full object-cover" loading="lazy" />
          {b.description && (
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-base md:text-lg font-medium line-clamp-2">{b.description}</p>
            </div>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
            onClick={() => setIdx((p) => (p === 0 ? banners.length - 1 : p - 1))}
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
            onClick={() => setIdx((p) => (p + 1) % banners.length)}
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                className={cn('h-2 rounded-full transition-all', i === idx ? 'w-4 bg-white' : 'w-2 bg-white/50')}
                onClick={() => setIdx(i)}
                aria-label={`Ir para banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CarouselProductCard({ product, companyId }: { product: MenuProduct; companyId: string }) {
  const { items, addItem, addPizzaItem, updateQuantity, removeItem } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [open, setOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);
  const cartItems = items.filter((i) => i.id === product.id);
  const qty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];

  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const addDirect = () => {
    addItem({ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const add = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog first
    // Pizza dialog handles optionals internally
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOpen(true);
      return;
    }

    // PRIORITY 3: Simple product - add directly
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

  const decrease = () => {
    if (firstCartItem) {
      if (firstCartItem.quantity > 1) {
        updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
      } else {
        removeItem(firstCartItem.cartItemId);
      }
    }
  };

  const increase = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog first
    if (isPizza) {
      setPizzaOpen(true);
      return;
    }

    // PRIORITY 2: Products with optionals open optionals dialog
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOpen(true);
      return;
    }

    // PRIORITY 3: Simple product - increment or add
    if (firstCartItem) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity + 1);
    } else {
      addDirect();
    }
  };

  return (
    <>
      <Card className={cn('min-w-[180px] max-w-[180px] overflow-hidden snap-start', qty > 0 ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md')}>
        <div className="h-32 bg-muted overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <Package className="w-10 h-10 text-primary/30" />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
          <div className="flex items-center justify-between gap-2">
            <div>
              <TokenProductPriceText product={product} />
            </div>

            {qty > 0 ? (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={decrease}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-4 text-center">{qty}</span>
                <Button size="icon" className="h-6 w-6" onClick={increase}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button size="icon" className="h-7 w-7" onClick={() => void add()}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PublicProductOptionalsDialog
        open={open}
        onOpenChange={setOpen}
        companyId={companyId}
        product={{ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any}
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

function HorizontalProductCard({ product, companyId }: { product: MenuProduct; companyId: string }) {
  const { items, addItem, addPizzaItem, updateQuantity, removeItem } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsOpen, setOptionalsOpen] = useState(false);
  const [pizzaOpen, setPizzaOpen] = useState(false);

  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = isPizzaCategory(product);

  const cartItems = items.filter((i) => i.id === product.id);
  const qty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const firstCartItem = cartItems[0];

  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const addDirect = () => {
    addItem({ id: product.id, name: product.name, price: effectivePrice, product_type: product.product_type, has_flavors: product.has_flavors } as any);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const handleAdd = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog first
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

    // PRIORITY 3: Simple product - add directly
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

  const handleConfirmOptionals = (
    selectedOptions: any[],
    totalPrice: number,
    optionalsDescription: string
  ) => {
    addItem(
      { id: product.id, name: product.name, price: effectivePrice } as any,
      selectedOptions,
      optionalsDescription
    );
    trackingService.trackAddToCart({ ...product, price: totalPrice, quantity: 1 } as any);
  };

  const decrease = () => {
    if (!firstCartItem) return;

    if (firstCartItem.quantity > 1) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity - 1);
    } else {
      removeItem(firstCartItem.cartItemId);
    }
  };

  const increase = async () => {
    // PRIORITY 1: Pizza products ALWAYS open pizza dialog first
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

    // PRIORITY 3: Simple product - increment or add
    if (firstCartItem) {
      updateQuantity(firstCartItem.cartItemId, firstCartItem.quantity + 1);
    } else {
      addDirect();
    }
  };

  return (
    <>
      <div className={cn('flex gap-3 p-3 bg-card border border-border rounded-lg transition-all', qty > 0 && 'ring-2 ring-primary')}>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground line-clamp-2">{product.name}</h4>
          {product.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>}

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {product.is_on_sale && product.sale_price ? (
              <>
                <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                <span className="font-bold text-destructive">{formatCurrency(product.sale_price)}</span>
              </>
            ) : Number(product.price) === 0 && product.min_optional_price && product.min_optional_price > 0 ? (
              <span className="font-bold text-foreground">A partir de {formatCurrency(product.min_optional_price)}</span>
            ) : Number(product.price) === 0 ? (
              <span className="font-bold text-foreground">Escolha uma opção</span>
            ) : (
              <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
            )}

            {qty > 0 ? (
              <div className="flex items-center gap-1 ml-auto">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={decrease}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-5 text-center">{qty}</span>
                <Button size="icon" className="h-7 w-7" onClick={() => void increase()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground ml-auto"
                onClick={() => void handleAdd()}
              >
                {isPizza ? 'Escolher sabores' : 'Escolha uma Opção'}
              </Badge>
            )}
          </div>
        </div>

        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground/30" />
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

function MenuContent() {
  const { token } = useParams<{ token: string }>();

  const isValidToken = token && (validateTokenPrefix(token, 'menu') || isLegacyToken(token));

  const { company, categories, featuredProducts, saleProducts, isLoading } = useMenuByToken(isValidToken ? token : undefined, 'menu');
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessByToken(company?.id);
  const { items: cartItems } = useCart();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter categories based on stock availability - products with low stock are hidden
  const { categories: stockFilteredCategories, unavailableProductIds } = useStockFilteredMenuCategories(
    categories,
    company?.id
  );

  // Filter featured and sale products based on stock
  const availableFeaturedProducts = useMemo(() => 
    featuredProducts.filter(p => !unavailableProductIds.has(p.id)),
    [featuredProducts, unavailableProductIds]
  );
  const availableSaleProducts = useMemo(() =>
    saleProducts.filter(p => !unavailableProductIds.has(p.id)),
    [saleProducts, unavailableProductIds]
  );

  const allProducts = useMemo(() => stockFilteredCategories.flatMap((c) => c.subcategories.flatMap((s) => s.products.map((p) => ({ id: p.id, name: p.name, price: p.is_on_sale && p.sale_price ? p.sale_price : p.price, product_type: p.product_type, has_flavors: p.has_flavors } as any)))), [stockFilteredCategories]);

  if (!token || (!isValidToken && !isLegacyToken(token))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Token inválido</h1>
          <p className="text-muted-foreground">Este token não é válido para o cardápio delivery.</p>
        </div>
      </div>
    );
  }

  // Show loading only for a short time, then show error if nothing loads
  if (isLoading && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessLoading && company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (company && accessStatus && !accessStatus.hasAccess) {
    return <StoreUnavailable companyName={company.name} />;
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Link inválido</h1>
          <p className="text-muted-foreground">Este link de cardápio não existe ou foi desativado.</p>
        </div>
      </div>
    );
  }

  const displayCategories = selectedCategory ? categories.filter((c) => c.id === selectedCategory) : categories;

  return (
    <div className="min-h-screen bg-background pb-24">
      <MarketingScripts companyId={company.id} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{company.name}</h1>
              {company.address && <p className="text-xs text-muted-foreground truncate">{company.address}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Detalhes">
                  <Info className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {company.name}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {company.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Endereço</p>
                        <p className="text-sm text-muted-foreground">{company.address}</p>
                      </div>
                    </div>
                  )}

                  {company.whatsapp && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Telefone / WhatsApp</p>
                        <a href={formatWhatsApp(company.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          {company.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Placeholders (dados completos vêm do slug-based DeliveryMenu) */}
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Taxa de entrega</p>
                      <p className="text-sm text-muted-foreground">Consulte pelo WhatsApp ao finalizar o pedido.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Horário</p>
                      <p className="text-sm text-muted-foreground">Consulte pelo WhatsApp.</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto">
        {/* Banner carousel */}
        <div className="p-4">
          <BannerCarousel companyId={company.id} />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="sticky top-[60px] z-30 bg-background border-b border-border px-4 py-3">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="px-4 py-4 space-y-6">
          {/* Destaques */}
          {featuredProducts.length > 0 && !selectedCategory && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Destaques</h2>
              </div>
              <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {featuredProducts.map((p) => (
                    <CarouselProductCard key={p.id} product={p} companyId={company.id} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Promoções */}
          {saleProducts.length > 0 && !selectedCategory && (
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-bold text-destructive">Promoções</h2>
              </div>
              <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {saleProducts.map((p) => (
                    <CarouselProductCard key={p.id} product={p} companyId={company.id} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Produtos */}
          {displayCategories.length === 0 ? (
            <Card className="text-center p-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-display font-semibold mb-2">Nenhum produto disponível</h2>
              <p className="text-muted-foreground">Este cardápio não tem itens ativos no momento.</p>
            </Card>
          ) : (
            (() => {
              const layout = (company.public_menu_layout as MenuLayoutType) || 'classic';
              return <MenuLayout layout={layout} categories={displayCategories} companyId={company.id} />;
            })()
          )}

          <SocialLinks companyId={company.id} className="mt-8 border-t border-border" />
        </div>
      </main>

      {cartItems.length > 0 && <CartButton />}
      <CartSheet companyId={company.id} companyName={company.name} whatsapp={company.whatsapp} mode="delivery" allProducts={allProducts} />
      
      <PublicChatWidget 
        companyId={company.id} 
        companyInfo={{
          name: company.name,
          address: company.address || undefined,
          whatsapp: company.whatsapp || undefined,
        }}
        menuItems={allProducts.slice(0, 30).map(p => ({ name: p.name, price: p.price }))}
        menuUrl={window.location.href}
      />
    </div>
  );
}

export default function PublicMenuByToken() {
  return (
    <CartProvider>
      <ErrorBoundary>
        <MenuContent />
      </ErrorBoundary>
    </CartProvider>
  );
}
