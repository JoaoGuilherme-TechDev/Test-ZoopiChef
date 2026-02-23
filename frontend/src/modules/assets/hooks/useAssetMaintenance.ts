import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { AssetMaintenance, MaintenanceFormData } from '../types';

export function useAssetMaintenance(assetId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const maintenanceQuery = useQuery({
    queryKey: ['asset-maintenance', company?.id, assetId],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = (supabase as any)
        .from('asset_maintenance')
        .select('*, asset:assets(name, code)')
        .eq('company_id', company.id)
        .order('scheduled_date', { ascending: true });
      
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AssetMaintenance[];
    },
    enabled: !!company?.id,
  });

  const createMaintenance = useMutation({
    mutationFn: async (data: MaintenanceFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const insertData: any = { ...data, company_id: company.id };
      
      // Calculate next maintenance if recurrence is set
      if (data.recurrence_days && data.scheduled_date) {
        const scheduled = new Date(data.scheduled_date);
        scheduled.setDate(scheduled.getDate() + data.recurrence_days);
        insertData.next_maintenance_date = scheduled.toISOString().split('T')[0];
      }
      
      const { error } = await (supabase as any)
        .from('asset_maintenance')
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
      toast.success('Manutenção agendada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao agendar manutenção: ' + error.message);
    },
  });

  const completeMaintenance = useMutation({
    mutationFn: async ({ id, cost_cents, notes }: { id: string; cost_cents?: number; notes?: string }) => {
      const { data: maintenance, error: fetchError } = await (supabase as any)
        .from('asset_maintenance')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      // Update current maintenance
      const { error } = await (supabase as any)
        .from('asset_maintenance')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          cost_cents,
          notes,
        })
        .eq('id', id);
      if (error) throw error;

      // Create next recurrence if applicable
      if (maintenance.recurrence_days && maintenance.next_maintenance_date) {
        const nextDate = new Date(maintenance.next_maintenance_date);
        const futureDate = new Date(nextDate);
        futureDate.setDate(futureDate.getDate() + maintenance.recurrence_days);

        await (supabase as any)
          .from('asset_maintenance')
          .insert({
            company_id: maintenance.company_id,
            asset_id: maintenance.asset_id,
            maintenance_type: maintenance.maintenance_type,
            description: maintenance.description,
            scheduled_date: maintenance.next_maintenance_date,
            recurrence_days: maintenance.recurrence_days,
            next_maintenance_date: futureDate.toISOString().split('T')[0],
            provider_name: maintenance.provider_name,
            provider_phone: maintenance.provider_phone,
            status: 'scheduled',
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Manutenção concluída');
    },
    onError: (error: any) => {
      toast.error('Erro ao concluir manutenção: ' + error.message);
    },
  });

  const cancelMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('asset_maintenance')
        .update({ status: 'canceled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-maintenance'] });
      toast.success('Manutenção cancelada');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar manutenção: ' + error.message);
    },
  });

  // Filter maintenance by status
  const pendingMaintenance = maintenanceQuery.data?.filter(
    m => m.status === 'scheduled' || m.status === 'in_progress'
  ) || [];

  const overdueMaintenance = pendingMaintenance.filter(m => {
    if (!m.scheduled_date) return false;
    return new Date(m.scheduled_date) < new Date();
  });

  return {
    maintenance: maintenanceQuery.data || [],
    pendingMaintenance,
    overdueMaintenance,
    isLoading: maintenanceQuery.isLoading,
    createMaintenance,
    completeMaintenance,
    cancelMaintenance,
  };
}
