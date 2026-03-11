import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { CartItem, SelectedOption } from '../types';
import { Product } from '@/modules/products/types';

interface CartContextType {
  items: CartItem[];
  // PREP: customerId links the cart to a known customer for order creation.
  // Null until the customer is identified (e.g. phone lookup at checkout).
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  addItem: (product: Product, options?: SelectedOption[]) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LS_CART_KEY = "zoopi_delivery_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(LS_CART_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // PREP: customerId is session-only — not persisted.
  // It gets set when the customer identifies themselves at checkout (phone lookup).
  // Future order creation will read this to link customerId to the order payload.
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(items));
  }, [items]);

  const generateId = useCallback((productId: string, options: SelectedOption[] = []) => {
    if (options.length === 0) return productId;
    const optionsHash = options.map(o => o.id).sort().join('-');
    return `${productId}-${optionsHash}`;
  }, []);

  const addItem = useCallback((product: any, options: any[] = []) => {
    setItems(prev => {
      const cartItemId = generateId(product.id, options);
      const existing = prev.find(item => item.cartItemId === cartItemId);

      const basePrice = Number(
        product.is_on_sale && product.sale_price
          ? product.sale_price
          : (product.prices?.[0]?.price || 0)
      );
      const optionsTotal = options.reduce((sum, opt) => sum + Number(opt.price || 0), 0);
      const finalUnitPrice = basePrice + optionsTotal;

      if (existing) {
        return prev.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, {
        cartItemId,
        productId: product.id,
        name: product.name,
        price: finalUnitPrice,
        quantity: 1,
        image_url: product.image_url,
        options,
      }];
    });
  }, [generateId]);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    setItems(prev =>
      prev
        .map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item)
        .filter(item => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    toast.info("Item removido");
  }, []);

  // FIX: removed redundant localStorage.removeItem — the useEffect on items already
  // writes [] to localStorage when setItems([]) fires.
  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerId(null); // Reset customer linkage when cart is cleared
  }, []);

  const totalItems = useMemo(() =>
    items.reduce((sum, item) => sum + item.quantity, 0),
  [items]);

  const totalPrice = useMemo(() =>
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  [items]);

  const updateItemNotes = useCallback((cartItemId: string, notes: string) => {
    setItems(prev =>
      prev.map(item =>
        item.cartItemId === cartItemId ? { ...item, notes } : item
      )
    );
  }, []);

  return (
    <CartContext.Provider value={{
      items,
      customerId,
      setCustomerId,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      updateItemNotes,
      totalItems,
      totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}