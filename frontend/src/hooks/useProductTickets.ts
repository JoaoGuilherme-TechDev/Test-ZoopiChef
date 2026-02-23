/**
 * useProductTickets - Hook para gerenciar tickets de produto
 * 
 * Gera tickets no banco ao criar pedido e permite consultar/resgatar via QR code.
 * Lê configuração de company.ticket_config (JSONB).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import type { TicketConfig } from '@/components/company/TicketSystemConfig';

function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface TicketRecord {
  id: string;
  company_id: string;
  order_id: string;
  order_item_id: string;
  product_name: string;
  ticket_index: number;
  ticket_total: number;
  ticket_code: string;
  status: 'available' | 'used';
  used_at: string | null;
  used_by: string | null;
  customer_name: string | null;
  attendant_name: string | null;
  created_at: string;
}

interface GenerateTicketsParams {
  orderId: string;
  orderItems: Array<{
    id: string;
    product_name: string;
    quantity: number;
  }>;
  customerName?: string;
  attendantName?: string;
}

/** Extrai config de tickets da empresa, com fallback para colunas legadas */
function getTicketConfig(company: any): { enabled: boolean; perProduct: boolean; qrControl: boolean; showAttendant: boolean } {
  const tc = company?.ticket_config as TicketConfig | null;
  if (tc) {
    return {
      enabled: tc.enabled ?? false,
      perProduct: tc.generatePerItem ?? true,
      qrControl: tc.controlByQrCode ?? false,
      showAttendant: tc.header?.showOperatorName ?? false,
    };
  }
  // Fallback para colunas legadas
  return {
    enabled: company?.ticket_system_enabled ?? false,
    perProduct: company?.ticket_per_product ?? true,
    qrControl: company?.ticket_qr_control ?? false,
    showAttendant: company?.ticket_show_attendant ?? false,
  };
}

/**
 * Hook para gerar tickets de produto
 */
export function useGenerateProductTickets() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, orderItems, customerName, attendantName }: GenerateTicketsParams) => {
      if (!company?.id) throw new Error('No company');

      const ticketCfg = getTicketConfig(company);

      if (!ticketCfg.enabled) return [];

      const tickets: any[] = [];

      for (const item of orderItems) {
        const totalTickets = ticketCfg.perProduct
          ? item.quantity
          : 1;

        for (let i = 1; i <= totalTickets; i++) {
          tickets.push({
            company_id: company.id,
            order_id: orderId,
            order_item_id: item.id,
            product_name: item.product_name,
            ticket_index: i,
            ticket_total: totalTickets,
            ticket_code: generateTicketCode(),
            status: 'available',
            customer_name: customerName || null,
            attendant_name: ticketCfg.showAttendant ? (attendantName || null) : null,
          });
        }
      }

      if (tickets.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from('product_tickets')
        .insert(tickets)
        .select();

      if (error) throw error;
      return data as TicketRecord[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tickets'] });
    },
  });
}

/**
 * Hook para buscar tickets de um pedido
 */
export function useOrderTickets(orderId?: string) {
  return useQuery({
    queryKey: ['product-tickets', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await (supabase as any)
        .from('product_tickets')
        .select('*')
        .eq('order_id', orderId)
        .order('product_name', { ascending: true })
        .order('ticket_index', { ascending: true });

      if (error) throw error;
      return data as TicketRecord[];
    },
    enabled: !!orderId,
  });
}

/**
 * Hook para buscar ticket por código (QR Code scan)
 */
export function useTicketByCode(code?: string) {
  return useQuery({
    queryKey: ['product-ticket-code', code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await (supabase as any)
        .from('product_tickets')
        .select('*')
        .eq('ticket_code', code)
        .maybeSingle();

      if (error) throw error;
      return data as TicketRecord | null;
    },
    enabled: !!code && code.length > 0,
  });
}

/**
 * Hook para marcar ticket como usado
 */
export function useRedeemTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId?: string }) => {
      const { data, error } = await (supabase as any)
        .from('product_tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_by: userId || null,
        })
        .eq('id', ticketId)
        .eq('status', 'available')
        .select()
        .single();

      if (error) throw error;
      return data as TicketRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['product-ticket-code'] });
    },
  });
}
