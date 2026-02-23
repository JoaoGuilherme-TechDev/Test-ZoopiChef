import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { ERPSupplier, ERPSupplierFormData } from '../types';

export function useERPSuppliers() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({
    queryKey: ['erp-suppliers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('erp_suppliers')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as ERPSupplier[];
    },
    enabled: !!company?.id,
  });

  const createSupplier = useMutation({
    mutationFn: async (data: ERPSupplierFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      const { data: result, error } = await (supabase as any)
        .from('erp_suppliers')
        .insert({
          company_id: company.id,
          name: data.name,
          doc: data.doc || null,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor criado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar fornecedor: ' + error.message);
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...data }: ERPSupplierFormData & { id: string }) => {
      const { data: result, error } = await (supabase as any)
        .from('erp_suppliers')
        .update({
          name: data.name,
          doc: data.doc || null,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar fornecedor: ' + error.message);
    },
  });

  const deactivateSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('erp_suppliers')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-suppliers'] });
      toast.success('Fornecedor desativado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar fornecedor: ' + error.message);
    },
  });

  return {
    suppliers: suppliersQuery.data || [],
    isLoading: suppliersQuery.isLoading,
    createSupplier,
    updateSupplier,
    deactivateSupplier,
  };
}
