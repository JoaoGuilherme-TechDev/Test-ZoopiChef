import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { Employee, EmployeeFormData } from '../types';

export function useEmployees() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!company?.id,
  });

  const createEmployee = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { error } = await (supabase as any)
        .from('employees')
        .insert({ ...data, company_id: company.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionário cadastrado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar funcionário: ' + error.message);
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: EmployeeFormData & { id: string }) => {
      const { error } = await (supabase as any)
        .from('employees')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionário atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar funcionário: ' + error.message);
    },
  });

  const deactivateEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('employees')
        .update({ is_active: false, termination_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionário desativado');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar funcionário: ' + error.message);
    },
  });

  return {
    employees: employeesQuery.data || [],
    isLoading: employeesQuery.isLoading,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
  };
}
