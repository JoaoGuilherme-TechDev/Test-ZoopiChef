import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { fetchAddressByCep, ViaCepResponse } from './useCustomerAddresses';

export interface CustomerAddress {
  id: string;
  label: string | null;
  cep: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface PublicCustomer {
  id: string;
  name: string;
  whatsapp: string;
  addresses: CustomerAddress[];
}

/**
 * Hook for managing customer data in public menu checkout
 * - Finds or creates customer by phone number
 * - Manages multiple addresses
 * - Fetches address from CEP
 */
export function usePublicCustomer(companyId: string | undefined) {
  const [customer, setCustomer] = useState<PublicCustomer | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Find customer by phone using secure RPC function
  const findOrCreateCustomer = useCallback(async (phone: string, name: string) => {
    if (!companyId || !phone) return null;
    
    setIsLoading(true);
    try {
      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Try to find existing customer using secure RPC function
      const { data: existingCustomers, error: findError } = await supabase
        .rpc('find_customer_by_phone', {
          p_company_id: companyId,
          p_phone: cleanPhone
        });

      if (findError) {
        console.error('Error finding customer:', findError);
        return null;
      }
      
      const existingCustomer = existingCustomers && existingCustomers.length > 0 
        ? existingCustomers[0] 
        : null;

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update name if provided and different
        if (name && name !== existingCustomer.name) {
          await supabase
            .from('customers')
            .update({ name })
            .eq('id', customerId);
        }
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            company_id: companyId,
            name: name || 'Cliente',
            whatsapp: cleanPhone,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating customer:', createError);
          return null;
        }
        customerId = newCustomer.id;
      }

      // Fetch customer addresses
      const { data: addressData } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false });

      const customerAddresses = (addressData || []) as CustomerAddress[];
      
      const customerData: PublicCustomer = {
        id: customerId,
        name: existingCustomer?.name || name,
        whatsapp: cleanPhone,
        addresses: customerAddresses,
      };

      setCustomer(customerData);
      setAddresses(customerAddresses);
      
      // Auto-select default address
      const defaultAddr = customerAddresses.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }

      return customerData;
    } catch (error) {
      console.error('Error in findOrCreateCustomer:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Fetch address from CEP
  const fetchCepAddress = useCallback(async (cep: string): Promise<ViaCepResponse | null> => {
    setCepLoading(true);
    try {
      const result = await fetchAddressByCep(cep);
      return result;
    } finally {
      setCepLoading(false);
    }
  }, []);

  // Save new address
  const saveAddress = useCallback(async (address: Omit<CustomerAddress, 'id'> & { customer_id: string }) => {
    if (!companyId) return null;

    try {
      // If this is the first address or marked as default, unset other defaults
      if (address.is_default && addresses.length > 0) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', address.customer_id);
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({
          ...address,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving address:', error);
        return null;
      }

      const newAddress = data as CustomerAddress;
      setAddresses(prev => [...prev, newAddress]);
      setSelectedAddressId(newAddress.id);
      
      return newAddress;
    } catch (error) {
      console.error('Error in saveAddress:', error);
      return null;
    }
  }, [companyId, addresses.length]);

  // Get selected address
  const selectedAddress = useMemo(() => {
    return addresses.find(a => a.id === selectedAddressId) || null;
  }, [addresses, selectedAddressId]);

  // Build full address string
  const buildAddressString = useCallback((addr: CustomerAddress | null): string => {
    if (!addr) return '';
    const parts = [
      addr.street,
      addr.number,
      addr.complement,
      addr.neighborhood,
      addr.city,
      addr.state,
    ].filter(Boolean);
    return parts.join(', ');
  }, []);

  return {
    customer,
    addresses,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    isLoading,
    cepLoading,
    findOrCreateCustomer,
    fetchCepAddress,
    saveAddress,
    buildAddressString,
  };
}
