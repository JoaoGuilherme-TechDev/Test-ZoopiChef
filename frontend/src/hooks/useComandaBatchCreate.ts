import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';

export interface BatchCreateResult {
  created: number[];
  skipped: number[];
  failed: Array<{ number: number; reason: string }>;
  totalCreated: number;
  totalSkipped: number;
  totalFailed: number;
}

export function useComandaBatchCreate() {
  const { company } = useCompanyContext();
  const companyId = company?.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Check which comandas already exist in the given range
   */
  const checkExistingComandas = async (
    startNumber: number,
    endNumber: number
  ): Promise<Set<number>> => {
    if (!companyId) return new Set();

    try {
      const response = await api.get('/comandas/check-batch', {
        params: { start: startNumber, end: endNumber }
      });
      return new Set(response.data || []);
    } catch (error) {
      console.error('[BatchCreate] Error checking existing:', error);
      return new Set();
    }
  };

  const batchCreateComandas = useMutation({
    mutationFn: async ({
      startNumber,
      endNumber,
      applyServiceFee,
      serviceFeePercent,
    }: {
      startNumber: number;
      endNumber: number;
      applyServiceFee: boolean;
      serviceFeePercent: number;
    }): Promise<BatchCreateResult> => {
      if (!companyId) throw new Error('Company not found');

      if (startNumber > endNumber) {
        throw new Error('Número inicial deve ser menor ou igual ao final');
      }

      if (endNumber - startNumber > 200) {
        throw new Error('Máximo de 200 comandas por vez');
      }

      const response = await api.post('/comandas/batch', {
        startNumber,
        endNumber,
        applyServiceFee,
        serviceFeePercent,
      });

      const result = response.data;
      
      return {
        created: result.created || [],
        skipped: result.skipped || [],
        failed: result.failed || [],
        totalCreated: (result.created || []).length,
        totalSkipped: (result.skipped || []).length,
        totalFailed: (result.failed || []).length,
      };
    },
    onSuccess: () => {
      // Invalidate ALL comanda queries to refresh the map
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
    },
  });

  return { batchCreateComandas, checkExistingComandas };
}
