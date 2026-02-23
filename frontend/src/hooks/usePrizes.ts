import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { normalizePhone, findOrCreateCustomer, recordWheelSpin } from './useWheelEligibility';
import { toast } from 'sonner';

export interface Prize {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  probability: number;
  active: boolean;
  color: string;
  prize_type?: 'percentage' | 'fixed_value' | 'free_item';
  prize_value?: number;
  validity_days?: number;
  created_at: string;
  updated_at: string;
}

export interface PrizeWin {
  id: string;
  company_id: string;
  prize_id: string;
  customer_id: string | null;
  order_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
  prize?: Prize;
}

export function usePrizes() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ['prizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Prize[];
    },
    enabled: !!profile?.company_id,
  });

  const { data: wins = [], isLoading: winsLoading } = useQuery({
    queryKey: ['prize_wins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prize_wins')
        .select('*, prize:prizes(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PrizeWin[];
    },
    enabled: !!profile?.company_id,
  });

  const createPrize = useMutation({
    mutationFn: async (prize: Omit<Prize, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');
      
      const { data, error } = await supabase
        .from('prizes')
        .insert({ ...prize, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
      toast.success('Prêmio criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating prize:', error);
      toast.error(`Erro ao criar prêmio: ${error.message}`);
    },
  });

  const updatePrize = useMutation({
    mutationFn: async ({ id, ...prize }: Partial<Prize> & { id: string }) => {
      const { data, error } = await supabase
        .from('prizes')
        .update(prize)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
      toast.success('Prêmio atualizado!');
    },
    onError: (error: Error) => {
      console.error('Error updating prize:', error);
      toast.error(`Erro ao atualizar prêmio: ${error.message}`);
    },
  });

  const deletePrize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prizes'] });
    },
  });

  const redeemWin = useMutation({
    mutationFn: async (winId: string) => {
      const { error } = await supabase
        .from('prize_wins')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('id', winId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prize_wins'] });
    },
  });

  return {
    prizes,
    wins,
    isLoading,
    winsLoading,
    createPrize,
    updatePrize,
    deletePrize,
    redeemWin,
  };
}

// Hook for public prize wheel
export function usePublicPrizes(companyId: string | undefined) {
  const { data: prizes = [], isLoading } = useQuery({
    queryKey: ['public_prizes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true);

      if (error) throw error;
      return data as Prize[];
    },
    enabled: !!companyId,
  });

  const spinWheel = async (customerName: string, customerPhone: string): Promise<Prize | null> => {
    if (prizes.length === 0 || !companyId) return null;

    // Weighted random selection
    const totalWeight = prizes.reduce((sum, p) => sum + Number(p.probability), 0);
    let random = Math.random() * totalWeight;
    
    let selectedPrize: Prize | null = null;
    for (const prize of prizes) {
      random -= Number(prize.probability);
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }
    
    if (!selectedPrize) selectedPrize = prizes[0];

    const normalizedPhone = normalizePhone(customerPhone);

    // 1. Find or create customer
    const customerResult = await findOrCreateCustomer(companyId, customerName, customerPhone);

    // 2. Record the win in prize_wins (legacy)
    const { error } = await supabase
      .from('prize_wins')
      .insert({
        company_id: companyId,
        prize_id: selectedPrize.id,
        customer_id: customerResult?.id || null,
        customer_name: customerName,
        customer_phone: normalizedPhone,
      });

    if (error) {
      console.error('Error recording win:', error);
    }

    // 3. Create customer_rewards entry for automatic checkout application
    if (customerResult) {
      // Determine prize type and value from prize
      const prizeType = (selectedPrize as any).prize_type || 'percentage';
      const prizeValue = (selectedPrize as any).prize_value || 10; // Default 10%
      const validityDays = (selectedPrize as any).validity_days || 7; // Default 7 days

      await recordWheelSpin({
        companyId,
        customerId: customerResult.id,
        phone: customerPhone,
        prizeName: selectedPrize.name,
        prizeType,
        prizeValue,
        validityDays,
        ordersCount: 0,
        totalSpent: 0,
      });
    }

    return selectedPrize;
  };

  return {
    prizes,
    isLoading,
    spinWheel,
  };
}
