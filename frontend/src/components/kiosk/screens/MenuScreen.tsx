/**
 * MenuScreen - Main ordering interface
 * 
 * Layout:
 * - Header with promo carousel
 * - Sidebar with categories/subcategories based on hierarchy setting
 * - Main area with product grid
 * - Fixed cart button
 * 
 * Supports optionals/pizza products via dialogs
 * Respects branding settings (colors, hierarchy)
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useKioskState, kioskActions, useKioskCartTotal } from '@/stores/kioskStore';
import { KioskCartItem } from '@/hooks/useKiosk';
import { usePublicKioskSettings } from '@/hooks/useKioskSettings';
import { cn } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PromoCarousel } from '../PromoCarousel';
import { PromotionsTicker } from '../PromotionsTicker';
import { FavoritesSection } from '../FavoritesSection';
import { KioskAssistant } from '../KioskAssistant';
import { usePublicCheckProductHasOptionals } from '@/hooks/usePublicProductOptionalGroups';
import { PublicProductOptionalsDialog } from '@/components/menu/PublicProductOptionalsDialog';
import { isPizzaCategory } from '@/utils/pizzaCategoryHelper';
import { PizzaConfiguratorDialog } from '@/components/menu/PizzaConfiguratorDialog';
import type { SelectedOption } from '@/contexts/CartContext';


interface Category {
  id: string;
  name: string;
  image_url?: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
  image_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  subcategory_id: string;
  active: boolean;
  aparece_totem: boolean;
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

interface Combo {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  aparece_totem: boolean;
}

interface PromoBanner {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  type: 'image' | 'video';
  duration_seconds?: number;
}

export function MenuScreen() {
  const device = useKioskState(s => s.device);
  const cart = useKioskState(s => s.cart);
  const cartTotal = useKioskCartTotal();
  const identifiedCustomer = useKioskState(s => s.identifiedCustomer);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  
  // Optionals/Pizza state
  const [optionalsProduct, setOptionalsProduct] = useState<Product | null>(null);
  const [pizzaProduct, setPizzaProduct] = useState<Product | null>(null);

  // Scroll spy state
  const [activeScrollSection, setActiveScrollSection] = useState<string | null>(null);
  const [showFloatingIndicator, setShowFloatingIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isScrollingProgrammatically = useRef(false);
  const floatingIndicatorTimeout = useRef<NodeJS.Timeout>();

  const companyId = device?.company_id;
  const orientation = device?.orientation || 'portrait';
  const isLandscape = orientation === 'landscape';

  // Load branding settings
  const { data: brandingSettings } = usePublicKioskSettings(companyId || null);
  const menuHierarchy = brandingSettings?.menu_hierarchy || 'category_subcategory_products';

  // Check if product has optionals
  const { checkProduct } = usePublicCheckProductHasOptionals(companyId);

  // Get promo banners from ui_config
  const uiConfig = device?.ui_config as {
    headerPromoEnabled?: boolean;
    headerPromoHeight?: number;
    headerPromoBanners?: PromoBanner[];
    headerPromoInterval?: number;
    categorySidebar?: boolean;
    showPrices?: boolean;
  } | null;

  const promoBanners = useMemo(() => {
    if (!uiConfig?.headerPromoEnabled || !uiConfig?.headerPromoBanners) return [];
    return uiConfig.headerPromoBanners;
  }, [uiConfig]);

  const promoHeight = uiConfig?.headerPromoHeight || 120;
  const promoInterval = (uiConfig?.headerPromoInterval || 5) * 1000;

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['kiosk-categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, image_url')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return (data || []) as Category[];
    },
    enabled: !!companyId,
  });

  // Fetch all subcategories
  const { data: allSubcategories = [] } = useQuery({
    queryKey: ['kiosk-all-subcategories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, category_id, image_url')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return (data || []) as Subcategory[];
    },
    enabled: !!companyId,
  });

  // Filter subcategories based on selected category
  const subcategories = useMemo(() => {
    if (!selectedCategoryId) return allSubcategories;
    return allSubcategories.filter(s => s.category_id === selectedCategoryId);
  }, [allSubcategories, selectedCategoryId]);

  // Select first item based on hierarchy
  useEffect(() => {
    if (menuHierarchy === 'category_subcategory_products') {
      if (categories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(categories[0].id);
      }
    } else if (menuHierarchy === 'subcategory_products') {
      if (allSubcategories.length > 0 && !selectedSubcategoryId) {
        setSelectedSubcategoryId(allSubcategories[0].id);
      }
    }
  }, [categories, allSubcategories, selectedCategoryId, selectedSubcategoryId, menuHierarchy]);

  // Get ALL subcategory IDs for scroll spy (load all products for continuous scrolling)
  const allSubcategoryIds = useMemo(() => {
    return allSubcategories.map(s => s.id);
  }, [allSubcategories]);

  // Fetch ALL products for continuous scroll spy navigation
  const { data: allProducts = [] } = useQuery({
    queryKey: ['kiosk-all-products', companyId, allSubcategoryIds],
    queryFn: async () => {
      if (!companyId || allSubcategoryIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, image_url, subcategory_id, active, aparece_totem, product_type,
          subcategory:subcategories!inner(
            id, name,
            category:categories!inner(id, name)
          )
        `)
        .eq('company_id', companyId)
        .in('subcategory_id', allSubcategoryIds)
        .eq('active', true)
        .eq('aparece_totem', true)
        .order('name');
      
      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!companyId && allSubcategoryIds.length > 0,
  });
  
  // Alias for backwards compatibility
  const products = allProducts;

  // Fetch combos for totem
  const { data: combos = [] } = useQuery({
    queryKey: ['kiosk-combos', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('combos')
        .select('id, name, description, price, image_url, aparece_totem')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('aparece_totem', true)
        .order('name');
      
      if (error) throw error;
      return (data || []) as Combo[];
    },
    enabled: !!companyId,
  });

  // Fetch favorite products data
  const favoriteProductIds = identifiedCustomer?.favoriteProductIds || [];
  const { data: favoriteProducts = [] } = useQuery({
    queryKey: ['kiosk-favorites', companyId, favoriteProductIds.join(',')],
    queryFn: async () => {
      if (!companyId || favoriteProductIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .in('id', favoriteProductIds)
        .eq('active', true)
        .eq('aparece_totem', true);
      
      if (error) throw error;
      
      // Map to the format needed
      return (data || []).map((p, index) => ({
        productId: p.id,
        productName: p.name,
        productImage: p.image_url,
        price: p.price,
        timesOrdered: favoriteProductIds.length - index,
      }));
    },
    enabled: !!companyId && favoriteProductIds.length > 0,
  });

  // Check if product is pizza
  // STRICT: Only category name === "Pizza" enables pizza behavior
  const isPizza = (product: Product) => isPizzaCategory(product);

  // Handle product click - check for optionals/pizza
  // PRIORITY: Pizza > Optionals > Simple
  const handleProductClick = async (product: Product) => {
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

    // PRIORITY 3: Simple product - show quantity selector
    setSelectedProduct(product);
    setProductQuantity(1);
  };

  // Handle combo click
  const handleComboClick = (combo: Combo) => {
    // For now, add combo as a simple item
    // TODO: Implement combo configurator if needed
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: combo.id,
      product_name: combo.name,
      quantity: 1,
      unit_price_cents: Math.round(combo.price * 100),
      total_cents: Math.round(combo.price * 100),
      image_url: combo.image_url || undefined,
      notes: 'Combo',
    };
    kioskActions.addToCart(item);
  };

  // Add simple product to cart
  const handleAddSimpleToCart = (product: Product, quantity: number = 1) => {
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price_cents: Math.round(product.price * 100),
      total_cents: Math.round(product.price * 100) * quantity,
      image_url: product.image_url || undefined,
    };
    kioskActions.addToCart(item);
    setSelectedProduct(null);
    setProductQuantity(1);
  };

  // Handle optionals confirmation
  const handleOptionalsConfirm = (selectedOptions: SelectedOption[], totalPrice: number, optionalsDescription: string) => {
    if (!optionalsProduct) return;
    
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: optionalsProduct.id,
      product_name: optionalsProduct.name,
      quantity: 1,
      unit_price_cents: Math.round(totalPrice * 100),
      total_cents: Math.round(totalPrice * 100),
      image_url: optionalsProduct.image_url || undefined,
      notes: optionalsDescription,
    };
    kioskActions.addToCart(item);
    setOptionalsProduct(null);
  };

  // Handle pizza confirmation
  const handlePizzaConfirm = (selection: any) => {
    if (!pizzaProduct) return;
    
    // Build notes string including removed ingredients
    const flavorsWithIngredients = (selection.flavors || []).map((f: any) => {
      const removed = f.removedIngredients?.length > 0 
        ? ` (sem ${f.removedIngredients.join(', ')})`
        : '';
      return `${f.name}${removed}`;
    }).join(', ');
    
    const doughDelta = selection.selectedDoughType?.price_delta || 0;
    const borderTypeDelta = selection.selectedBorderType?.price_delta || 0;
    const totalPriceCents = Math.round(((Number(selection.totalPrice) || 0) + doughDelta + borderTypeDelta) * 100);
    const doughTypeNote = selection.selectedDoughType ? ` | Massa: ${selection.selectedDoughType.name}` : '';
    const borderTypeNote = selection.selectedBorderType ? ` | Tipo Borda: ${selection.selectedBorderType.name}` : '';
    
    const item: KioskCartItem = {
      id: crypto.randomUUID(),
      product_id: pizzaProduct.id,
      product_name: pizzaProduct.name,
      quantity: 1,
      unit_price_cents: totalPriceCents,
      total_cents: totalPriceCents,
      image_url: pizzaProduct.image_url || undefined,
      notes: `${selection.size} - ${flavorsWithIngredients}${doughTypeNote}${borderTypeNote}`,
      selected_options: {
        pizza_snapshot: {
          size: selection.size,
          pricing_model: selection.pricing_model,
          selected_flavors: selection.flavors || [],
          selected_optionals: selection.selectedOptionals || [],
          optionals_total: selection.optionalsTotal || 0,
          selected_dough_type: selection.selectedDoughType || null,
          selected_border_type: selection.selectedBorderType || null,
        },
      } as any,
    };
    kioskActions.addToCart(item);
    setPizzaProduct(null);
  };

  // Format currency
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Group products by subcategory for scroll spy (used for ALL hierarchy modes)
  const productsBySubcategory = useMemo(() => {
    const grouped: Map<string, { subcategory: Subcategory; category: Category | null; products: Product[] }> = new Map();
    
    allSubcategories.forEach(sub => {
      const subProducts = allProducts.filter(p => p.subcategory_id === sub.id);
      if (subProducts.length > 0) {
        const category = categories.find(c => c.id === sub.category_id) || null;
        grouped.set(sub.id, { subcategory: sub, category, products: subProducts });
      }
    });
    
    return grouped;
  }, [allSubcategories, allProducts, categories]);

  // Get active section info for floating indicator (shows category + subcategory)
  const activeSectionInfo = useMemo(() => {
    if (!activeScrollSection) return null;
    const section = productsBySubcategory.get(activeScrollSection);
    if (!section) return null;
    return {
      subcategoryName: section.subcategory.name,
      categoryName: section.category?.name || null,
    };
  }, [activeScrollSection, productsBySubcategory]);

  // Legacy accessor for backwards compatibility
  const activeSectionName = activeSectionInfo?.subcategoryName || null;

  // Register section ref
  const registerSectionRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  // Scroll to section when clicking sidebar
  const handleSectionClick = useCallback((sectionId: string) => {
    const element = sectionRefs.current.get(sectionId);
    const container = scrollContainerRef.current;
    
    if (element && container) {
      isScrollingProgrammatically.current = true;
      setActiveScrollSection(sectionId);
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = 20;
      const scrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;
      
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth',
      });
      
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 600);
    }
  }, []);

  // Handle scroll to detect active section
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastScrollTime = 0;
    const throttleMs = 50;

    const handleScroll = () => {
      // Throttle scroll events
      const now = Date.now();
      if (now - lastScrollTime < throttleMs) return;
      lastScrollTime = now;

      if (isScrollingProgrammatically.current) return;
      
      // Show floating indicator briefly
      setShowFloatingIndicator(true);
      if (floatingIndicatorTimeout.current) {
        clearTimeout(floatingIndicatorTimeout.current);
      }
      floatingIndicatorTimeout.current = setTimeout(() => {
        setShowFloatingIndicator(false);
      }, 1500);
      
      const containerRect = container.getBoundingClientRect();
      const offset = 100; // Distance from container top to trigger section change
      const triggerPoint = containerRect.top + offset;
      
      let currentSection: string | null = null;
      let minDistance = Infinity;

      // Find the section closest to the trigger point (that has passed it)
      sectionRefs.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        
        // Section top is above or at the trigger point, and section is still visible
        if (rect.top <= triggerPoint && rect.bottom > containerRect.top) {
          const distance = Math.abs(rect.top - triggerPoint);
          if (distance < minDistance) {
            minDistance = distance;
            currentSection = id;
          }
        }
      });

      // Fallback: find first visible section if none passed the trigger point
      if (!currentSection) {
        let firstVisibleTop = Infinity;
        sectionRefs.current.forEach((element, id) => {
          const rect = element.getBoundingClientRect();
          if (rect.top >= containerRect.top && rect.bottom <= containerRect.bottom) {
            if (rect.top < firstVisibleTop) {
              firstVisibleTop = rect.top;
              currentSection = id;
            }
          }
        });
      }

      // Another fallback: any section that is partially visible
      if (!currentSection) {
        sectionRefs.current.forEach((element, id) => {
          const rect = element.getBoundingClientRect();
          if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
            if (!currentSection) currentSection = id;
          }
        });
      }

      if (currentSection && currentSection !== activeScrollSection) {
        setActiveScrollSection(currentSection);
        
        // Also update sidebar selection based on hierarchy mode
        const sectionData = productsBySubcategory.get(currentSection);
        if (sectionData) {
          if (menuHierarchy === 'subcategory_products') {
            setSelectedSubcategoryId(currentSection);
          } else if (menuHierarchy === 'category_subcategory_products' && sectionData.category) {
            // Update category selection when scrolling through different categories
            if (sectionData.category.id !== selectedCategoryId) {
              setSelectedCategoryId(sectionData.category.id);
            }
          }
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    setTimeout(handleScroll, 100);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (floatingIndicatorTimeout.current) {
        clearTimeout(floatingIndicatorTimeout.current);
      }
    };
  }, [activeScrollSection, menuHierarchy, selectedCategoryId, productsBySubcategory]);

  const gridCols = isLandscape ? 'grid-cols-4 xl:grid-cols-5' : 'grid-cols-2 md:grid-cols-3';
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Get branding colors
  const primaryColor = brandingSettings?.enabled ? brandingSettings.primary_color : '#ea580c';
  const accentColor = brandingSettings?.enabled ? brandingSettings.accent_color : '#ea580c';
  const backgroundColor = brandingSettings?.enabled ? brandingSettings.background_color : '#111827';
  const textColor = brandingSettings?.enabled ? brandingSettings.text_color : '#ffffff';
  const secondaryColor = brandingSettings?.enabled ? brandingSettings.secondary_color : '#1f2937';

  // Get AI suggestion message
  const getAIMessage = () => {
    if (!identifiedCustomer) return null;
    
    if (cart.length === 0 && favoriteProducts.length > 0) {
      return `Olá ${identifiedCustomer.name.split(' ')[0]}! Vi que você gosta de "${favoriteProducts[0].productName}". Que tal adicionar ao pedido?`;
    }
    
    if (identifiedCustomer.availableDiscount) {
      const discountText = identifiedCustomer.availableDiscount.type === 'percentage' 
        ? `${identifiedCustomer.availableDiscount.value}% de desconto`
        : `R$ ${identifiedCustomer.availableDiscount.value.toFixed(2)} de desconto`;
      return `🎉 Você tem ${discountText} disponível! Será aplicado automaticamente no pagamento.`;
    }
    
    return null;
  };

  // Render sidebar based on hierarchy
  const renderSidebar = () => {
    if (menuHierarchy === 'products_only') {
      return null; // No sidebar for products-only mode
    }

    const sidebarWidth = isLandscape ? 'w-56' : 'w-40';

    if (menuHierarchy === 'subcategory_products') {
      // Show only subcategories with scroll spy
      return (
        <ScrollArea className={cn('shrink-0 h-full', sidebarWidth)} style={{ backgroundColor: secondaryColor }}>
          <div className="p-2">
            {allSubcategories.map((subcategory) => {
              const isActive = activeScrollSection === subcategory.id || selectedSubcategoryId === subcategory.id;
              const productCount = productsBySubcategory.get(subcategory.id)?.products.length || 0;
              return (
                <button
                  key={subcategory.id}
                  onClick={() => handleSectionClick(subcategory.id)}
                  className={cn(
                    'w-full text-left transition-all border-l-4 mb-2 rounded-lg overflow-hidden',
                    isActive ? 'ring-2 shadow-lg' : 'border-transparent hover:opacity-80'
                  )}
                  style={{
                    borderColor: isActive ? accentColor : 'transparent',
                    backgroundColor: isActive ? `${accentColor}30` : 'transparent',
                    color: textColor,
                    '--tw-ring-color': accentColor,
                  } as React.CSSProperties}
                >
                  {subcategory.image_url ? (
                    <div className="w-full aspect-[3/2] overflow-hidden">
                      <img 
                        src={subcategory.image_url} 
                        alt={subcategory.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[3/2] flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
                      <span className="text-3xl">🍽️</span>
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <span className={cn('font-medium', isLandscape ? 'text-base' : 'text-sm')}>
                      {subcategory.name}
                    </span>
                    {productCount > 0 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs shrink-0"
                        style={{ 
                          borderColor: `${textColor}30`,
                          color: textColor,
                          backgroundColor: isActive ? accentColor : 'transparent',
                        }}
                      >
                        {productCount}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      );
    }

    // Default: category_subcategory_products - show all subcategories grouped by category with scroll spy
    return (
      <ScrollArea className={cn('shrink-0 h-full', sidebarWidth)} style={{ backgroundColor: secondaryColor }}>
        <div className="p-2">
          {categories.map((category) => {
            const categorySubcategories = allSubcategories.filter(s => s.category_id === category.id);
            const isCurrentCategory = categorySubcategories.some(s => activeScrollSection === s.id);
            
            return (
              <div key={category.id} className="mb-4">
                {/* Category header */}
                <div 
                  className={cn(
                    'px-3 py-2 rounded-t-lg font-semibold text-sm border-l-4 transition-all',
                    isCurrentCategory ? 'border-l-4' : 'border-transparent'
                  )}
                  style={{
                    borderColor: isCurrentCategory ? accentColor : 'transparent',
                    backgroundColor: isCurrentCategory ? `${accentColor}20` : 'transparent',
                    color: textColor,
                  }}
                >
                  {category.name}
                </div>
                
                {/* Subcategories list */}
                <div className="pl-2">
                  {categorySubcategories.map((subcategory) => {
                    const isActive = activeScrollSection === subcategory.id;
                    const productCount = productsBySubcategory.get(subcategory.id)?.products.length || 0;
                    
                    if (productCount === 0) return null;
                    
                    return (
                      <button
                        key={subcategory.id}
                        onClick={() => handleSectionClick(subcategory.id)}
                        className={cn(
                          'w-full text-left transition-all border-l-4 mb-1 rounded-lg overflow-hidden flex items-center gap-2 p-2',
                          isActive ? 'ring-1 shadow-md' : 'border-transparent hover:opacity-80'
                        )}
                        style={{
                          borderColor: isActive ? accentColor : 'transparent',
                          backgroundColor: isActive ? `${accentColor}30` : 'transparent',
                          color: textColor,
                          '--tw-ring-color': accentColor,
                        } as React.CSSProperties}
                      >
                        {subcategory.image_url ? (
                          <img 
                            src={subcategory.image_url} 
                            alt={subcategory.name}
                            className="w-8 h-8 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded flex items-center justify-center shrink-0" 
                            style={{ backgroundColor: `${secondaryColor}` }}
                          >
                            <span className="text-sm">🍽️</span>
                          </div>
                        )}
                        <span className={cn('flex-1 font-medium truncate', isLandscape ? 'text-sm' : 'text-xs')}>
                          {subcategory.name}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] shrink-0"
                          style={{ 
                            borderColor: isActive ? accentColor : `${textColor}30`,
                            color: isActive ? '#fff' : textColor,
                            backgroundColor: isActive ? accentColor : 'transparent',
                          }}
                        >
                          {productCount}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor, color: textColor }}>
      {/* AI Assistant */}
      {identifiedCustomer && (
        <KioskAssistant 
          message={getAIMessage()} 
          showDiscount={!!identifiedCustomer.availableDiscount}
          discount={identifiedCustomer.availableDiscount}
          isVIP={identifiedCustomer.isVIP}
          customerName={identifiedCustomer.name}
        />
      )}
      
      {/* Promotions Ticker - Always show if promotions exist */}
      {companyId && (
        <PromotionsTicker
          companyId={companyId}
          primaryColor={primaryColor}
          accentColor={accentColor}
          textColor={textColor}
          height={60}
        />
      )}
      
      {/* Header with promo carousel (banners) */}
      {promoBanners.length > 0 && (
        <PromoCarousel 
          banners={promoBanners}
          height={`h-[${promoHeight}px]`}
          interval={promoInterval}
          className="shrink-0"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating category indicator - shows category > subcategory */}
        {showFloatingIndicator && activeSectionInfo && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-6 py-3 rounded-full shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col items-center"
            style={{
              backgroundColor: accentColor,
              color: '#ffffff',
            }}
          >
            {activeSectionInfo.categoryName && (
              <span className="text-xs opacity-80">{activeSectionInfo.categoryName}</span>
            )}
            <span className="font-semibold">{activeSectionInfo.subcategoryName}</span>
          </div>
        )}

        {/* Categories/Subcategories sidebar */}
        {uiConfig?.categorySidebar !== false && renderSidebar()}

        {/* Products grid with scroll spy */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 h-full overflow-y-auto"
        >
          <div className="p-4">
            {/* Favorites section */}
            {favoriteProducts.length > 0 && (
              <FavoritesSection 
                favorites={favoriteProducts}
                isLandscape={isLandscape}
              />
            )}

            {/* Combos section */}
            {combos.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: accentColor }}>
                  <Gift className="w-6 h-6" />
                  Combos
                </h2>
                <div className={cn('grid gap-4', gridCols)}>
                  {combos.map((combo) => (
                    <button
                      key={combo.id}
                      onClick={() => handleComboClick(combo)}
                      className="rounded-xl overflow-hidden text-left hover:ring-2 transition-all"
                      style={{ 
                        backgroundColor: secondaryColor,
                        color: textColor,
                      }}
                    >
                      {combo.image_url ? (
                        <img
                          src={combo.image_url}
                          alt={combo.name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
                          <Gift className="w-16 h-16" style={{ color: accentColor }} />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-lg line-clamp-2">{combo.name}</h3>
                        {uiConfig?.showPrices !== false && (
                          <p className="text-xl font-bold mt-2" style={{ color: accentColor }}>
                            {formatCurrency(Math.round(combo.price * 100))}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Products grouped by subcategory with scroll spy - ALL HIERARCHY MODES */}
            {Array.from(productsBySubcategory.entries()).map(([subId, { subcategory, category, products: subProducts }]) => (
              <div 
                key={subId}
                ref={registerSectionRef(subId)}
                className="mb-8"
              >
                {/* Section header with category + subcategory */}
                <div 
                  className="sticky top-0 z-10 py-3 mb-4 flex items-center gap-3 border-b"
                  style={{ 
                    backgroundColor, 
                    borderColor: `${textColor}20`,
                  }}
                >
                  {subcategory.image_url && (
                    <img 
                      src={subcategory.image_url} 
                      alt={subcategory.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex flex-col">
                    {menuHierarchy === 'category_subcategory_products' && category && (
                      <span className="text-xs opacity-60" style={{ color: textColor }}>
                        {category.name}
                      </span>
                    )}
                    <h2 className="text-xl font-bold" style={{ color: accentColor }}>
                      {subcategory.name}
                    </h2>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="ml-auto"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {subProducts.length} itens
                  </Badge>
                </div>
                
                {/* Products grid */}
                <div className={cn('grid gap-4', gridCols)}>
                  {subProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="rounded-xl overflow-hidden text-left hover:ring-2 transition-all"
                      style={{ 
                        backgroundColor: secondaryColor,
                        color: textColor,
                      }}
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: secondaryColor }}>
                          <span className="text-6xl">🍽️</span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-lg line-clamp-2">{product.name}</h3>
                        {uiConfig?.showPrices !== false && (
                          <p className="text-xl font-bold mt-2" style={{ color: accentColor }}>
                            {product.price === 0 && isPizza(product)
                              ? 'A partir de R$ --'
                              : product.price === 0 
                                ? 'Escolha uma opção'
                                : formatCurrency(Math.round(product.price * 100))
                            }
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {allProducts.length === 0 && combos.length === 0 && (
              <div className="flex items-center justify-center h-64" style={{ color: textColor, opacity: 0.6 }}>
                <p className="text-xl">Nenhum produto disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simple product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
          <div className="rounded-2xl max-w-lg w-full overflow-hidden" style={{ backgroundColor: secondaryColor }}>
            {selectedProduct.image_url && (
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-full h-64 object-cover"
              />
            )}
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: textColor }}>{selectedProduct.name}</h2>
              {selectedProduct.description && (
                <p className="mb-4" style={{ color: textColor, opacity: 0.7 }}>{selectedProduct.description}</p>
              )}
              <p className="text-3xl font-bold mb-6" style={{ color: accentColor }}>
                {selectedProduct.price === 0 
                  ? 'Escolha uma opção'
                  : formatCurrency(Math.round(selectedProduct.price * 100))
                }
              </p>

              {/* Quantity selector */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-16 h-16 rounded-full text-2xl"
                  onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                >
                  <Minus className="w-8 h-8" />
                </Button>
                <span className="text-4xl font-bold w-16 text-center" style={{ color: textColor }}>
                  {productQuantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-16 h-16 rounded-full text-2xl"
                  onClick={() => setProductQuantity(productQuantity + 1)}
                >
                  <Plus className="w-8 h-8" />
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  className="flex-1 h-16 text-xl"
                  onClick={() => setSelectedProduct(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 h-16 text-xl"
                  style={{ backgroundColor: accentColor, color: '#fff' }}
                  onClick={() => handleAddSimpleToCart(selectedProduct, productQuantity)}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optionals Dialog */}
      {optionalsProduct && companyId && (
        <PublicProductOptionalsDialog
          open={!!optionalsProduct}
          onOpenChange={(open) => !open && setOptionalsProduct(null)}
          product={{ id: optionalsProduct.id, name: optionalsProduct.name, price: optionalsProduct.price } as any}
          companyId={companyId}
          onConfirm={handleOptionalsConfirm}
        />
      )}

      {/* Pizza Configurator Dialog */}
      {pizzaProduct && companyId && (
        <PizzaConfiguratorDialog
          open={!!pizzaProduct}
          onClose={() => setPizzaProduct(null)}
          companyId={companyId}
          productId={pizzaProduct.id}
          productName={pizzaProduct.name}
          onConfirm={handlePizzaConfirm}
        />
      )}

      {/* Fixed cart button */}
      <div className="absolute bottom-8 right-8">
        <Button
          size="lg"
          className={cn(
            'rounded-full shadow-2xl transition-all',
            cartItemsCount > 0 ? 'w-auto px-8 h-20' : 'w-20 h-20'
          )}
          style={{ backgroundColor: accentColor, color: '#fff' }}
          onClick={() => {
            if (cartItemsCount > 0) {
              kioskActions.setState('CART');
            }
          }}
        >
          <ShoppingCart className="w-8 h-8" />
          {cartItemsCount > 0 && (
            <>
              <span className="ml-3 text-xl font-bold">{cartItemsCount}</span>
              <span className="ml-3 text-lg">{formatCurrency(cartTotal)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
