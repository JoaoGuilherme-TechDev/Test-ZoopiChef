import { useState, useCallback } from "react";
import type {
  RotisseurStep,
  CookingMethod,
  MeatPreferences,
  MeatOccasion,
  SelectedMeat,
  SelectedAccompaniment,
  SelectedExtra,
  SelectedBeverage,
  RotisseurCartItem,
  AIRotisseurResponse,
  RotisseurCustomerInfo,
} from "../types";

interface RotisseurSessionState {
  step: RotisseurStep;
  customer: RotisseurCustomerInfo | null;
  cookingMethod: CookingMethod | null;
  preferences: MeatPreferences | null;
  occasion: MeatOccasion | null;
  numberOfPeople: number;
  selectedMeats: SelectedMeat[];
  selectedAccompaniments: SelectedAccompaniment[];
  selectedExtras: SelectedExtra[];
  selectedBeverages: SelectedBeverage[];
  aiSuggestions: AIRotisseurResponse | null;
  cartItems: RotisseurCartItem[];
  grandTotal: number;
}

const initialState: RotisseurSessionState = {
  step: "identification",
  customer: null,
  cookingMethod: null,
  preferences: null,
  occasion: null,
  numberOfPeople: 4,
  selectedMeats: [],
  selectedAccompaniments: [],
  selectedExtras: [],
  selectedBeverages: [],
  aiSuggestions: null,
  cartItems: [],
  grandTotal: 0,
};

export function useRotisseurSession(companyId: string) {
  const [state, setState] = useState<RotisseurSessionState>(initialState);

  // Navigation
  const goToStep = useCallback((step: RotisseurStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setCustomer = useCallback((customer: RotisseurCustomerInfo) => {
    setState((prev) => ({ ...prev, customer, step: "welcome" }));
  }, []);

  const goToCookingMethod = useCallback(() => {
    setState((prev) => ({ ...prev, step: "cooking_method" }));
  }, []);

  const setCookingMethod = useCallback((method: CookingMethod) => {
    setState((prev) => ({ 
      ...prev, 
      cookingMethod: method, 
      step: "preferences" 
    }));
  }, []);

  const setPreferences = useCallback((prefs: MeatPreferences) => {
    setState((prev) => ({ 
      ...prev, 
      preferences: prefs, 
      step: "occasion" 
    }));
  }, []);

  const setOccasion = useCallback((occ: MeatOccasion) => {
    setState((prev) => ({ 
      ...prev, 
      occasion: occ, 
      step: "quantity" 
    }));
  }, []);

  const setNumberOfPeople = useCallback((num: number) => {
    setState((prev) => ({ 
      ...prev, 
      numberOfPeople: num, 
      step: "meat_selection" 
    }));
  }, []);

  const setAISuggestions = useCallback((suggestions: AIRotisseurResponse) => {
    setState((prev) => ({ ...prev, aiSuggestions: suggestions }));
  }, []);

  const selectMeat = useCallback((meat: SelectedMeat) => {
    setState((prev) => {
      const existingIndex = prev.selectedMeats.findIndex(
        (m) => m.product.id === meat.product.id
      );
      let newMeats: SelectedMeat[];
      
      if (existingIndex >= 0) {
        newMeats = [...prev.selectedMeats];
        newMeats[existingIndex] = meat;
      } else {
        newMeats = [...prev.selectedMeats, meat];
      }
      
      return { ...prev, selectedMeats: newMeats };
    });
  }, []);

  const removeMeat = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      selectedMeats: prev.selectedMeats.filter((m) => m.product.id !== productId),
    }));
  }, []);

  const goToAccompaniments = useCallback(() => {
    setState((prev) => ({ ...prev, step: "accompaniments" }));
  }, []);

  const selectAccompaniment = useCallback((item: SelectedAccompaniment) => {
    setState((prev) => {
      const existingIndex = prev.selectedAccompaniments.findIndex(
        (a) => a.product.id === item.product.id
      );
      let newItems: SelectedAccompaniment[];
      
      if (existingIndex >= 0) {
        newItems = [...prev.selectedAccompaniments];
        newItems[existingIndex] = item;
      } else {
        newItems = [...prev.selectedAccompaniments, item];
      }
      
      return { ...prev, selectedAccompaniments: newItems };
    });
  }, []);

  const goToExtras = useCallback(() => {
    setState((prev) => ({ ...prev, step: "extras" }));
  }, []);

  const selectExtra = useCallback((item: SelectedExtra) => {
    setState((prev) => {
      const existingIndex = prev.selectedExtras.findIndex(
        (e) => e.product.id === item.product.id
      );
      let newItems: SelectedExtra[];
      
      if (existingIndex >= 0) {
        newItems = [...prev.selectedExtras];
        newItems[existingIndex] = item;
      } else {
        newItems = [...prev.selectedExtras, item];
      }
      
      return { ...prev, selectedExtras: newItems };
    });
  }, []);

  const goToBeverages = useCallback(() => {
    setState((prev) => ({ ...prev, step: "beverages" }));
  }, []);

  const selectBeverage = useCallback((item: SelectedBeverage) => {
    setState((prev) => {
      const existingIndex = prev.selectedBeverages.findIndex(
        (b) => b.product.id === item.product.id
      );
      let newItems: SelectedBeverage[];
      
      if (existingIndex >= 0) {
        newItems = [...prev.selectedBeverages];
        newItems[existingIndex] = item;
      } else {
        newItems = [...prev.selectedBeverages, item];
      }
      
      return { ...prev, selectedBeverages: newItems };
    });
  }, []);

  const goToSummary = useCallback(() => {
    // Calculate cart items and total
    const cartItems: RotisseurCartItem[] = [];
    let grandTotal = 0;

    state.selectedMeats.forEach((m) => {
      const total = m.product.price * m.quantity;
      grandTotal += total;
      cartItems.push({
        productId: m.product.id,
        name: m.product.name,
        price: m.product.price,
        quantity: m.quantity,
        unit: m.product.unit || "kg",
        total,
        category: "meat",
        aiSuggestion: m.aiReason,
      });
    });

    state.selectedAccompaniments.forEach((a) => {
      const total = a.product.price * a.quantity;
      grandTotal += total;
      cartItems.push({
        productId: a.product.id,
        name: a.product.name,
        price: a.product.price,
        quantity: a.quantity,
        unit: a.product.unit || "un",
        total,
        category: "accompaniment",
      });
    });

    state.selectedExtras.forEach((e) => {
      const total = e.product.price * e.quantity;
      grandTotal += total;
      cartItems.push({
        productId: e.product.id,
        name: e.product.name,
        price: e.product.price,
        quantity: e.quantity,
        unit: e.product.unit || "un",
        total,
        category: "extra",
      });
    });

    state.selectedBeverages.forEach((b) => {
      const total = b.product.price * b.quantity;
      grandTotal += total;
      cartItems.push({
        productId: b.product.id,
        name: b.product.name,
        price: b.product.price,
        quantity: b.quantity,
        unit: b.product.unit || "un",
        total,
        category: "beverage",
      });
    });

    setState((prev) => ({
      ...prev,
      step: "summary",
      cartItems,
      grandTotal,
    }));
  }, [state.selectedMeats, state.selectedAccompaniments, state.selectedExtras, state.selectedBeverages]);

  const goToCheckout = useCallback(() => {
    setState((prev) => ({ ...prev, step: "checkout" }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const goBack = useCallback(() => {
    const stepOrder: RotisseurStep[] = [
      "welcome",
      "cooking_method",
      "preferences",
      "occasion",
      "quantity",
      "meat_selection",
      "accompaniments",
      "extras",
      "beverages",
      "summary",
      "checkout",
    ];

    setState((prev) => {
      const currentIndex = stepOrder.indexOf(prev.step);
      if (currentIndex > 0) {
        return { ...prev, step: stepOrder[currentIndex - 1] };
      }
      return prev;
    });
  }, []);

  return {
    ...state,
    goToStep,
    setCustomer,
    goToCookingMethod,
    setCookingMethod,
    setPreferences,
    setOccasion,
    setNumberOfPeople,
    setAISuggestions,
    selectMeat,
    removeMeat,
    goToAccompaniments,
    selectAccompaniment,
    goToExtras,
    selectExtra,
    goToBeverages,
    selectBeverage,
    goToSummary,
    goToCheckout,
    reset,
    goBack,
  };
}
