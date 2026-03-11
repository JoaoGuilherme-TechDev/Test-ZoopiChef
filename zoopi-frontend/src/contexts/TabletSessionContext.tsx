/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

interface TabletSessionContextType {
  slug: string | undefined;
  tableNumber: string | null;
  cart: CartItem[];
  addToCart: (product: any) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const TabletSessionContext = createContext<TabletSessionContextType | undefined>(undefined);

export function TabletSessionProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // 1. Prioridade para a URL: ?mesa=5
    const urlTable = searchParams.get('mesa');
    // 2. Fallback para o storage (caso o cliente dê refresh)
    const storedTable = sessionStorage.getItem('zoopi_tablet_table');

    if (urlTable) {
      setTableNumber(urlTable);
      sessionStorage.setItem('zoopi_tablet_table', urlTable);
    } else if (storedTable) {
      setTableNumber(storedTable);
    }
  }, [searchParams]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.prices?.[0]?.price || 0),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <TabletSessionContext.Provider
      value={{
        slug,
        tableNumber,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </TabletSessionContext.Provider>
  );
}

export function useTabletSession() {
  const context = useContext(TabletSessionContext);
  if (context === undefined) {
    throw new Error('useTabletSession deve ser usado dentro de um TabletSessionProvider');
  }
  return context;
}