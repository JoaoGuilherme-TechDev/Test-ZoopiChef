import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface CustomerLookupResult {
  id: string;
  name: string;
  whatsapp: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  allow_credit: boolean;
  credit_limit: number | null;
  credit_balance: number | null;
  internal_notes: string | null;
  is_blocked: boolean;
  block_reason: string | null;
  // Default address
  address?: {
    id: string;
    label: string;
    cep: string | null;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string | null;
    reference: string | null;
  } | null;
  addresses?: Array<{
    id: string;
    label: string;
    cep: string | null;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string | null;
    reference: string | null;
    is_default: boolean;
  }>;
}

interface UseCustomerLookupOptions {
  onCustomerFound?: (customer: CustomerLookupResult) => void;
  onCustomerNotFound?: () => void;
  showToast?: boolean;
  minDigits?: number;
}

export function useCustomerLookup(options: UseCustomerLookupOptions = {}) {
  const { company } = useCompanyContext();
  const [isSearching, setIsSearching] = useState(false);
  const [customer, setCustomer] = useState<CustomerLookupResult | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');

  const {
    onCustomerFound,
    onCustomerNotFound,
    showToast = false,
    minDigits = 8,
  } = options;

  const normalizePhone = useCallback((phone: string): string => {
    return phone.replace(/\D/g, '');
  }, []);

  const searchCustomer = useCallback(async (phone: string): Promise<CustomerLookupResult | null> => {
    if (!company?.id) return null;

    const normalizedPhone = normalizePhone(phone);
    
    // Skip if too short
    if (normalizedPhone.length < minDigits) {
      return null;
    }

    // Skip if same as last search
    if (normalizedPhone === lastSearchRef.current) {
      return customer;
    }

    lastSearchRef.current = normalizedPhone;
    setIsSearching(true);

    try {
      // Search by whatsapp or phone field
      const { data: customers, error } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          whatsapp,
          phone,
          email,
          document,
          allow_credit,
          credit_limit,
          credit_balance,
          internal_notes,
          is_blocked,
          block_reason,
          addresses:customer_addresses(
            id,
            label,
            cep,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            reference,
            is_default
          )
        `)
        .eq('company_id', company.id)
        .or(`whatsapp.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
        .limit(1);

      if (error) throw error;

      if (customers && customers.length > 0) {
        const foundCustomer = customers[0] as any;
        
        // Get default address
        const defaultAddress = foundCustomer.addresses?.find((a: any) => a.is_default) 
          || foundCustomer.addresses?.[0] 
          || null;

        const result: CustomerLookupResult = {
          ...foundCustomer,
          address: defaultAddress,
        };

        setCustomer(result);
        
        if (showToast) {
          toast.success(`Cliente encontrado: ${result.name}`);
        }
        
        onCustomerFound?.(result);
        return result;
      } else {
        setCustomer(null);
        onCustomerNotFound?.();
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      setCustomer(null);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [company?.id, normalizePhone, minDigits, customer, showToast, onCustomerFound, onCustomerNotFound]);

  const searchWithDebounce = useCallback((phone: string, delay: number = 500) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const normalizedPhone = normalizePhone(phone);
    
    if (normalizedPhone.length < minDigits) {
      setCustomer(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchCustomer(phone);
    }, delay);
  }, [searchCustomer, normalizePhone, minDigits]);

  const clearCustomer = useCallback(() => {
    setCustomer(null);
    lastSearchRef.current = '';
  }, []);

  const reset = useCallback(() => {
    setCustomer(null);
    setIsSearching(false);
    lastSearchRef.current = '';
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    customer,
    isSearching,
    searchCustomer,
    searchWithDebounce,
    clearCustomer,
    reset,
    normalizePhone,
  };
}

// Utility hook for form integration
export function useCustomerPhoneField(options: UseCustomerLookupOptions & {
  onFillForm?: (customer: CustomerLookupResult) => void;
} = {}) {
  const { onFillForm, ...lookupOptions } = options;

  const lookup = useCustomerLookup({
    ...lookupOptions,
    onCustomerFound: (customer) => {
      onFillForm?.(customer);
      lookupOptions.onCustomerFound?.(customer);
    },
  });

  const handlePhoneChange = useCallback((phone: string) => {
    lookup.searchWithDebounce(phone, 600);
  }, [lookup]);

  const handlePhoneBlur = useCallback((phone: string) => {
    lookup.searchCustomer(phone);
  }, [lookup]);

  return {
    ...lookup,
    handlePhoneChange,
    handlePhoneBlur,
  };
}
