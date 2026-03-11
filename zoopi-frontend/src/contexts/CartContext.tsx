import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { OptionalCalcMode } from '@/hooks/useProductOptions';

export interface SelectedOptionItem {
  id: string;
  label: string;
  price_delta: number;
  quantity?: number; // For items with quantity control (e.g. 2x Coca Cola)
}

export interface SelectedOption {
  group_id: string;
  group_name: string;
  items: SelectedOptionItem[];
}

// Pizza-specific optional with calculation metadata
export interface PizzaSelectedOptional {
  group_id: string;
  group_name: string;
  item_id: string;
  item_label: string;
  price: number;
  target_scope: 'whole_pizza' | string; // 'whole_pizza' or specific flavor_id
  calc_mode: OptionalCalcMode;
}

// Pizza flavor selection with removed ingredients and per-flavor observation
export interface PizzaSelectedFlavor {
  id: string;
  name: string;
  removedIngredients: string[];
  observation?: string;
}

// Pizza selected border
export interface PizzaSelectedBorder {
  id: string;
  name: string;
  price: number;
}

// Extended cart item for pizzas with full snapshot
export interface CartItem {
  id: string;
  name: string;
  price: number; // Base price (calculated from flavors)
  quantity: number;
  cartItemId: string;
  selectedOptions?: SelectedOption[]; // For non-pizza items
  notes?: string;
  // Pizza-specific fields (only for product_type='pizza')
  isPizza?: boolean;
  pizzaData?: {
    size: string;
    parts_count: number;
    pricing_model: 'maior' | 'media' | 'partes';
    selected_flavors: PizzaSelectedFlavor[];
    selected_border?: PizzaSelectedBorder | null; // Selected border (optional)
    selected_optionals: PizzaSelectedOptional[];
    optionals_total: number; // Pre-calculated total from optionals
    border_total: number; // Border price
  };
}

// Add pizza item input type
export interface AddPizzaItemInput {
  id: string;
  name: string;
  price: number; // Base price from flavor calculation
  size: string;
  parts_count: number;
  pricing_model: 'maior' | 'media' | 'partes';
  selected_flavors: PizzaSelectedFlavor[];
  selected_border?: PizzaSelectedBorder | null;
  selected_optionals: PizzaSelectedOptional[];
  optionals_total: number;
  border_total: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: { id: string; name: string; price: number }, selectedOptions?: SelectedOption[], notes?: string, quantity?: number) => void;
  addPizzaItem: (pizza: AddPizzaItemInput) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Calculate total price including options (handles both regular and pizza items)
function calculateItemTotal(item: CartItem): number {
  let total = item.price;
  
  // For pizza items, add the pre-calculated optionals total and border total
  if (item.isPizza && item.pizzaData) {
    total += item.pizzaData.optionals_total;
    total += item.pizzaData.border_total || 0;
  } else if (item.selectedOptions) {
    // For regular items, sum option deltas
    for (const group of item.selectedOptions) {
      for (const opt of group.items) {
        total += opt.price_delta;
      }
    }
  }
  
  return total * item.quantity;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((
    product: { id: string; name: string; price: number },
    selectedOptions?: SelectedOption[],
    notes?: string,
    quantity: number = 1
  ) => {
    const cartItemId = `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setItems(prev => [...prev, { 
      ...product, 
      quantity: Math.max(1, Math.floor(quantity)), 
      cartItemId,
      selectedOptions,
      notes 
    }]);
  }, []);

  const addPizzaItem = useCallback((pizza: AddPizzaItemInput) => {
    const cartItemId = `${pizza.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setItems(prev => [...prev, {
      id: pizza.id,
      name: pizza.name,
      price: pizza.price,
      quantity: 1,
      cartItemId,
      notes: pizza.notes,
      isPizza: true,
      pizzaData: {
        size: pizza.size,
        parts_count: pizza.parts_count,
        pricing_model: pizza.pricing_model,
        selected_flavors: pizza.selected_flavors,
        selected_border: pizza.selected_border || null,
        selected_optionals: pizza.selected_optionals,
        optionals_total: pizza.optionals_total,
        border_total: pizza.border_total || 0,
      },
    }]);
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    } else {
      setItems(prev =>
        prev.map(item =>
          item.cartItemId === cartItemId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const updateItemNotes = useCallback((cartItemId: string, notes: string) => {
    setItems(prev =>
      prev.map(item =>
        item.cartItemId === cartItemId ? { ...item, notes } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addPizzaItem,
        removeItem,
        updateQuantity,
        updateItemNotes,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
