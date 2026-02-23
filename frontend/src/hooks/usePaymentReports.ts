/**
 * Payment Reports Hook
 * 
 * Provides payment data with NSU for reports and filtering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface PaymentReportItem {
  id: string;
  nsu: string | null;
  amount: number;
  payment_method: string;
  created_at: string;
  comanda_id?: string;
  session_id?: string;
  table_id?: string;
  payer_name?: string | null;
  source: 'comanda' | 'table';
  comanda_number?: number | null;
  table_number?: string | null;
}

export interface PaymentReportFilters {
  startDate: string;
  endDate: string;
  paymentMethod?: string;
  nsu?: string;
}

export function usePaymentReports(filters: PaymentReportFilters) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['payment-reports', company?.id, filters],
    queryFn: async (): Promise<PaymentReportItem[]> => {
      if (!company?.id) return [];

      const results: PaymentReportItem[] = [];

      // Fetch comanda payments
      const { data: comandaPayments, error: comandaError } = await supabase
        .from('comanda_payments')
        .select(`
          id,
          nsu,
          amount,
          payment_method,
          created_at,
          comanda_id,
          paid_by_name,
          comandas!inner(command_number)
        `)
        .eq('company_id', company.id)
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (comandaError) throw comandaError;

      for (const payment of comandaPayments || []) {
        // Apply NSU filter if provided
        if (filters.nsu && payment.nsu && !payment.nsu.includes(filters.nsu)) {
          continue;
        }
        // Apply payment method filter if provided
        if (filters.paymentMethod && payment.payment_method !== filters.paymentMethod) {
          continue;
        }

        results.push({
          id: payment.id,
          nsu: payment.nsu,
          amount: payment.amount,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          comanda_id: payment.comanda_id,
          payer_name: payment.paid_by_name,
          source: 'comanda',
          comanda_number: (payment as any).comandas?.command_number,
        });
      }

      // Fetch table payments
      const { data: tablePayments, error: tableError } = await supabase
        .from('table_payments')
        .select(`
          id,
          nsu,
          amount_cents,
          payment_method,
          created_at,
          session_id,
          table_id,
          payer_name,
          tables!inner(table_number)
        `)
        .eq('company_id', company.id)
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (tableError) throw tableError;

      for (const payment of tablePayments || []) {
        // Apply NSU filter if provided
        if (filters.nsu && payment.nsu && !payment.nsu.includes(filters.nsu)) {
          continue;
        }
        // Apply payment method filter if provided
        if (filters.paymentMethod && payment.payment_method !== filters.paymentMethod) {
          continue;
        }

        results.push({
          id: payment.id,
          nsu: payment.nsu,
          amount: (payment.amount_cents || 0) / 100,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          session_id: payment.session_id,
          table_id: payment.table_id,
          payer_name: payment.payer_name,
          source: 'table',
          table_number: (payment as any).tables?.table_number,
        });
      }

      // Sort by date descending
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return results;
    },
    enabled: !!company?.id,
  });
}

/**
 * Search for a payment by NSU
 */
export function usePaymentByNSU(nsu: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['payment-by-nsu', company?.id, nsu],
    queryFn: async (): Promise<PaymentReportItem | null> => {
      if (!company?.id || !nsu) return null;

      // Search in comanda_payments
      const { data: comandaPayment } = await supabase
        .from('comanda_payments')
        .select(`
          id,
          nsu,
          amount,
          payment_method,
          created_at,
          comanda_id,
          paid_by_name,
          comandas!inner(command_number)
        `)
        .eq('company_id', company.id)
        .eq('nsu', nsu)
        .single();

      if (comandaPayment) {
        return {
          id: comandaPayment.id,
          nsu: comandaPayment.nsu,
          amount: comandaPayment.amount,
          payment_method: comandaPayment.payment_method,
          created_at: comandaPayment.created_at,
          comanda_id: comandaPayment.comanda_id,
          payer_name: comandaPayment.paid_by_name,
          source: 'comanda',
          comanda_number: (comandaPayment as any).comandas?.command_number,
        };
      }

      // Search in table_payments
      const { data: tablePayment } = await supabase
        .from('table_payments')
        .select(`
          id,
          nsu,
          amount_cents,
          payment_method,
          created_at,
          session_id,
          table_id,
          payer_name,
          tables!inner(table_number)
        `)
        .eq('company_id', company.id)
        .eq('nsu', nsu)
        .single();

      if (tablePayment) {
        return {
          id: tablePayment.id,
          nsu: tablePayment.nsu,
          amount: (tablePayment.amount_cents || 0) / 100,
          payment_method: tablePayment.payment_method,
          created_at: tablePayment.created_at,
          session_id: tablePayment.session_id,
          table_id: tablePayment.table_id,
          payer_name: tablePayment.payer_name,
          source: 'table',
          table_number: (tablePayment as any).tables?.table_number,
        };
      }

      return null;
    },
    enabled: !!company?.id && !!nsu,
  });
}
