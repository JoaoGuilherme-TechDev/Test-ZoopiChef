import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { EmployeeSchedule, ScheduleFormData } from '../types';

export function useEmployeeSchedules(employeeId?: string) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ['employee-schedules', company?.id, employeeId],
    queryFn: async () => {
      if (!company?.id) return [];
      let query = (supabase as any)
        .from('employee_schedules')
        .select('*, employee:employees(name)')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('day_of_week');
      
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmployeeSchedule[];
    },
    enabled: !!company?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { error } = await (supabase as any)
        .from('employee_schedules')
        .insert({ ...data, company_id: company.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedules'] });
      toast.success('Escala criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar escala: ' + error.message);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('employee_schedules')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-schedules'] });
      toast.success('Escala removida');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover escala: ' + error.message);
    },
  });

  return {
    schedules: schedulesQuery.data || [],
    isLoading: schedulesQuery.isLoading,
    createSchedule,
    deleteSchedule,
  };
}
