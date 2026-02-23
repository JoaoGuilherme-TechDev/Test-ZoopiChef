import { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDeliveryMenu, DeliveryProduct } from '@/hooks/useDeliveryMenu';
import { useCompanyAccessBySlug } from '@/hooks/useCompanyAccessBySlug';
import { usePublicBanners } from '@/hooks/useBanners';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MapPin, Phone, Store, Package, Loader2, Clock, Truck, Info, Sparkles, Percent, Plus, Minus, ChevronLeft, ChevronRight, Search, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CartProvider, useCart } from '@/contexts/CartContext';
import type { SelectedOption } from '@/contexts/CartContext';
import { CartButton } from '@/components/menu/CartButton';
import { CartSheet } from '@/components/menu/CartSheet';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { StoreUnavailable } from '@/components/public/StoreUnavailable';
import { PublicChatWidget } from '@/components/public/PublicChatWidget';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { ProductPriceDisplay } from '@/components/menu/ProductPriceDisplay';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatWhatsApp = (phone: string) => {
  const numbers = phone.replace(/\D/g, '');
  return `https://wa.me/55${numbers}`;
};

// Banner Carousel Component
function BannerCarousel({ companyId }: { companyId: string }) {
  const { data: banners = [] } = usePublicBanners(companyId);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const handlePrev = () => setCurrentIndex(prev => prev === 0 ? banners.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex(prev => (prev + 1) % banners.length);

  return (
    <div className="relative w-full aspect-[16/7] md:aspect-[21/9] overflow-hidden rounded-lg">
      {banners.map((banner, index) => (
        <div 
          key={banner.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            index === currentIndex ? "opacity-100" : "opacity-0"
          )}
        >
          <img 
            src={banner.image_url} 
            alt={banner.title || 'Banner'}
            className="w-full h-full object-cover"
          />
          {banner.description && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-lg font-medium">{banner.description}</p>
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
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentIndex ? "bg-white w-4" : "bg-white/50"
                )}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Featured Product Carousel Card
function CarouselProductCard({ product, companyId }: { product: DeliveryProduct; companyId: string }) {
  const { items, addItem, updateQuantity } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsOpen, setOptionalsOpen] = useState(false);

  const cartItem = items.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const handleConfirm = useCallback((selectedOptions: SelectedOption[], _totalPrice: number) => {
    addItem({ id: product.id, name: product.name, price: effectivePrice }, selectedOptions);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
    toast.success(`${product.name} adicionado`);
  }, [addItem, product, effectivePrice]);

  const handleAdd = async () => {
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }
    addItem({ id: product.id, name: product.name, price: effectivePrice });
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const handleIncrement = () => {
    if (cartItem) updateQuantity(cartItem.cartItemId, quantity + 1);
  };

  const handleDecrement = () => {
    if (cartItem) updateQuantity(cartItem.cartItemId, quantity - 1);
  };

  return (
    <>
      <Card className={cn(
        "min-w-[180px] max-w-[180px] overflow-hidden transition-all snap-start shrink-0",
        quantity > 0 ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
      )}>
        <div className="h-32 bg-muted overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <Package className="w-10 h-10 text-primary/30" />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
          <div className="flex items-center justify-between">
            <div>
              <ProductPriceDisplay 
                product={product} 
                variant="compact"
              />
            </div>
            {quantity > 0 ? (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-6 w-6" onClick={handleDecrement}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-4 text-center">{quantity}</span>
                <Button size="icon" className="h-6 w-6" onClick={handleIncrement}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button size="icon" className="h-7 w-7" onClick={() => void handleAdd()}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PublicProductOptionalsDialog
        open={optionalsOpen}
        onOpenChange={setOptionalsOpen}
        product={{ id: product.id, name: product.name, price: effectivePrice }}
        companyId={companyId}
        onConfirm={(selectedOptions, totalPrice) => handleConfirm(selectedOptions, totalPrice)}
      />
    </>
  );
}

// Product Card - Horizontal layout
function ProductCard({ product, companyId }: { product: DeliveryProduct; companyId: string }) {
  const { items, addItem, updateQuantity } = useCart();
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);
  const [optionalsOpen, setOptionalsOpen] = useState(false);

  const cartItem = items.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  const effectivePrice = product.is_on_sale && product.sale_price ? product.sale_price : product.price;

  const handleConfirm = useCallback((selectedOptions: SelectedOption[], _totalPrice: number) => {
    addItem({ id: product.id, name: product.name, price: effectivePrice }, selectedOptions);
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
    toast.success(`${product.name} adicionado`);
  }, [addItem, product, effectivePrice]);

  const handleAdd = async () => {
    const hasOptionals = await checkProduct(product.id);
    if (hasOptionals) {
      setOptionalsOpen(true);
      return;
    }
    addItem({ id: product.id, name: product.name, price: effectivePrice });
    trackingService.trackAddToCart({ ...product, price: effectivePrice, quantity: 1 } as any);
  };

  const handleIncrement = () => {
    if (cartItem) updateQuantity(cartItem.cartItemId, quantity + 1);
  };

  const handleDecrement = () => {
    if (cartItem) updateQuantity(cartItem.cartItemId, quantity - 1);
  };

  return (
    <>
      <div className={cn(
        "flex gap-3 p-3 bg-card border border-border rounded-lg transition-all",
        quantity > 0 && "ring-2 ring-primary"
      )}>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-primary line-clamp-2">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ProductPriceDisplay 
              product={product} 
              variant="compact"
            />
            {quantity > 0 ? (
              <div className="flex items-center gap-1 ml-auto">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleDecrement}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-5 text-center">{quantity}</span>
                <Button size="icon" className="h-7 w-7" onClick={handleIncrement}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground ml-auto"
                onClick={() => void handleAdd()}
              >
                Escolha uma Opção
              </Badge>
            )}
          </div>
        </div>
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
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
        product={{ id: product.id, name: product.name, price: effectivePrice }}
        companyId={companyId}
        onConfirm={(selectedOptions, totalPrice) => handleConfirm(selectedOptions, totalPrice)}
      />
    </>
  );
}

function DeliveryMenuContent() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useDeliveryMenu(slug || '');
  const { data: accessStatus, isLoading: accessLoading } = useCompanyAccessBySlug(slug);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allProducts = useMemo(() => {
    if (!data) return [];
    return data.categories.flatMap(cat => 
      cat.subcategories.flatMap(sub => 
        sub.products.map(p => ({ 
          id: p.id, 
          name: p.name, 
          price: p.is_on_sale && p.sale_price ? p.sale_price : p.price 
        }))
      )
    );
  }, [data]);

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
    ? categories.filter(c => c.id === selectedCategory)
    : categories;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Fixed Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <h1 className="text-lg font-bold truncate">{company.name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {company.reservations_enabled && (
              <Link to={`/reserva/${slug}`}>
                <Button variant="ghost" size="icon" title="Fazer Reserva">
                  <CalendarDays className="h-5 w-5" />
                </Button>
              </Link>
            )}
            
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
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
                        <a 
                          href={formatWhatsApp(company.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {company.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}

                  {neighborhoods.length > 0 && (
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Taxa de Entrega</p>
                        <div className="text-sm text-muted-foreground space-y-1 mt-1">
                          {neighborhoods.slice(0, 5).map((n: any) => (
                            <div key={n.id} className="flex justify-between gap-4">
                              <span>{n.neighborhood}</span>
                              <span className="font-medium">{formatCurrency(n.fee)}</span>
                            </div>
                          ))}
                          {neighborhoods.length > 5 && (
                            <p className="text-xs">E mais {neighborhoods.length - 5} bairros...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {company.opening_hours && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Horário de Atendimento</p>
                        <p className="text-sm text-muted-foreground">
                          {typeof company.opening_hours === 'object' 
                            ? JSON.stringify(company.opening_hours)
                            : company.opening_hours
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {company.welcome_message && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{company.welcome_message}</p>
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
        {/* Banner Carousel */}
        <div className="p-4">
          <BannerCarousel companyId={company.id} />
        </div>

        {/* Category Pills */}
        <div className="sticky top-[60px] z-10 bg-background py-3 px-4 border-b border-border">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
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

        <div className="px-4 space-y-6 py-4">
          {/* Featured Products Carousel */}
          {featuredProducts.length > 0 && !selectedCategory && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold">Destaques</h2>
              </div>
              <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {featuredProducts.map((product) => (
                    <CarouselProductCard key={product.id} product={product} companyId={company.id} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Sale Products Carousel */}
          {saleProducts.length > 0 && !selectedCategory && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-bold text-destructive">Promoções</h2>
              </div>
              <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
                <div className="flex gap-3 pb-2">
                  {saleProducts.map((product) => (
                    <CarouselProductCard key={product.id} product={product} companyId={company.id} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </section>
          )}

          {/* Products by Category */}
          {categories.length === 0 ? (
            <Card className="text-center p-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-display font-semibold mb-2">Cardápio em construção</h2>
              <p className="text-muted-foreground">Em breve teremos produtos disponíveis para delivery.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {displayCategories.map((category) => (
                <section key={category.id}>
                  {/* Category Header */}
                  <div className="bg-foreground text-background px-4 py-3 rounded-lg mb-4">
                    <h2 className="text-lg font-bold text-center">{category.name}</h2>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.subcategories.flatMap(sub => sub.products).map((product) => (
                      <ProductCard key={product.id} product={product} companyId={company.id} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4 mt-8">
        <div className="max-w-3xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {company.name}. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Cart */}
      <CartButton />
      <CartSheet 
        companyId={company.id}
        companyName={company.name} 
        whatsapp={company.whatsapp} 
        mode="delivery"
        allProducts={allProducts}
      />
      
      <PublicChatWidget 
        companyId={company.id} 
        companyInfo={{
          name: company.name,
          address: company.address || undefined,
          whatsapp: company.whatsapp || undefined,
          openingHours: company.opening_hours,
        }}
        menuItems={allProducts.slice(0, 30).map(p => ({ name: p.name, price: p.price }))}
        menuUrl={window.location.href}
      />
    </div>
  );
}

export default function DeliveryMenu() {
  return (
    <CartProvider>
      <DeliveryMenuContent />
    </CartProvider>
  );
}
