import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useTables, useTableEvents } from '@/hooks/useTables';
import { useCreateOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Minus, ShoppingCart, Bell, Receipt, Trash2, X, Users } from 'lucide-react';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

export default function Tablet() {
  const [searchParams] = useSearchParams();
  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const { tables } = useTables();
  const { createEvent } = useTableEvents();
  const createOrder = useCreateOrder();

  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [manualTableNumber, setManualTableNumber] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showTableSelect, setShowTableSelect] = useState(true);

  // Check URL for table param
  useEffect(() => {
    const tableParam = searchParams.get('mesa');
    if (tableParam) {
      const num = parseInt(tableParam);
      if (!isNaN(num)) {
        const table = tables.find((t) => t.number === num);
        if (table) {
          setSelectedTable(table.id);
          setSelectedTableNumber(table.number);
          setShowTableSelect(false);
        } else {
          setSelectedTableNumber(num);
          setShowTableSelect(false);
        }
      }
    }
  }, [searchParams, tables]);

  const activeCategories = categories.filter((c) => c.active);
  const filteredProducts = products.filter(
    (p) => p.active && p.aparece_tablet && (!selectedCategory || subcategories.find((s) => s.id === p.subcategory_id)?.category_id === selectedCategory)
  );

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price }];
    });
    // sem toast de sucesso (usuário não quer balões)
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectTable = (tableId: string, tableNumber: number) => {
    setSelectedTable(tableId);
    setSelectedTableNumber(tableNumber);
    setShowTableSelect(false);
  };

  const handleManualTable = () => {
    const num = parseInt(manualTableNumber);
    if (!isNaN(num) && num > 0) {
      const table = tables.find((t) => t.number === num);
      if (table) {
        setSelectedTable(table.id);
      }
      setSelectedTableNumber(num);
      setShowTableSelect(false);
    }
  };

  const handleCallWaiter = async () => {
    if (!selectedTable || !company?.id) {
      toast.error('Selecione uma mesa');
      return;
    }
    try {
      await createEvent.mutateAsync({
        table_id: selectedTable,
        event_type: 'call_waiter',
        company_id: company.id,
      });
      toast.success('Garçom chamado!');
    } catch {
      toast.error('Erro ao chamar garçom');
    }
  };

  const handleAskBill = async () => {
    if (!selectedTable || !company?.id) {
      toast.error('Selecione uma mesa');
      return;
    }
    try {
      await createEvent.mutateAsync({
        table_id: selectedTable,
        event_type: 'ask_bill',
        company_id: company.id,
      });
      toast.success('Conta solicitada!');
    } catch {
      toast.error('Erro ao solicitar conta');
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    if (!company?.id) {
      toast.error('Empresa não encontrada');
      return;
    }

    try {
      await createOrder.mutateAsync({
        company_id: company.id,
        order_type: 'mesa',
        status: 'novo',
        total: cartTotal,
        customer_name: `Mesa ${selectedTableNumber || '?'}`,
        notes: selectedTableNumber ? `Mesa ${selectedTableNumber}` : undefined,
        items: cart.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes,
        })),
      });

      if (selectedTable) {
        await createEvent.mutateAsync({
          table_id: selectedTable,
          event_type: 'order_placed',
          company_id: company.id,
        });
      }

      setCart([]);
      setShowCart(false);
      toast.success('Pedido enviado!');
    } catch {
      toast.error('Erro ao enviar pedido');
    }
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Table selection screen
  if (showTableSelect) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: company?.background_color || '#f9fafb' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            {company?.logo_url && (
              <img src={company.logo_url} alt={company.name} className="h-20 mx-auto mb-4" />
            )}
            <h1 className="text-3xl font-bold" style={{ color: company?.primary_color || '#000' }}>
              {company?.name || 'Cardápio'}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">Selecione sua mesa</p>
          </div>

          {/* Table Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mb-8">
            {tables
              .filter((t) => t.active)
              .map((table) => (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table.id, table.number)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-white font-bold text-lg transition-all hover:scale-105 ${
                    table.status === 'available' ? 'bg-green-500' : table.status === 'occupied' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                >
                  <Users className="h-5 w-5 mb-1" />
                  {table.number}
                </button>
              ))}
          </div>

          {/* Manual input */}
          <Card className="max-w-sm mx-auto">
            <CardHeader>
              <CardTitle className="text-center text-base">Ou digite o número</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                type="number"
                placeholder="Número da mesa"
                value={manualTableNumber}
                onChange={(e) => setManualTableNumber(e.target.value)}
                className="text-center text-lg"
              />
              <Button onClick={handleManualTable}>OK</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: company?.background_color || '#f9fafb' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {company?.logo_url && <img src={company.logo_url} alt="" className="h-10" />}
            <div>
              <h1 className="font-bold" style={{ color: company?.primary_color }}>
                {company?.name}
              </h1>
              <Badge variant="outline">Mesa {selectedTableNumber}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCallWaiter}>
              <Bell className="h-4 w-4 mr-1" />
              Garçom
            </Button>
            <Button variant="outline" size="sm" onClick={handleAskBill}>
              <Receipt className="h-4 w-4 mr-1" />
              Conta
            </Button>
            <Button onClick={() => setShowCart(true)} className="relative">
              <ShoppingCart className="h-4 w-4 mr-1" />
              Carrinho
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full">
        {/* Categories sidebar */}
        <aside className="w-48 border-r bg-card p-2 hidden md:block">
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-1">
              <Button
                variant={!selectedCategory ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </Button>
              {activeCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Products grid */}
        <main className="flex-1 p-4">
          {/* Mobile categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 md:hidden">
            <Button size="sm" variant={!selectedCategory ? 'secondary' : 'outline'} onClick={() => setSelectedCategory(null)}>
              Todos
            </Button>
            {activeCategories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.id ? 'secondary' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.product_id === product.id);
              return (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h3>
                    <p className="text-primary font-bold">R$ {product.price.toFixed(2)}</p>
                    {cartItem ? (
                      <div className="flex items-center justify-between mt-2">
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-bold">{cartItem.quantity}</span>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(product.id, 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full mt-2" onClick={() => addToCart(product)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carrinho - Mesa {selectedTableNumber}</DialogTitle>
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
              <Button onClick={handlePlaceOrder} disabled={cart.length === 0 || createOrder.isPending}>
                {createOrder.isPending ? 'Enviando...' : 'Enviar Pedido'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
