/**
 * Kiosk Global Store
 * 
 * Manages kiosk state machine, cart, and UI state.
 * Uses simple module-level store with React hooks.
 */

import { useSyncExternalStore } from 'react';
import type { KioskState, KioskDevice, KioskCartItem, DineMode } from '@/hooks/useKiosk';

// Re-export types for convenience
export type { KioskCartItem };

// Customer dietary info
export interface CustomerDietaryInfo {
  hasGlutenIntolerance: boolean;
  hasLactoseIntolerance: boolean;
  dietaryRestrictions: string[];
  allergyNotes: string | null;
}

// Customer data from identification
export interface IdentifiedCustomer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  isVIP: boolean;
  favoriteProductIds: string[];
  availableDiscount: {
    type: 'percentage' | 'fixed_value' | 'free_item';
    value: number;
    prizeName: string;
    rewardId: string;
  } | null;
  // Dietary restrictions
  dietaryInfo?: CustomerDietaryInfo;
}

interface KioskStoreState {
  // Device config (loaded once)
  device: KioskDevice | null;

  // State machine
  state: KioskState;

  // Session
  sessionId: string | null;

  // Cart
  cart: KioskCartItem[];

  // Customer info
  customerName: string;
  customerPhone: string;

  // Identified customer (from phone lookup)
  identifiedCustomer: IdentifiedCustomer | null;

  // Dine mode
  dineMode: DineMode | null;

  // Upsell tracking
  declinedOfferIds: string[];
  offersShownCount: number;

  // Inactivity timer
  lastActivityAt: number;

  // Order
  orderId: string | null;
}

interface KioskStoreActions {
  setDevice: (device: KioskDevice | null) => void;
  setState: (state: KioskState) => void;
  setSessionId: (id: string | null) => void;
  addToCart: (item: KioskCartItem) => void;
  updateCartItem: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  setCustomerInfo: (name: string, phone: string) => void;
  setIdentifiedCustomer: (customer: IdentifiedCustomer | null) => void;
  setDineMode: (mode: DineMode) => void;
  declineOffer: (offerId: string) => void;
  incrementOffersShown: () => void;
  canShowMoreOffers: () => boolean;
  touchActivity: () => void;
  getIdleSeconds: () => number;
  setOrderId: (id: string | null) => void;
  reset: () => void;
}

type KioskStore = KioskStoreState & KioskStoreActions;

// Store state
let storeState: KioskStoreState = {
  device: null,
  state: 'ATTRACT',
  sessionId: null,
  cart: [],
  customerName: '',
  customerPhone: '',
  identifiedCustomer: null,
  dineMode: null,
  declinedOfferIds: [],
  offersShownCount: 0,
  lastActivityAt: Date.now(),
  orderId: null,
};

const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Store actions
const storeActions: KioskStoreActions = {
  setDevice: (device) => {
    storeState = { ...storeState, device };
    notifyListeners();
  },

  setState: (state) => {
    storeState = { ...storeState, state, lastActivityAt: Date.now() };
    notifyListeners();
  },

  setSessionId: (id) => {
    storeState = { ...storeState, sessionId: id };
    notifyListeners();
  },

  addToCart: (item) => {
    const existing = storeState.cart.find(c => 
      c.product_id === item.product_id && 
      JSON.stringify(c.selected_options) === JSON.stringify(item.selected_options)
    );
    
    let newCart: KioskCartItem[];
    if (existing) {
      newCart = storeState.cart.map(c => {
        if (c.id === existing.id) {
          return {
            ...c,
            quantity: c.quantity + item.quantity,
            total_cents: (c.quantity + item.quantity) * c.unit_price_cents,
          };
        }
        return c;
      });
    } else {
      newCart = [...storeState.cart, { ...item, id: crypto.randomUUID() }];
    }
    
    storeState = { ...storeState, cart: newCart, lastActivityAt: Date.now() };
    notifyListeners();
  },

  updateCartItem: (itemId, quantity) => {
    let newCart: KioskCartItem[];
    if (quantity <= 0) {
      newCart = storeState.cart.filter(c => c.id !== itemId);
    } else {
      newCart = storeState.cart.map(c => {
        if (c.id === itemId) {
          return { ...c, quantity, total_cents: quantity * c.unit_price_cents };
        }
        return c;
      });
    }
    storeState = { ...storeState, cart: newCart, lastActivityAt: Date.now() };
    notifyListeners();
  },

  removeFromCart: (itemId) => {
    storeState = { 
      ...storeState, 
      cart: storeState.cart.filter(c => c.id !== itemId),
      lastActivityAt: Date.now(),
    };
    notifyListeners();
  },

  clearCart: () => {
    storeState = { ...storeState, cart: [] };
    notifyListeners();
  },

  cartTotal: () => storeState.cart.reduce((sum, item) => sum + item.total_cents, 0),

  setCustomerInfo: (name, phone) => {
    storeState = { ...storeState, customerName: name, customerPhone: phone, lastActivityAt: Date.now() };
    notifyListeners();
  },

  setIdentifiedCustomer: (customer) => {
    storeState = { ...storeState, identifiedCustomer: customer, lastActivityAt: Date.now() };
    notifyListeners();
  },

  setDineMode: (mode) => {
    storeState = { ...storeState, dineMode: mode, lastActivityAt: Date.now() };
    notifyListeners();
  },

  declineOffer: (offerId) => {
    if (!storeState.declinedOfferIds.includes(offerId)) {
      storeState = { 
        ...storeState, 
        declinedOfferIds: [...storeState.declinedOfferIds, offerId],
        lastActivityAt: Date.now(),
      };
      notifyListeners();
    }
  },

  incrementOffersShown: () => {
    storeState = { ...storeState, offersShownCount: storeState.offersShownCount + 1 };
    notifyListeners();
  },

  canShowMoreOffers: () => {
    const maxOffers = storeState.device?.upsell_max_offers || 3;
    return storeState.device?.upsell_enabled !== false && storeState.offersShownCount < maxOffers;
  },

  touchActivity: () => {
    storeState = { ...storeState, lastActivityAt: Date.now() };
  },

  getIdleSeconds: () => Math.floor((Date.now() - storeState.lastActivityAt) / 1000),

  setOrderId: (id) => {
    storeState = { ...storeState, orderId: id };
    notifyListeners();
  },

  reset: () => {
    storeState = {
      ...storeState,
      state: 'ATTRACT',
      cart: [],
      customerName: '',
      customerPhone: '',
      identifiedCustomer: null,
      dineMode: null,
      declinedOfferIds: [],
      offersShownCount: 0,
      orderId: null,
      lastActivityAt: Date.now(),
    };
    notifyListeners();
  },
};

// Create combined store object
const getStore = (): KioskStore => ({
  ...storeState,
  ...storeActions,
});

// Subscribe to changes
export function subscribeToKioskStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Get current store (for non-React code)
export function getKioskStore(): KioskStore {
  return getStore();
}

// React hook with subscription
export function useKioskState<T>(selector: (store: KioskStore) => T): T {
  return useSyncExternalStore(
    subscribeToKioskStore,
    () => selector(getStore()),
    () => selector(getStore())
  );
}

// Convenience hooks for common state
export function useKioskCart() {
  return useKioskState(s => s.cart);
}

export function useKioskCartTotal() {
  return useKioskState(s => s.cart.reduce((sum, item) => sum + item.total_cents, 0));
}

export function useKioskCurrentState() {
  return useKioskState(s => s.state);
}

export function useKioskDevice() {
  return useKioskState(s => s.device);
}

// Export actions for direct use
export const kioskActions = storeActions;
