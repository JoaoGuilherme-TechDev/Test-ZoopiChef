import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export interface TaxSuggestion {
  product_id: string;
  product_name: string;
  ncm: string;
  cfop: string;
  aliquota_icms: number;
  razao: string;
}

export interface TaxAuditResult {
  stats: {
    total_products: number;
    without_ncm: number;
    without_cfop: number;
    potential_issues: number;
  };
  issues: Array<{
    product_id: string;
    product_name: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  analysis: {
    score: number;
    status: 'ok' | 'atencao' | 'critico';
    recomendacoes: string[];
  };
}

export function useTaxAudit() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['tax-audit', profile?.company_id],
    queryFn: async (): Promise<TaxAuditResult | null> => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase.functions.invoke('ai-tax-advisor', {
        body: {
          company_id: profile.company_id,
          action: 'audit_fiscal',
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnalyzeProducts() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-tax-advisor', {
        body: {
          company_id: profile.company_id,
          action: 'analyze_products',
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tax-audit'] });
      toast.success(data?.message || 'Análise de produtos concluída!');
    },
    onError: (error) => {
      console.error('Erro ao analisar produtos:', error);
      toast.error('Erro ao analisar produtos');
    },
  });
}

export function useSuggestNCM() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, productName, productDescription }: { 
      productId?: string; 
      productName: string;
      productDescription?: string;
    }) => {
      if (!profile?.company_id) throw new Error('Company não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-tax-advisor', {
        body: {
          company_id: profile.company_id,
          action: 'suggest_ncm',
          product_id: productId,
          product_name: productName,
          product_description: productDescription,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['tax-audit'] });
      if (data?.ncm) {
        toast.success(`NCM sugerido: ${data.ncm}`);
      }
    },
    onError: (error) => {
      console.error('Erro ao sugerir NCM:', error);
      toast.error('Erro ao sugerir NCM');
    },
  });
}
