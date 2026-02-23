import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface SupplierPayment {
  id: string;
  company_id: string;
  supplier_id: string;
  purchase_entry_id: string | null;
  amount_cents: number;
  due_date: string;
  paid_at: string | null;
  paid_by: string | null;
  payment_method: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSupplierPayments(supplierId?: string) {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['supplier-payments', company?.id, supplierId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_payments')
        .select('*')
        .eq('company_id', company!.id)
        .order('due_date', { ascending: true });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierPayment[];
    },
    enabled: !!company?.id,
  });

  const createPayment = useMutation({
    mutationFn: async (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .insert({
          ...payment,
          company_id: company!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Pagamento registrado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao registrar pagamento');
    },
  });

  const markAsPaid = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('supplier_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: userData.user?.id,
          payment_method: paymentMethod,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Pagamento confirmado!');
    },
    onError: () => {
      toast.error('Erro ao confirmar pagamento');
    },
  });

  const cancelPayment = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('supplier_payments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-payments'] });
      toast.success('Pagamento cancelado');
    },
    onError: () => {
      toast.error('Erro ao cancelar pagamento');
    },
  });

  const pendingPayments = payments?.filter(p => p.status === 'pending' || p.status === 'overdue') || [];
  const totalPending = pendingPayments.reduce((acc, p) => acc + p.amount_cents, 0);

  return {
    payments,
    isLoading,
    createPayment,
    markAsPaid,
    cancelPayment,
    pendingPayments,
    totalPending,
  };
}
