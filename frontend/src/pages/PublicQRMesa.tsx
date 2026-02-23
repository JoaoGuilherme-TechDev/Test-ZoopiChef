import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTableByQRToken } from '@/hooks/useTableQRTokens';
import { useDeliveryMenu, DeliveryProduct } from '@/hooks/useDeliveryMenu';
import { useQRSession, CustomerDietaryInfo } from '@/hooks/useQRSession';
import { useQRSecureSession } from '@/hooks/useQRSecureSession';
import { QRSecureGate } from '@/components/qr/QRSecureGate';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import { QRIdentificationDialogEnhanced } from '@/components/qrcode/QRIdentificationDialogEnhanced';
import { QRActionButtons } from '@/components/qrcode/QRActionButtons';
import { DietaryAlertBanner } from '@/components/customer';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { CartButton } from '@/components/menu/CartButton';
import { CartSheet } from '@/components/menu/CartSheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, AlertCircle, Store, Package, Plus, Minus, Sparkles, User, MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackingService } from '@/lib/marketing/trackingService';
import { useScrollSpyNav, FloatingCategoryBadge } from '@/components/menu/ScrollSpyCategoryNav';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Product Card for QR Code mode
function QRProductCard({ product, companyId }: { product: DeliveryProduct; companyId: string }) {
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

  const handleIncrement = async () => {
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
          "flex gap-3 p-3 bg-card border border-border rounded-lg transition-all",
          quantity > 0 && "ring-2 ring-primary"
        )}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-primary line-clamp-2">{product.name}</h4>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {product.is_on_sale && product.sale_price ? (
              <>
                <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                <span className="font-bold text-destructive">{formatCurrency(product.sale_price)}</span>
              </>
            ) : (
              <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
            )}
            {quantity > 0 ? (
              <div className="flex items-center gap-1 ml-auto">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleDecrement}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-bold text-sm w-5 text-center">{quantity}</span>
                <Button size="icon" className="h-7 w-7" onClick={() => void handleIncrement()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground ml-auto"
                onClick={() => void handleAdd()}
              >
                {isPizza ? 'Escolher sabores' : 'Adicionar'}
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

function PublicQRMesaContent() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isMenuOnly = searchParams.get('mode') === 'menu';
  
  // State to track if secure session is validated (GPS check passed)
  const [secureSessionValidated, setSecureSessionValidated] = useState(isMenuOnly); // Skip for menu-only mode
  
  const { data: qrData, isLoading: qrLoading, error: qrError } = useTableByQRToken(token || null);
  
  const companySlug = qrData?.company?.slug;
  const { data: menuData, isLoading: menuLoading } = useDeliveryMenu(companySlug || '');

  const companyId = qrData?.company?.id || null;
  const tableId = qrData?.table?.id || null;
  const tableNumber = qrData?.table?.number || null;

  // Use the new secure session hook for activity tracking
  const { 
    isAuthenticated: secureAuthenticated, 
    recordActivity,
    session: secureSession,
  } = useQRSecureSession();

  const {
    session,
    customerDietary,
    isLoading: sessionLoading,
    isIdentifying,
    isIdentified,
    customerName,
    createSession,
    updateActivity,
    callWaiter,
    requestBill,
  } = useQRSession({
    companyId,
    sessionType: 'table',
    tableId,
    tableNumber,
  });
  
  // Handle secure session success - GPS validation passed
  const handleSecureSessionSuccess = useCallback((sessionData: { companyId: string; tableId?: string }) => {
    setSecureSessionValidated(true);
  }, []);

  // Build flattened subcategory list for scroll spy
  const subcategoryGroups = useMemo(() => {
    if (!menuData) return [];
    const groups: Array<{
      subcategory: { id: string; name: string };
      category: { id: string; name: string };
      products: DeliveryProduct[];
    }> = [];
    
    menuData.categories.forEach(cat => {
      cat.subcategories.forEach(sub => {
        if (sub.products.length > 0) {
          groups.push({
            subcategory: { id: sub.id, name: sub.name },
            category: { id: cat.id, name: cat.name },
            products: sub.products,
          });
        }
      });
    });
    
    return groups;
  }, [menuData]);

  // Build product list for cart (unchanged)
  const allProducts = useMemo(() => {
    if (!menuData) return [];
    return menuData.categories.flatMap(cat =>
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
  }, [menuData]);

  // Scroll spy hook - use window scroll since this page scrolls the body
  const {
    activeId: activeSubcategoryId,
    registerRef: registerSubcategoryRef,
    scrollToSection: scrollToSubcategory,
  } = useScrollSpyNav(
    subcategoryGroups.map(g => g.subcategory.id),
    { offset: 160, useWindowScroll: true }
  );

  // Get active category from subcategory
  const activeCategoryId = useMemo(() => {
    if (!activeSubcategoryId) return null;
    const group = subcategoryGroups.find(g => g.subcategory.id === activeSubcategoryId);
    return group?.category.id || null;
  }, [activeSubcategoryId, subcategoryGroups]);

  const activeCategoryName = useMemo(() => {
    if (!activeCategoryId || !menuData) return '';
    return menuData.categories.find(c => c.id === activeCategoryId)?.name || '';
  }, [activeCategoryId, menuData]);

  // Handle category click - scroll to first subcategory
  const handleCategoryClick = useCallback((categoryId: string | null) => {
    if (!categoryId || !menuData) return;
    const cat = menuData.categories.find(c => c.id === categoryId);
    if (cat && cat.subcategories.length > 0) {
      const firstSubWithProducts = cat.subcategories.find(s => s.products.length > 0);
      if (firstSubWithProducts) {
        scrollToSubcategory(firstSubWithProducts.id);
      }
    }
  }, [menuData, scrollToSubcategory]);

  // Update session activity when user interacts
  useEffect(() => {
    if (!isIdentified && !secureAuthenticated) return;

    const handleInteraction = () => {
      updateActivity();
      // Also update secure session activity
      if (secureAuthenticated) {
        recordActivity();
      }
    };

    // Update on any user interaction
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('scroll', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
    };
  }, [isIdentified, updateActivity, secureAuthenticated, recordActivity]);

  // Handle identification with dietary info
  const handleIdentify = async (
    name: string, 
    phone: string, 
    dietaryInfo?: CustomerDietaryInfo
  ): Promise<boolean> => {
    const newSession = await createSession(name, phone, dietaryInfo);
    return !!newSession;
  };

  // Check if customer has dietary restrictions
  const hasDietaryRestrictions = customerDietary && (
    customerDietary.has_gluten_intolerance ||
    customerDietary.has_lactose_intolerance ||
    (customerDietary.dietary_restrictions && customerDietary.dietary_restrictions.length > 0) ||
    customerDietary.allergy_notes
  );

  if (qrLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (qrError || !qrData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">QR Code Inválido</h1>
        <p className="text-muted-foreground text-center">
          Este QR Code não é válido ou expirou.
        </p>
      </div>
    );
  }

  const { table, company } = qrData;
  const companyData = company as any;

  // Show QRSecureGate for GPS validation (only in order mode, not menu-only)
  if (!isMenuOnly && !secureSessionValidated && companySlug && tableId) {
    return (
      <QRSecureGate
        slug={companySlug}
        qrType="table"
        tableId={tableId}
        onSuccess={handleSecureSessionSuccess}
        onCancel={() => window.history.back()}
      />
    );
  }

  if (menuLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Cardápio Indisponível</h1>
        <p className="text-muted-foreground text-center">
          O cardápio não está disponível no momento.
        </p>
      </div>
    );
  }

  const { categories } = menuData;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Menu Only Banner */}
      {isMenuOnly && (
        <div className="bg-accent text-accent-foreground text-center py-2 px-4 text-sm font-medium">
          Modo visualização — apenas cardápio
        </div>
      )}

      {/* Identification Dialog - Only required in order mode */}
      {!isMenuOnly && (
        <QRIdentificationDialogEnhanced
          open={!isIdentified}
          onIdentify={handleIdentify}
          isLoading={isIdentifying}
          tableNumber={tableNumber}
          companyName={companyData.name}
          companyLogo={companyData.logo_url}
          companyId={companyId || undefined}
          showDietarySection={true}
        />
      )}

      {/* Dietary Alert Banner */}
      {hasDietaryRestrictions && customerDietary && (
        <DietaryAlertBanner
          hasGlutenIntolerance={customerDietary.has_gluten_intolerance}
          hasLactoseIntolerance={customerDietary.has_lactose_intolerance}
          dietaryRestrictions={customerDietary.dietary_restrictions || []}
          allergyNotes={customerDietary.allergy_notes}
          customerName={customerName}
          variant="compact"
        />
      )}

      {/* Fixed Header */}
      <header className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyData.logo_url ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                <img src={companyData.logo_url} alt={companyData.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold truncate">{companyData.name}</h1>
              <p className="text-xs text-muted-foreground">Mesa {tableNumber}</p>
            </div>
          </div>
          
          {!isMenuOnly && isIdentified && customerName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{customerName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content with scroll spy */}
      <main className="max-w-3xl mx-auto relative">
        {/* Floating category indicator */}
        <FloatingCategoryBadge
          categoryName={activeCategoryName}
          visible={!!activeCategoryName}
          primaryColor="hsl(var(--primary))"
        />

        {/* Category Pills with scroll spy */}
        <div className="sticky top-[60px] z-10 bg-background py-3 px-4 border-b border-border">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {categories.map((cat) => {
                const isActive = activeCategoryId === cat.id;
                return (
                  <Button
                    key={cat.id}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn("shrink-0 transition-all", isActive && "ring-2 ring-primary/30")}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Products with continuous scroll spy */}
        <div className="px-4 space-y-6 py-4">
          {subcategoryGroups.map((group) => (
            <section 
              key={group.subcategory.id}
              ref={registerSubcategoryRef(group.subcategory.id)}
              className="scroll-mt-32"
            >
              {/* Sticky header with category + subcategory */}
              <div className="sticky top-[120px] z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-sm border-b mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">{group.category.name}</span>
                    <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      {group.subcategory.name}
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {group.products.length} itens
                  </Badge>
                </div>
              </div>
              
              {/* Products */}
              <div className="space-y-2">
                {group.products.map((product) => (
                  isMenuOnly ? (
                    <div
                      key={product.id}
                      className="flex gap-3 p-3 bg-card border border-border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-primary line-clamp-2">{product.name}</h4>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                        )}
                        <div className="mt-2">
                          {product.is_on_sale && product.sale_price ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground line-through">{formatCurrency(product.price)}</span>
                              <span className="font-bold text-destructive">{formatCurrency(product.sale_price)}</span>
                            </div>
                          ) : (
                            <span className="font-bold text-foreground">{formatCurrency(product.price)}</span>
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
                  ) : (
                    <QRProductCard key={product.id} product={product} companyId={companyId!} />
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Action Buttons (Waiter & Bill) - Only show when identified and NOT in menu-only mode */}
      {!isMenuOnly && isIdentified && (
        <QRActionButtons
          onCallWaiter={callWaiter}
          onRequestBill={requestBill}
          customerName={customerName}
          tableNumber={tableNumber}
          companyId={companyId}
          tableId={tableId}
          companyName={companyData.name}
        />
      )}

      {/* Cart - Only show in order mode */}
      {!isMenuOnly && (
        <>
          <CartButton />
          <CartSheet 
            companyId={companyId || undefined}
            companyName={companyData.name}
            mode="qrcode"
            allProducts={allProducts}
            tableNumber={tableNumber}
            customerName={customerName}
            customerPhone={session?.customer_phone}
          />
        </>
      )}
    </div>
  );
}

export default function PublicQRMesa() {
  return (
    <CartProvider>
      <PublicQRMesaContent />
    </CartProvider>
  );
}
