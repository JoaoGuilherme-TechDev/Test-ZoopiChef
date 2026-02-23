import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useActiveRodizioMenusForType,
  useRodizioSessionItemCounts,
  useOrderRodizioItem,
  RodizioMenuItem,
} from '@/hooks/useRodizio';
import { Plus, Minus, Send, Loader2, AlertCircle, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { useTableOrderProduction } from '@/hooks/useTableOrderProduction';
import { useComandaOrderProduction } from '@/hooks/useComandaOrderProduction';

interface TabletRodizioMenuProps {
  rodizioSessionId: string;
  rodizioTypeId: string;
  rodizioTypeName: string;
  primaryColor?: string;
  companyId: string;
  mode: 'table' | 'comanda';
  tableSessionId?: string;
  tableId?: string;
  tableNumber?: number;
  comandaId?: string;
  comandaNumber?: number;
  comandaName?: string | null;
}

interface CartItem {
  menuItemId: string;
  productId?: string | null;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  notes?: string;
  isBeverage?: boolean;
  unitPrice?: number;
}

interface BeverageProduct {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number | null;
}

interface BeverageSubcategory {
  id: string;
  name: string;
  image_url?: string | null;
}

export function TabletRodizioMenu({
  rodizioSessionId,
  rodizioTypeId,
  rodizioTypeName,
  primaryColor = '#000000',
  companyId,
  mode,
  tableSessionId,
  tableId,
  tableNumber,
  comandaId,
  comandaNumber,
  comandaName,
}: TabletRodizioMenuProps) {
  const { data: menus = [], isLoading } = useActiveRodizioMenusForType(rodizioTypeId);
  const { data: itemCounts = {}, refetch: refetchCounts } = useRodizioSessionItemCounts(rodizioSessionId);
  const orderItem = useOrderRodizioItem();

  const { createTableOrder } = useTableOrderProduction();
  const { createComandaOrder } = useComandaOrderProduction();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'rodizio' | 'bebidas'>('rodizio');
  const [selectedBeverageSubcatId, setSelectedBeverageSubcatId] = useState<string | null>(null);

  // Fetch beverage subcategories using category_type field
  const { data: beverageSubcategories = [] } = useQuery({
    queryKey: ['rodizio-beverage-subcategories', companyId],
    queryFn: async (): Promise<BeverageSubcategory[]> => {
      if (!companyId) return [];
      
      // Find beverage categories (category_type = 'bebida')
      const { data: beverageCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('category_type', 'bebida');
      
      const beverageCategoryIds = (beverageCategories || []).map(c => c.id);
      
      // Find subcategories that are either:
      // 1. Explicitly marked as 'bebida'
      // 2. In a beverage category and have null category_type (inherit)
      const { data: subCats } = await supabase
        .from('subcategories')
        .select('id, name, image_url, category_id, category_type')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name');
      
      const beverageSubCats = (subCats || []).filter(s => {
        if (s.category_type === 'bebida') return true;
        if (!s.category_type && beverageCategoryIds.includes(s.category_id)) return true;
        return false;
      });
      
      return beverageSubCats.map(s => ({ id: s.id, name: s.name, image_url: s.image_url }));
    },
    enabled: !!companyId,
  });

  // Fetch products for selected beverage subcategory
  const { data: beverageProducts = [] } = useQuery({
    queryKey: ['rodizio-beverage-products', companyId, selectedBeverageSubcatId],
    queryFn: async (): Promise<BeverageProduct[]> => {
      if (!companyId || !selectedBeverageSubcatId) return [];
      
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, description, image_url, price, is_on_sale, sale_price')
        .eq('company_id', companyId)
        .eq('active', true)
        .eq('subcategory_id', selectedBeverageSubcatId)
        .order('name');
      
      return (prods || []) as BeverageProduct[];
    },
    enabled: !!companyId && !!selectedBeverageSubcatId,
  });

  // Auto-select first menu if none selected
  useEffect(() => {
    if (menus.length > 0 && !selectedMenuId) {
      setSelectedMenuId(menus[0].id);
    }
  }, [menus, selectedMenuId]);

  const selectedMenu = menus.find(m => m.id === selectedMenuId);
  const menuItems = (selectedMenu?.items as RodizioMenuItem[]) || [];

  const getCartQuantity = (itemId: string) => {
    return cart.find(c => c.menuItemId === itemId)?.quantity || 0;
  };

  const getRemainingQuantity = (item: RodizioMenuItem) => {
    if (!item.max_quantity_per_session) return null;
    const alreadyOrdered = itemCounts[item.id] || 0;
    const inCart = getCartQuantity(item.id);
    return item.max_quantity_per_session - alreadyOrdered - inCart;
  };

  const addToCart = (item: RodizioMenuItem) => {
    const remaining = getRemainingQuantity(item);
    if (remaining !== null && remaining <= 0) {
      toast.error(`Limite atingido para ${item.name}`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id && !c.isBeverage);
      if (existing) {
        return prev.map(c => 
          c.menuItemId === item.id && !c.isBeverage
            ? { ...c, quantity: c.quantity + 1 } 
            : c
        );
      }
      return [...prev, {
        menuItemId: item.id,
        productId: item.product_id,
        name: item.name,
        imageUrl: item.image_url,
        quantity: 1,
        isBeverage: false,
      }];
    });
  };

  const addBeverageToCart = (product: BeverageProduct) => {
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === product.id && c.isBeverage);
      if (existing) {
        return prev.map(c => 
          c.menuItemId === product.id && c.isBeverage
            ? { ...c, quantity: c.quantity + 1 } 
            : c
        );
      }
      return [...prev, {
        menuItemId: product.id,
        productId: product.id,
        name: product.name,
        imageUrl: product.image_url,
        quantity: 1,
        isBeverage: true,
        unitPrice: price,
      }];
    });
    toast.success(`${product.name} adicionado!`);
  };

  const removeFromCart = (itemId: string, isBeverage?: boolean) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === itemId && c.isBeverage === isBeverage);
      if (existing && existing.quantity > 1) {
        return prev.map(c => 
          c.menuItemId === itemId && c.isBeverage === isBeverage
            ? { ...c, quantity: c.quantity - 1 } 
            : c
        );
      }
      return prev.filter(c => !(c.menuItemId === itemId && c.isBeverage === isBeverage));
    });
  };

  const rodizioItems = cart.filter(c => !c.isBeverage);
  const beverageItems = cart.filter(c => c.isBeverage);

  const productionItems = useMemo(
    () =>
      cart.map((item) => ({
        productId: item.productId || item.menuItemId,
        productName: item.name,
        quantity: item.quantity,
        unitPriceCents: item.isBeverage ? Math.round((item.unitPrice || 0) * 100) : 0,
        unitPrice: item.isBeverage ? (item.unitPrice || 0) : 0,
        notes: item.isBeverage ? item.name : `[Rodízio] ${item.name}`,
      })),
    [cart]
  );

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao pedido');
      return;
    }

    setIsSubmitting(true);
    try {
      // Record rodizio_item_orders for rodizio items only
      for (const cartItem of rodizioItems) {
        await orderItem.mutateAsync({
          rodizio_session_id: rodizioSessionId,
          rodizio_menu_item_id: cartItem.menuItemId,
          quantity: cartItem.quantity,
          notes: cartItem.notes,
        });
      }

      // Create production order for KDS/print (includes both rodizio + beverages)
      if (mode === 'table') {
        if (!tableSessionId || !tableId || tableNumber == null) {
          throw new Error('Dados da mesa ausentes para enviar pedido do rodízio');
        }

        await createTableOrder.mutateAsync({
          sessionId: tableSessionId,
          tableId,
          tableNumber,
          commandName: null,
          commandNumber: null,
          items: productionItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPriceCents: i.unitPriceCents,
            notes: i.notes,
          })),
        });
      } else {
        if (!comandaId || comandaNumber == null) {
          throw new Error('Dados da comanda ausentes para enviar pedido do rodízio');
        }

        await createComandaOrder.mutateAsync({
          comandaId,
          commandNumber: comandaNumber,
          commandName: comandaName ?? null,
          items: productionItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.notes,
            optionsJson: null,
          })),
        });
      }
      
      toast.success('Pedido enviado para a cozinha!');
      setCart([]);
      refetchCounts();
    } catch (error) {
      console.error('Error submitting rodizio order:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const showFooter = cart.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Nenhum menu disponível para {rodizioTypeName}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold" style={{ color: primaryColor }}>
          {rodizioTypeName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha os itens do seu rodízio
        </p>
      </div>

      {/* Main Tabs: Rodízio vs Bebidas */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rodizio' | 'bebidas')} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="rodizio">🍣 Rodízio</TabsTrigger>
            <TabsTrigger value="bebidas">
              <Wine className="h-4 w-4 mr-1" />
              Bebidas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Rodizio Tab Content */}
        <TabsContent value="rodizio" className="flex-1 flex flex-col m-0">
          {/* Menu Sub-Tabs */}
          <Tabs value={selectedMenuId || ''} onValueChange={setSelectedMenuId} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-auto flex-wrap justify-start bg-transparent gap-1 py-2">
                {menus.map(menu => (
                  <TabsTrigger
                    key={menu.id}
                    value={menu.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {menu.icon && <span className="mr-1">{menu.icon}</span>}
                    {menu.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Items Grid */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {menuItems.map(item => {
                    const cartQty = getCartQuantity(item.id);
                    const remaining = getRemainingQuantity(item);
                    const isLimited = remaining !== null && remaining <= 0 && cartQty === 0;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={`overflow-hidden transition-all ${isLimited ? 'opacity-50' : ''}`}
                      >
                        {item.image_url && (
                          <div className="aspect-square bg-muted">
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">{item.name}</h3>
                          
                          {item.max_quantity_per_session && (
                            <div className="mb-2">
                              <Badge 
                                variant={remaining === 0 ? "destructive" : "secondary"} 
                                className="text-xs"
                              >
                                {remaining === null 
                                  ? 'Ilimitado'
                                  : remaining <= 0 
                                    ? 'Limite atingido' 
                                    : `Restam ${remaining}`
                                }
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between gap-2">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => removeFromCart(item.id, false)}
                              disabled={cartQty === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-lg min-w-[2ch] text-center">{cartQty}</span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => addToCart(item)}
                              disabled={isLimited || (remaining !== null && remaining <= 0)}
                              style={{ backgroundColor: cartQty === 0 ? primaryColor : undefined, color: cartQty === 0 ? 'white' : undefined }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </Tabs>
        </TabsContent>

        {/* Bebidas Tab Content */}
        <TabsContent value="bebidas" className="flex-1 m-0 overflow-hidden flex flex-col">
          {/* Subcategory Tabs */}
          {beverageSubcategories.length > 0 && (
            <div className="border-b px-4 overflow-x-auto">
              <div className="flex gap-2 py-2">
                {beverageSubcategories.map(subcat => (
                  <Button
                    key={subcat.id}
                    variant={selectedBeverageSubcatId === subcat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBeverageSubcatId(subcat.id)}
                    className="whitespace-nowrap"
                  >
                    {subcat.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4">
              {!selectedBeverageSubcatId ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Wine className="h-12 w-12 mb-4" />
                  <p>Selecione uma categoria de bebidas</p>
                </div>
              ) : beverageProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Wine className="h-12 w-12 mb-4" />
                  <p>Nenhuma bebida nesta categoria</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {beverageProducts.map(product => {
                    const cartQty = cart.find(c => c.menuItemId === product.id && c.isBeverage)?.quantity || 0;
                    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
                    
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
                          <p className="text-sm font-semibold mb-2" style={{ color: primaryColor }}>
                            R$ {price.toFixed(2)}
                          </p>
                          
                          <div className="flex items-center justify-between gap-2">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => removeFromCart(product.id, true)}
                              disabled={cartQty === 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-lg min-w-[2ch] text-center">{cartQty}</span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={() => addBeverageToCart(product)}
                              style={{ backgroundColor: cartQty === 0 ? primaryColor : undefined, color: cartQty === 0 ? 'white' : undefined }}
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

      {/* Cart Footer */}
      {showFooter && (
        <div className="border-t bg-background shrink-0 p-3 pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Itens no pedido</p>
              <p className="text-lg font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
            </div>
            <p className="text-xs text-muted-foreground">{cart.length} tipo{cart.length === 1 ? '' : 's'}</p>
          </div>

          <div className="overflow-x-auto -mx-3 px-3">
            <div className="flex gap-2 pb-1">
              {cart.map(item => (
                <div
                  key={`${item.menuItemId}-${item.isBeverage}`}
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 shrink-0"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="text-sm">
                    <span className="font-semibold">{item.quantity}x</span>{' '}
                    <span>{item.name.length > 20 ? `${item.name.substring(0, 20)}…` : item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            Enviar Pedido
          </Button>
        </div>
      )}
    </div>
  );
}
