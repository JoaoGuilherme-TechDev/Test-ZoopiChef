import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  customer_id: string;
  street: string;
  number: string;
  neighborhood: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tax_id?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  // balance_cents convention: positive = customer owes (debt). Negative = customer has credit.
  credit_limit_cents: number;
  balance_cents: number;
  notes?: string;
  alert_message?: string;
  allow_fiado?: boolean;
  is_blocked?: boolean;
  is_active: boolean;
  created_at: string;
  addresses?: CustomerAddress[];
  orders?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── useCustomers — list + all mutations ─────────────────────────────────────

export function useCustomers(search?: string) {
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(search, 400);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["customers", debouncedSearch],
    queryFn: async () => {
      const res = await api.get<Customer[]>("/customers", {
        params: { search: debouncedSearch || undefined },
      });
      return res.data;
    },
    staleTime: 10_000,
  });

  const createCustomer = useMutation({
    mutationFn: (data: Partial<Customer>) => api.post("/customers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
    onError:   () => toast.error("Erro ao criar cliente."),
  });

  const updateCustomer = useMutation({
    mutationFn: ({ id, ...data }: Partial<Customer> & { id: string }) =>
      api.patch(`/customers/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", vars.id] });
    },
    onError: () => toast.error("Erro ao atualizar cliente."),
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
    onError:   () => toast.error("Erro ao excluir cliente."),
  });

  const addAddress = useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: Partial<CustomerAddress> }) =>
      api.post(`/customers/${customerId}/addresses`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer", vars.customerId] });
    },
    onError: () => toast.error("Erro ao salvar endereço."),
  });

  // FIX: was missing — address delete button was wired to nothing
  const deleteAddress = useMutation({
    mutationFn: ({ customerId, addressId }: { customerId: string; addressId: string }) =>
      api.delete(`/customers/${customerId}/addresses/${addressId}`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customer", vars.customerId] });
      toast.success("Endereço removido.");
    },
    onError: () => toast.error("Erro ao remover endereço."),
  });

  const registerPayment = useMutation({
    mutationFn: ({ customerId, amount_cents }: { customerId: string; amount_cents: number }) =>
      api.post(`/customers/${customerId}/pay`, { amount_cents }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", vars.customerId] });
      toast.success("Pagamento registrado!");
    },
    onError: () => toast.error("Erro ao registrar pagamento."),
  });

  const findByPhone = useMutation({
    mutationFn: async (rawPhone: string): Promise<Customer | null> => {
      const normalized = normalizePhone(rawPhone);
      if (normalized.length < 10) return null;
      const res = await api.get<Customer[]>("/customers", {
        params: { search: normalized },
      });
      return res.data.find(c => normalizePhone(c.phone || "") === normalized) ?? null;
    },
  });

  return {
    customers,
    isLoading,
    refetch,
    findByPhone,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    addAddress,
    deleteAddress,
    registerPayment,
  };
}

// ─── useCustomerDetail — single customer with addresses ───────────────────────

export function useCustomerDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await api.get<Customer>(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}