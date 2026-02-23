import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ComandaPayment {
  id: string;
  company_id: string;
  comanda_id: string;
  amount: number;
  payment_method: string;
  paid_by_name: string | null;
  paid_by_user_id: string | null;
  customer_id: string | null;
  loyalty_points_awarded: number;
  nsu: string | null;
  created_at: string;
}

const mapComandaPaymentToFrontend = (p: any): ComandaPayment => ({
  id: p.id,
  company_id: p.companyId,
  comanda_id: p.comandaId,
  amount: Number(p.amount),
  payment_method: p.paymentMethod,
  paid_by_name: p.paidByName,
  paid_by_user_id: p.paidByUserId,
  customer_id: p.customerId,
  loyalty_points_awarded: Number(p.loyaltyPointsAwarded),
  nsu: p.nsu,
  created_at: p.createdAt,
});

export function useComandaPayments(comandaId: string | null) {
  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['comanda-payments', comandaId],
    queryFn: async () => {
      if (!comandaId) return [];

      const response = await api.get('/comanda-payments', {
        params: { comandaId }
      });

      return (response.data || []).map(mapComandaPaymentToFrontend);
    },
    enabled: !!comandaId,
    refetchInterval: 5000,
  });

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return { payments, totalPaid, isLoading, error, refetch };
}

export function useComandaPaymentMutations() {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addPayment = useMutation({
    mutationFn: async ({
      comandaId,
      amount,
      paymentMethod,
      paidByName,
      customerId,
      externalNsu,
    }: {
      comandaId: string;
      amount: number;
      paymentMethod: string;
      paidByName?: string;
      customerId?: string;
      externalNsu?: string; // NSU from external provider (TEF, POS, etc.)
    }) => {
      if (!companyId) throw new Error('Company not found');

      const response = await api.post('/comanda-payments', {
        comandaId,
        amount,
        paymentMethod,
        paidByName,
        customerId,
        nsu: externalNsu,
      });

      return mapComandaPaymentToFrontend(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comanda-payments', variables.comandaId] });
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      queryClient.invalidateQueries({ queryKey: ['comanda', variables.comandaId] });

      toast.success('Pagamento registrado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await api.delete(`/comanda-payments/${paymentId}`);
      return response.data; // { success: true, comandaId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comanda-payments'] });
      queryClient.invalidateQueries({ queryKey: ['comandas', companyId] });
      if (data?.comandaId) {
        queryClient.invalidateQueries({ queryKey: ['comanda', data.comandaId] });
      }
      toast.success('Pagamento removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover pagamento: ' + error.message);
    },
  });

  return { addPayment, deletePayment };
}
