import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { createPrintJobsForOrder } from '@/utils/createPrintJobsForOrder';
import type { Json } from '@/integrations/supabase/types';

interface ComandaOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  optionsJson?: Json;
}

interface CreateComandaOrderParams {
  comandaId: string;
  commandNumber: number;
  commandName?: string | null;
  items: ComandaOrderItem[];
}

/**
 * Hook to create orders from comanda items for KDS/Kitchen production.
 * This ensures comanda items go to production like table/delivery orders.
 * 
 * CRITICAL: Also creates print jobs in print_job_queue for:
 * - Automatic printing via KitchenPrintListener
 * - KDS visibility
 */
export function useComandaOrderProduction() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const createComandaOrder = useMutation({
    mutationFn: async ({
      comandaId,
      commandNumber,
      commandName,
      items,
    }: CreateComandaOrderParams) => {
      if (!company?.id) throw new Error('No company');
      if (items.length === 0) throw new Error('No items');

      const companyId = company.id;

      // Create order via API
      const response = await api.post('/orders/from-comanda', {
        companyId,
        comandaId,
        commandNumber,
        commandName,
        items,
      });

      const order = response.data;

      // Create print jobs for automatic printing and KDS visibility
      await createPrintJobsForOrder(companyId, order.id);

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['comanda-items'] });
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] });
    },
  });

  return {
    createComandaOrder,
  };
}
