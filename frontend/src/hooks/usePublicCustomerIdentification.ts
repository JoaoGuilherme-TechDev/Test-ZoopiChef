import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { toast } from 'sonner';

export interface CustomerDietaryInfo {
  has_gluten_intolerance: boolean;
  has_lactose_intolerance: boolean;
  dietary_restrictions: string[];
  allergy_notes: string | null;
}

export interface IdentifiedCustomer {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  phone: string | null;
  // Dietary restrictions
  has_gluten_intolerance: boolean;
  has_lactose_intolerance: boolean;
  dietary_restrictions: string[];
  allergy_notes: string | null;
  // Internal alerts
  alerts: string | null;
  is_blocked: boolean;
  block_reason: string | null;
}

interface UsePublicCustomerIdentificationOptions {
  companyId: string;
  onCustomerIdentified?: (customer: IdentifiedCustomer) => void;
  onNewCustomer?: (phone: string, name: string) => void;
}

export function usePublicCustomerIdentification(options: UsePublicCustomerIdentificationOptions) {
  const { companyId, onCustomerIdentified, onNewCustomer } = options;

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customer, setCustomer] = useState<IdentifiedCustomer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dietary info state
  const [hasGlutenIntolerance, setHasGlutenIntolerance] = useState(false);
  const [hasLactoseIntolerance, setHasLactoseIntolerance] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergyNotes, setAllergyNotes] = useState('');

  const normalizePhone = useCallback((p: string): string => {
    return p.replace(/\D/g, '');
  }, []);

  const searchCustomer = useCallback(async (phoneNumber: string): Promise<IdentifiedCustomer | null> => {
    if (!companyId) return null;

    const normalized = normalizePhone(phoneNumber);
    if (normalized.length < 8) return null;

    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          whatsapp,
          email,
          phone,
          has_gluten_intolerance,
          has_lactose_intolerance,
          dietary_restrictions,
          allergy_notes,
          alerts,
          is_blocked,
          block_reason
        `)
        .eq('company_id', companyId)
        .or(`whatsapp.eq.${normalized},phone.eq.${normalized}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const foundCustomer: IdentifiedCustomer = {
          ...data,
          has_gluten_intolerance: data.has_gluten_intolerance ?? false,
          has_lactose_intolerance: data.has_lactose_intolerance ?? false,
          dietary_restrictions: data.dietary_restrictions ?? [],
          allergy_notes: data.allergy_notes ?? null,
        };

        setCustomer(foundCustomer);
        setName(foundCustomer.name);
        setIsNewCustomer(false);

        // Set dietary info from customer
        setHasGlutenIntolerance(foundCustomer.has_gluten_intolerance);
        setHasLactoseIntolerance(foundCustomer.has_lactose_intolerance);
        setDietaryRestrictions(foundCustomer.dietary_restrictions);
        setAllergyNotes(foundCustomer.allergy_notes || '');

        onCustomerIdentified?.(foundCustomer);
        return foundCustomer;
      } else {
        setCustomer(null);
        setIsNewCustomer(true);
        // Reset dietary info for new customer
        setHasGlutenIntolerance(false);
        setHasLactoseIntolerance(false);
        setDietaryRestrictions([]);
        setAllergyNotes('');
        return null;
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [companyId, normalizePhone, onCustomerIdentified]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(value);
    const normalized = normalizePhone(value);
    if (normalized.length >= 10) {
      searchCustomer(value);
    } else {
      setCustomer(null);
      setIsNewCustomer(false);
    }
  }, [normalizePhone, searchCustomer]);

  const handlePhoneBlur = useCallback(() => {
    const normalized = normalizePhone(phone);
    if (normalized.length >= 8) {
      searchCustomer(phone);
    }
  }, [phone, normalizePhone, searchCustomer]);

  const saveDietaryInfo = useCallback(async (): Promise<boolean> => {
    if (!companyId) return false;

    const normalized = normalizePhone(phone);
    if (normalized.length < 8 || !name.trim()) {
      toast.error('Preencha o telefone e nome');
      return false;
    }

    setIsSaving(true);

    try {
      if (customer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update({
            name: name.trim(),
            has_gluten_intolerance: hasGlutenIntolerance,
            has_lactose_intolerance: hasLactoseIntolerance,
            dietary_restrictions: dietaryRestrictions,
            allergy_notes: allergyNotes.trim() || null,
          })
          .eq('id', customer.id);

        if (error) throw error;

        const updatedCustomer: IdentifiedCustomer = {
          ...customer,
          name: name.trim(),
          has_gluten_intolerance: hasGlutenIntolerance,
          has_lactose_intolerance: hasLactoseIntolerance,
          dietary_restrictions: dietaryRestrictions,
          allergy_notes: allergyNotes.trim() || null,
        };

        setCustomer(updatedCustomer);
        onCustomerIdentified?.(updatedCustomer);
      } else {
      // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            company_id: companyId,
            name: name.trim(),
            whatsapp: normalized,
            has_gluten_intolerance: hasGlutenIntolerance,
            has_lactose_intolerance: hasLactoseIntolerance,
            dietary_restrictions: dietaryRestrictions,
            allergy_notes: allergyNotes.trim() || null,
          })
          .select()
          .single();

        if (error) {
          // Handle unique constraint violation - customer already exists
          if (error.code === '23505') {
            // Try to find and update existing customer
            const { data: existing } = await supabase
              .from('customers')
              .select('*')
              .eq('company_id', companyId)
              .eq('whatsapp', normalized)
              .maybeSingle();

            if (existing) {
              const { error: updateError } = await supabase
                .from('customers')
                .update({
                  name: name.trim(),
                  has_gluten_intolerance: hasGlutenIntolerance,
                  has_lactose_intolerance: hasLactoseIntolerance,
                  dietary_restrictions: dietaryRestrictions,
                  allergy_notes: allergyNotes.trim() || null,
                })
                .eq('id', existing.id);

              if (!updateError) {
                const updatedCustomer: IdentifiedCustomer = {
                  ...existing,
                  name: name.trim(),
                  has_gluten_intolerance: hasGlutenIntolerance,
                  has_lactose_intolerance: hasLactoseIntolerance,
                  dietary_restrictions: dietaryRestrictions,
                  allergy_notes: allergyNotes.trim() || null,
                };
                setCustomer(updatedCustomer);
                setIsNewCustomer(false);
                onCustomerIdentified?.(updatedCustomer);
                return true;
              }
            }
          }
          throw error;
        }

        const newCustomer: IdentifiedCustomer = {
          ...data,
          has_gluten_intolerance: data.has_gluten_intolerance ?? false,
          has_lactose_intolerance: data.has_lactose_intolerance ?? false,
          dietary_restrictions: data.dietary_restrictions ?? [],
          allergy_notes: data.allergy_notes ?? null,
        };

        setCustomer(newCustomer);
        setIsNewCustomer(false);
        onCustomerIdentified?.(newCustomer);
        onNewCustomer?.(normalized, name.trim());
      }

      return true;
    } catch (error) {
      console.error('Error saving customer:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    companyId,
    phone,
    name,
    customer,
    hasGlutenIntolerance,
    hasLactoseIntolerance,
    dietaryRestrictions,
    allergyNotes,
    normalizePhone,
    onCustomerIdentified,
    onNewCustomer,
  ]);

  const toggleDietaryRestriction = useCallback((restriction: string) => {
    setDietaryRestrictions((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  }, []);

  const hasDietaryRestrictions = hasGlutenIntolerance || 
    hasLactoseIntolerance || 
    dietaryRestrictions.length > 0 || 
    !!allergyNotes.trim();

  const reset = useCallback(() => {
    setPhone('');
    setName('');
    setCustomer(null);
    setIsNewCustomer(false);
    setHasGlutenIntolerance(false);
    setHasLactoseIntolerance(false);
    setDietaryRestrictions([]);
    setAllergyNotes('');
  }, []);

  return {
    // State
    phone,
    name,
    customer,
    isSearching,
    isNewCustomer,
    isSaving,
    // Dietary state
    hasGlutenIntolerance,
    hasLactoseIntolerance,
    dietaryRestrictions,
    allergyNotes,
    hasDietaryRestrictions,
    // Actions
    setPhone: handlePhoneChange,
    setName,
    handlePhoneBlur,
    setHasGlutenIntolerance,
    setHasLactoseIntolerance,
    setDietaryRestrictions,
    toggleDietaryRestriction,
    setAllergyNotes,
    saveDietaryInfo,
    searchCustomer,
    reset,
  };
}

// Common dietary restriction options
export const COMMON_DIETARY_RESTRICTIONS = [
  { id: 'vegetarian', label: 'Vegetariano', icon: '🥬' },
  { id: 'vegan', label: 'Vegano', icon: '🌱' },
  { id: 'shellfish', label: 'Frutos do Mar', icon: '🦐' },
  { id: 'peanut', label: 'Amendoim', icon: '🥜' },
  { id: 'tree_nuts', label: 'Castanhas', icon: '🌰' },
  { id: 'egg', label: 'Ovos', icon: '🥚' },
  { id: 'fish', label: 'Peixe', icon: '🐟' },
  { id: 'soy', label: 'Soja', icon: '🫘' },
] as const;
