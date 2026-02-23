import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface CustomerAddress {
  id: string;
  company_id: string;
  customer_id: string;
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
  created_at: string;
}

export function useCustomerAddresses(customerId: string | undefined) {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const addressesQuery = useQuery({
    queryKey: ['customer_addresses', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!customerId,
  });

  const addAddress = useMutation({
    mutationFn: async (address: {
      customer_id: string;
      label?: string | null;
      cep?: string | null;
      street: string;
      number: string;
      complement?: string | null;
      neighborhood: string;
      city: string;
      state?: string | null;
      reference?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      is_default?: boolean;
    }) => {
      if (!profile?.company_id) throw new Error('No company');
      
      // Insert the address first
      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({ 
          ...address, 
          company_id: profile.company_id,
          state: address.state || '',
        })
        .select()
        .single();
      if (error) throw error;
      
      // Geocode the address in background (don't block)
      if (data && (!data.latitude || !data.longitude)) {
        geocodeAddressAsync(data.id, {
          address: address.street,
          number: address.number,
          cep: address.cep,
          city: address.city,
          state: address.state,
          neighborhood: address.neighborhood,
        });
      }
      
      return data as CustomerAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_addresses'] });
      toast.success('Endereço salvo');
    },
    onError: () => toast.error('Erro ao salvar endereço'),
  });
  
  // Background geocoding function
  const geocodeAddressAsync = async (addressId: string, addressData: {
    address?: string;
    number?: string;
    cep?: string | null;
    city?: string;
    state?: string | null;
    neighborhood?: string;
  }) => {
    try {
      const response = await supabase.functions.invoke('geocode-address', {
        body: {
          action: 'geocode_customer_address',
          address_id: addressId,
          address: addressData.address,
          number: addressData.number,
          cep: addressData.cep,
          city: addressData.city,
          state: addressData.state,
          neighborhood: addressData.neighborhood,
        },
      });
      
      if (response.data?.geocoded) {
        console.log('Address geocoded successfully:', response.data);
        // Refresh addresses to get updated coordinates
        queryClient.invalidateQueries({ queryKey: ['customer_addresses'] });
      }
    } catch (err) {
      console.error('Geocoding failed (non-blocking):', err);
    }
  };

  const updateAddress = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomerAddress> & { id: string }) => {
      const { error } = await supabase
        .from('customer_addresses')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_addresses'] });
      toast.success('Endereço atualizado');
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_addresses'] });
      toast.success('Endereço removido');
    },
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!customerId) throw new Error('No customer');
      
      // First, unset all defaults for this customer
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customerId);
      
      // Then set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer_addresses'] });
      toast.success('Endereço principal definido');
    },
  });

  return {
    addresses: addressesQuery.data || [],
    isLoading: addressesQuery.isLoading,
    addAddress,
    createAddress: addAddress, // Alias for compatibility
    updateAddress,
    deleteAddress,
    setDefault,
  };
}

// Hook to fetch address from CEP (ViaCEP API)
export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return data as ViaCepResponse;
  } catch {
    return null;
  }
}
