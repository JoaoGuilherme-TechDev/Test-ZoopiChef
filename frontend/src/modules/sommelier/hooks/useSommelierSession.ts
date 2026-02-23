import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { ConsumptionContext, WineProfile, SommelierCartItem, PairingProduct, SommelierApproach, FoodSelection, SommelierStep, SommelierCustomerInfo, WineIntensity, WineSweetness, WineOccasion } from '../types';
import { EnhancedWineProfile } from '../types/wineTypes';

function generateToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface SommelierSessionState {
  sessionId: string | null;
  sessionToken: string;
  companyId: string;
  customer: SommelierCustomerInfo | null;
  approach: SommelierApproach | null;
  context: ConsumptionContext | null;
  profile: WineProfile;
  enhancedProfile: EnhancedWineProfile | null;
  foodSelection: FoodSelection | null;
  selectedWineId: string | null;
  step: SommelierStep;
  // Checkout data
  cartItems: SommelierCartItem[];
  allPairings: PairingProduct[];
  grandTotal: number;
  discount: number;
}

export function useSommelierSession(companyId: string) {
  const [state, setState] = useState<SommelierSessionState>({
    sessionId: null,
    sessionToken: generateToken(),
    companyId,
    customer: null,
    approach: null,
    context: null,
    profile: {},
    enhancedProfile: null,
    foodSelection: null,
    selectedWineId: null,
    step: 'identification',
    cartItems: [],
    allPairings: [],
    grandTotal: 0,
    discount: 0,
  });

  const saveSession = useMutation({
    mutationFn: async (updates: Partial<SommelierSessionState>) => {
      const newState = { ...state, ...updates };
      
      if (!state.sessionId) {
        const { data, error } = await supabase
          .from('sommelier_sessions')
          .insert({
            company_id: companyId,
            session_token: newState.sessionToken,
            consumption_context: newState.context,
            intensity_preference: newState.profile.intensity || null,
            sweetness_preference: newState.profile.sweetness || null,
            occasion: newState.profile.occasion || null,
          })
          .select()
          .single();
        if (error) throw error;
        setState((prev) => ({ ...prev, ...updates, sessionId: data.id }));
        return data;
      } else {
        const { error } = await supabase
          .from('sommelier_sessions')
          .update({
            consumption_context: newState.context,
            intensity_preference: newState.profile.intensity || null,
            sweetness_preference: newState.profile.sweetness || null,
            occasion: newState.profile.occasion || null,
          })
          .eq('id', state.sessionId);
        if (error) throw error;
        setState((prev) => ({ ...prev, ...updates }));
        return null;
      }
    },
  });

  const addWineToSession = useMutation({
    mutationFn: async (productId: string) => {
      if (!state.sessionId) return;
      const { error } = await supabase
        .from('sommelier_session_wines')
        .insert({ session_id: state.sessionId, product_id: productId, action: 'selected' });
      if (error) throw error;
    },
  });

  const setCustomer = useCallback((customer: SommelierCustomerInfo) => {
    setState((prev) => ({ ...prev, customer, step: 'welcome' }));
  }, []);

  const goToApproach = useCallback(() => setState((prev) => ({ ...prev, step: 'approach' })), []);
  
  const setApproach = useCallback((approach: SommelierApproach) => {
    setState((prev) => ({ ...prev, approach, step: 'context' }));
  }, []);

  const goToContext = useCallback(() => setState((prev) => ({ ...prev, step: 'context' })), []);
  
  const setContext = useCallback((ctx: ConsumptionContext) => {
    const nextStep = state.approach === 'food_first' ? 'food_selection' : 'profile';
    setState((prev) => ({ ...prev, context: ctx, step: nextStep }));
    saveSession.mutate({ context: ctx });
  }, [saveSession, state.approach]);

  const setFoodSelection = useCallback((food: FoodSelection) => {
    setState((prev) => ({ ...prev, foodSelection: food, step: 'wines' }));
  }, []);

  const setProfile = useCallback((profile: WineProfile) => {
    setState((prev) => ({ ...prev, profile, step: 'wines' }));
    saveSession.mutate({ profile });
  }, [saveSession]);

  const setEnhancedProfile = useCallback((enhancedProfile: EnhancedWineProfile) => {
    // Map enhanced profile to wine profile for AI compatibility
    const intensityMap: Record<string, WineIntensity> = {
      'seco': 'intenso',
      'fortificado': 'intenso',
      'suave': 'suave',
      'demi_sec': 'equilibrado',
    };
    const sweetnessMap: Record<string, WineSweetness> = {
      'seco': 'seco',
      'suave': 'doce',
      'demi_sec': 'meio_seco',
      'fortificado': 'doce',
    };
    
    const profile: WineProfile = {
      intensity: enhancedProfile.body ? intensityMap[enhancedProfile.body] : undefined,
      sweetness: enhancedProfile.body ? sweetnessMap[enhancedProfile.body] : undefined,
      occasion: enhancedProfile.occasion as WineOccasion | undefined,
    };
    setState((prev) => ({ 
      ...prev, 
      enhancedProfile, 
      profile,
      step: 'wines' 
    }));
    saveSession.mutate({ profile });
  }, [saveSession]);

  const skipProfile = useCallback(() => setState((prev) => ({ ...prev, step: 'wines' })), []);
  
  const selectWine = useCallback((wineId: string) => {
    setState((prev) => ({ ...prev, selectedWineId: wineId, step: 'wine_detail' }));
    addWineToSession.mutate(wineId);
  }, [addWineToSession]);
  
  const goToPairing = useCallback(() => setState((prev) => ({ ...prev, step: 'pairing' })), []);
  const goBackToWines = useCallback(() => setState((prev) => ({ ...prev, selectedWineId: null, step: 'wines' })), []);
  const goBackToDetail = useCallback(() => setState((prev) => ({ ...prev, step: 'wine_detail' })), []);
  
  const goToCheckout = useCallback((
    cartItems: SommelierCartItem[], 
    allPairings: PairingProduct[], 
    grandTotal: number, 
    discount: number
  ) => {
    setState((prev) => ({ 
      ...prev, 
      step: 'checkout',
      cartItems,
      allPairings,
      grandTotal,
      discount,
    }));
  }, []);

  const goBackToPairing = useCallback(() => setState((prev) => ({ ...prev, step: 'pairing' })), []);

  const reset = useCallback(() => {
    setState({ 
      sessionId: null, 
      sessionToken: generateToken(), 
      companyId, 
      customer: null,
      approach: null,
      context: null, 
      profile: {}, 
      enhancedProfile: null,
      foodSelection: null,
      selectedWineId: null, 
      step: 'identification',
      cartItems: [],
      allPairings: [],
      grandTotal: 0,
      discount: 0,
    });
  }, [companyId]);

  return { 
    ...state, 
    setCustomer,
    goToApproach,
    setApproach,
    goToContext, 
    setContext, 
    setFoodSelection,
    setProfile,
    setEnhancedProfile,
    skipProfile, 
    selectWine, 
    goToPairing, 
    goBackToWines, 
    goBackToDetail, 
    goToCheckout,
    goBackToPairing,
    reset, 
    isSaving: saveSession.isPending 
  };
}
