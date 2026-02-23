import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type SplitType = 'equal' | 'by_item' | 'custom';

export interface BillSplitParticipant {
  id: string;
  bill_split_id: string;
  participant_name: string | null;
  amount_cents: number;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  items?: BillSplitItem[];
}

export interface BillSplitItem {
  id: string;
  participant_id: string;
  item_name: string;
  quantity: number;
  amount_cents: number;
}

export interface BillSplit {
  id: string;
  company_id: string;
  order_id: string | null;
  comanda_id: string | null;
  split_type: SplitType;
  total_amount_cents: number;
  number_of_splits: number;
  created_at: string;
  participants?: BillSplitParticipant[];
}

export interface CreateBillSplitParams {
  orderId?: string;
  comandaId?: string;
  splitType: SplitType;
  totalAmountCents: number;
  numberOfSplits: number;
  participants?: {
    name?: string;
    amountCents: number;
    items?: { itemName: string; quantity: number; amountCents: number }[];
  }[];
}

export function useBillSplit(orderId?: string, comandaId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: billSplit, isLoading } = useQuery({
    queryKey: ['bill-split', orderId, comandaId],
    queryFn: async () => {
      if (!company?.id || (!orderId && !comandaId)) return null;

      let query = supabase
        .from('bill_splits')
        .select(`
          *,
          participants:bill_split_participants(
            *,
            items:bill_split_items(*)
          )
        `)
        .eq('company_id', company.id);

      if (orderId) query = query.eq('order_id', orderId);
      if (comandaId) query = query.eq('comanda_id', comandaId);

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as BillSplit | null;
    },
    enabled: !!company?.id && (!!orderId || !!comandaId),
  });

  const createBillSplit = useMutation({
    mutationFn: async (params: CreateBillSplitParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Create the bill split
      const { data: split, error: splitError } = await supabase
        .from('bill_splits')
        .insert({
          company_id: company.id,
          order_id: params.orderId,
          comanda_id: params.comandaId,
          split_type: params.splitType,
          total_amount_cents: params.totalAmountCents,
          number_of_splits: params.numberOfSplits,
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // Create participants
      if (params.participants && params.participants.length > 0) {
        const participantsToInsert = params.participants.map((p) => ({
          bill_split_id: split.id,
          participant_name: p.name || null,
          amount_cents: p.amountCents,
          paid: false,
        }));

        const { data: insertedParticipants, error: partError } = await supabase
          .from('bill_split_participants')
          .insert(participantsToInsert)
          .select();

        if (partError) throw partError;

        // Create items for by_item split
        if (params.splitType === 'by_item' && insertedParticipants) {
          for (let i = 0; i < params.participants.length; i++) {
            const participant = params.participants[i];
            const insertedParticipant = insertedParticipants[i];
            
            if (participant.items && participant.items.length > 0) {
              const itemsToInsert = participant.items.map((item) => ({
                participant_id: insertedParticipant.id,
                item_name: item.itemName,
                quantity: item.quantity,
                amount_cents: item.amountCents,
              }));

              const { error: itemsError } = await supabase
                .from('bill_split_items')
                .insert(itemsToInsert);

              if (itemsError) throw itemsError;
            }
          }
        }
      } else {
        // Auto-create equal participants
        const amountPerPerson = Math.floor(params.totalAmountCents / params.numberOfSplits);
        const remainder = params.totalAmountCents % params.numberOfSplits;

        const participantsToInsert = Array.from({ length: params.numberOfSplits }, (_, i) => ({
          bill_split_id: split.id,
          participant_name: `Pessoa ${i + 1}`,
          amount_cents: amountPerPerson + (i === 0 ? remainder : 0),
          paid: false,
        }));

        const { error: partError } = await supabase
          .from('bill_split_participants')
          .insert(participantsToInsert);

        if (partError) throw partError;
      }

      return split;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-split'] });
      toast.success('Divisão de conta criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar divisão: ' + error.message);
    },
  });

  const markParticipantPaid = useMutation({
    mutationFn: async ({ participantId, paymentMethod }: { participantId: string; paymentMethod: string }) => {
      const { error } = await supabase
        .from('bill_split_participants')
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .eq('id', participantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-split'] });
      toast.success('Pagamento registrado!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });

  const deleteBillSplit = useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase.from('bill_splits').delete().eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-split'] });
      toast.success('Divisão removida!');
    },
    onError: (error) => {
      toast.error('Erro ao remover divisão: ' + error.message);
    },
  });

  return {
    billSplit,
    isLoading,
    createBillSplit,
    markParticipantPaid,
    deleteBillSplit,
  };
}
