import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export type TEFProvider = 'stone' | 'cielo' | 'clover' | 'rede' | 'getnet' | 'pagseguro';

export interface TEFIntegration {
  id: string;
  company_id: string;
  provider: TEFProvider;
  merchant_id: string | null;
  terminal_id: string | null;
  api_key: string | null;
  secret_key: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TEFTransaction {
  id: string;
  company_id: string;
  integration_id: string | null;
  order_id: string | null;
  cash_session_id: string | null;
  amount_cents: number;
  payment_type: 'credit' | 'debit' | 'pix' | 'voucher';
  installments: number;
  status: 'pending' | 'processing' | 'approved' | 'declined' | 'cancelled' | 'refunded';
  nsu: string | null;
  authorization_code: string | null;
  card_brand: string | null;
  card_last_digits: string | null;
  external_id: string | null;
  receipt_data: Record<string, unknown> | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export const TEF_PROVIDERS = [
  { value: 'stone' as TEFProvider, label: 'Stone', logo: '🟢', color: '#00A868' },
  { value: 'cielo' as TEFProvider, label: 'Cielo', logo: '🔵', color: '#0066CC' },
  { value: 'clover' as TEFProvider, label: 'Clover', logo: '🍀', color: '#2ECC71' },
  { value: 'rede' as TEFProvider, label: 'Rede', logo: '🔴', color: '#E30613' },
  { value: 'getnet' as TEFProvider, label: 'GetNet', logo: '🟠', color: '#FF6B00' },
  { value: 'pagseguro' as TEFProvider, label: 'PagSeguro', logo: '🟡', color: '#3ECF8E' },
];

export function useTEFIntegrations() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['tef-integrations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('tef_integrations')
        .select('*')
        .eq('company_id', company.id)
        .order('provider');
      if (error) throw error;
      return data as TEFIntegration[];
    },
    enabled: !!company?.id,
  });
}

export function useTEFTransactions(filters?: { startDate?: Date; endDate?: Date; status?: string }) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['tef-transactions', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = supabase
        .from('tef_transactions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TEFTransaction[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateTEFIntegration() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (integration: Partial<TEFIntegration>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      if (!integration.provider) throw new Error('Provider é obrigatório');
      const { data, error } = await supabase
        .from('tef_integrations')
        .upsert([{ 
          provider: integration.provider,
          merchant_id: integration.merchant_id,
          terminal_id: integration.terminal_id,
          api_key: integration.api_key,
          secret_key: integration.secret_key,
          environment: integration.environment || 'sandbox',
          is_active: integration.is_active ?? true,
          company_id: company.id, 
          settings: (integration.settings || {}) as any 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-integrations'] });
      toast.success('Integração TEF salva com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao salvar integração: ' + error.message);
    },
  });
}

export function useUpdateTEFIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TEFIntegration> & { id: string }) => {
      const { data, error } = await supabase
        .from('tef_integrations')
        .update({ ...updates, settings: updates.settings as any })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-integrations'] });
      toast.success('Integração atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteTEFIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tef_integrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-integrations'] });
      toast.success('Integração removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}

export function useProcessTEFPayment() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payment: {
      integrationId: string;
      amountCents: number;
      paymentType: 'credit' | 'debit' | 'pix' | 'voucher';
      installments?: number;
      orderId?: string;
      cashSessionId?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      // Create pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('tef_transactions')
        .insert([{
          company_id: company.id,
          integration_id: payment.integrationId,
          order_id: payment.orderId,
          cash_session_id: payment.cashSessionId,
          amount_cents: payment.amountCents,
          payment_type: payment.paymentType,
          installments: payment.installments || 1,
          status: 'processing',
        }])
        .select()
        .single();

      if (txError) throw txError;

      // Call edge function to process payment
      const { data, error } = await supabase.functions.invoke('tef-process-payment', {
        body: {
          transactionId: transaction.id,
          companyId: company.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tef-transactions'] });
    },
    onError: (error) => {
      toast.error('Erro ao processar pagamento: ' + error.message);
    },
  });
}

export function useTEFStats() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['tef-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('tef_transactions')
        .select('status, amount_cents, payment_type')
        .eq('company_id', company.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const stats = {
        totalTransactions: data.length,
        approved: data.filter(t => t.status === 'approved').length,
        declined: data.filter(t => t.status === 'declined').length,
        totalApproved: data.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.amount_cents, 0),
        byType: {
          credit: data.filter(t => t.payment_type === 'credit').reduce((sum, t) => sum + t.amount_cents, 0),
          debit: data.filter(t => t.payment_type === 'debit').reduce((sum, t) => sum + t.amount_cents, 0),
          pix: data.filter(t => t.payment_type === 'pix').reduce((sum, t) => sum + t.amount_cents, 0),
        },
      };

      return stats;
    },
    enabled: !!company?.id,
  });
}
