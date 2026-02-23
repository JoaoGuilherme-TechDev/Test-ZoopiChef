import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

export interface PublicBillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  notes: string | null;
  status: string;
}

export interface PublicTableBill {
  sessionId: string;
  tableNumber: number;
  totalAmountCents: number;
  paidAmountCents: number;
  remainingCents: number;
  items: PublicBillItem[];
  openedAt: string;
}

export function usePublicTableBill(tableId: string | null, companyId: string | null) {
  return useQuery({
    queryKey: ['public-table-bill', tableId, companyId],
    queryFn: async (): Promise<PublicTableBill | null> => {
      if (!tableId || !companyId) return null;

      // Get active session for this table
      const { data: session, error: sessionError } = await supabase
        .from('table_sessions')
        .select('id, total_amount_cents, opened_at, table_id')
        .eq('table_id', tableId)
        .eq('company_id', companyId)
        .neq('status', 'closed')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError || !session) {
        console.error('Error fetching session:', sessionError);
        return null;
      }

      // Get table number
      const { data: table } = await supabase
        .from('tables')
        .select('number')
        .eq('id', tableId)
        .single();

      // Get all items for this session (active only)
      const { data: items, error: itemsError } = await supabase
        .from('table_command_items')
        .select('id, product_name, quantity, unit_price_cents, total_price_cents, notes, status')
        .eq('session_id', session.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return null;
      }

      // Get payments for this session
      const { data: payments } = await supabase
        .from('table_payments')
        .select('amount_cents')
        .eq('session_id', session.id);

      const paidAmountCents = payments?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
      const totalFromItems = items?.reduce((sum, item) => sum + item.total_price_cents, 0) || 0;
      // Use the greater of session total or calculated total
      const totalAmountCents = Math.max(session.total_amount_cents || 0, totalFromItems);

      return {
        sessionId: session.id,
        tableNumber: table?.number || 0,
        totalAmountCents,
        paidAmountCents,
        remainingCents: totalAmountCents - paidAmountCents,
        items: items || [],
        openedAt: session.opened_at,
      };
    },
    enabled: !!tableId && !!companyId,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30, // OTIMIZAÇÃO: 30 segundos (era 10s)
    refetchOnWindowFocus: false,
  });
}

export function usePublicComandaBill(comandaNumber: number | null, companyId: string | null) {
  return useQuery({
    queryKey: ['public-comanda-bill', comandaNumber, companyId],
    queryFn: async (): Promise<PublicTableBill | null> => {
      if (!comandaNumber || !companyId) return null;

      // Get active comanda
      const { data: comanda, error: comandaError } = await supabase
        .from('comandas')
        .select('id, total_amount, paid_amount, opened_at, command_number')
        .eq('command_number', comandaNumber)
        .eq('company_id', companyId)
        .neq('status', 'closed')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (comandaError || !comanda) {
        console.error('Error fetching comanda:', comandaError);
        return null;
      }

      // Get all items for this comanda (active only)
      const { data: items, error: itemsError } = await supabase
        .from('comanda_items')
        .select('id, product_name_snapshot, qty, unit_price_snapshot')
        .eq('comanda_id', comanda.id)
        .is('canceled_at', null)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching comanda items:', itemsError);
        return null;
      }

      const mappedItems: PublicBillItem[] = (items || []).map(item => ({
        id: item.id,
        product_name: item.product_name_snapshot,
        quantity: item.qty,
        unit_price_cents: Math.round(item.unit_price_snapshot * 100),
        total_price_cents: Math.round(item.unit_price_snapshot * item.qty * 100),
        notes: null,
        status: 'active',
      }));

      const totalAmountCents = Math.round(comanda.total_amount * 100);
      const paidAmountCents = Math.round(comanda.paid_amount * 100);

      return {
        sessionId: comanda.id,
        tableNumber: comanda.command_number,
        totalAmountCents,
        paidAmountCents,
        remainingCents: totalAmountCents - paidAmountCents,
        items: mappedItems,
        openedAt: comanda.opened_at,
      };
    },
    enabled: !!comandaNumber && !!companyId,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30, // OTIMIZAÇÃO: 30 segundos (era 10s)
    refetchOnWindowFocus: false,
  });
}
