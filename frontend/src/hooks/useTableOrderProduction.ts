import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { createPrintJobsForOrder } from '@/utils/createPrintJobsForOrder';
import type { Json } from '@/integrations/supabase/types';

interface TableOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  notes?: string;
  selectedOptionsJson?: Json;
}

interface CreateTableOrderParams {
  sessionId: string;
  tableId: string;
  tableNumber: number;
  commandName?: string | null;
  commandNumber?: number | null;
  items: TableOrderItem[];
}

/**
 * Hook to create orders from table items for KDS/Kitchen production.
 * This ensures table items go to production like counter/delivery orders.
 * 
 * CRITICAL: Also creates print jobs in print_job_queue for:
 * - Automatic printing via KitchenPrintListener
 * - KDS visibility (orders table is queried by KDS)
 */
export function useTableOrderProduction() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const createTableOrder = useMutation({
    mutationFn: async (params: CreateTableOrderParams) => {
      const {
        sessionId,
        tableId,
        tableNumber,
        commandName,
        commandNumber,
        items,
      } = params;
      
      if (!company?.id) throw new Error('No company');
      if (items.length === 0) throw new Error('No items');

      const companyId = company.id;

      // Create order via API
      const response = await api.post('/orders/from-table', {
        companyId,
        sessionId,
        tableId,
        tableNumber,
        commandName,
        commandNumber,
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
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['table-command-items'] });
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] });
    },
  });

  return {
    createTableOrder,
  };
}
