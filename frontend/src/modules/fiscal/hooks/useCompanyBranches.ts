import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { CompanyBranch, CompanyBranchFormData, PDVFiscalValidation } from '../types/company-branch';

export function useCompanyBranches() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all branches for the company
  const branchesQuery = useQuery({
    queryKey: ['company-branches', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('company_branches')
        .select('*')
        .eq('company_id', company.id)
        .order('razao_social');
      if (error) throw error;
      return data as CompanyBranch[];
    },
    enabled: !!company?.id,
  });

  // Create a new branch
  const createBranch = useMutation({
    mutationFn: async (formData: CompanyBranchFormData) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await (supabase as any)
        .from('company_branches')
        .insert({
          company_id: company.id,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CompanyBranch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      toast.success('Empresa fiscal cadastrada com sucesso');
    },
    onError: (error: any) => {
      if (error.message?.includes('unique_cnpj_per_company')) {
        toast.error('Este CNPJ já está cadastrado');
      } else {
        toast.error('Erro ao cadastrar empresa: ' + error.message);
      }
    },
  });

  // Update a branch
  const updateBranch = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<CompanyBranchFormData> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('company_branches')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CompanyBranch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      toast.success('Empresa fiscal atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar empresa: ' + error.message);
    },
  });

  // Delete a branch (only if no documents emitted)
  const deleteBranch = useMutation({
    mutationFn: async (branchId: string) => {
      // Check if there are fiscal documents for this branch
      const { count, error: countError } = await (supabase as any)
        .from('fiscal_documents')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId);

      if (countError) throw countError;
      if (count && count > 0) {
        throw new Error('Não é possível excluir empresa com documentos fiscais emitidos');
      }

      const { error } = await (supabase as any)
        .from('company_branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      toast.success('Empresa fiscal excluída');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Toggle branch active status
  const toggleBranchActive = useMutation({
    mutationFn: async ({ branchId, isActive }: { branchId: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from('company_branches')
        .update({ is_active: isActive })
        .eq('id', branchId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      toast.success(isActive ? 'Empresa ativada' : 'Empresa desativada');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  // Upload certificate for a branch
  const uploadCertificate = useMutation({
    mutationFn: async ({ branchId, base64, password, validUntil }: { 
      branchId: string; 
      base64: string; 
      password: string;
      validUntil: string;
    }) => {
      const { error } = await (supabase as any)
        .from('company_branches')
        .update({
          certificado_base64: base64,
          certificado_senha: password,
          certificado_validade: validUntil,
        })
        .eq('id', branchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      toast.success('Certificado digital configurado');
    },
    onError: (error: any) => {
      toast.error('Erro ao configurar certificado: ' + error.message);
    },
  });

  // Validate PDV for fiscal emission
  const validatePDVEmission = async (pdvId: string): Promise<PDVFiscalValidation | null> => {
    const { data, error } = await (supabase as any)
      .rpc('validate_pdv_fiscal_emission', { p_pdv_id: pdvId });

    if (error) {
      console.error('Validation error:', error);
      return null;
    }

    return data?.[0] || null;
  };

  return {
    branches: branchesQuery.data || [],
    isLoading: branchesQuery.isLoading,
    createBranch,
    updateBranch,
    deleteBranch,
    toggleBranchActive,
    uploadCertificate,
    validatePDVEmission,
    refetch: branchesQuery.refetch,
  };
}
