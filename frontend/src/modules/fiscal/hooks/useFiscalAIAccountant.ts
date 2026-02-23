import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface FiscalIssue {
  productId: string;
  productName: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  currentValue?: string;
  suggestedValue?: string;
}

export interface FiscalSuggestion {
  productId?: string;
  productName: string;
  type?: string;
  message?: string;
  cfop_estadual?: string;
  cfop_interestadual?: string;
  csosn?: string;
  cst_icms?: string;
  cst_pis?: string;
  cst_cofins?: string;
  icms_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  has_st?: boolean;
  observations?: string;
  suggestedData?: any;
}

export interface FiscalAnalysisResult {
  success: boolean;
  regime: string;
  regimeName: string;
  totalProducts: number;
  issuesCount: number;
  suggestionsCount: number;
  issues: FiscalIssue[];
  suggestions: FiscalSuggestion[];
  message: string;
}

export interface FiscalValidationResult {
  canEmit: boolean;
  errors: any[];
  warnings: any[];
  corrections: any[];
  taxInfo: {
    regime: string;
    regimeName: string;
    pis: number;
    cofins: number;
    icms: number;
    notes: string;
  };
  suggestedCfop: string;
  message: string;
}

export interface TaxSummary {
  regime: string;
  regimeName: string;
  company: {
    name: string;
    cnpj: string;
    stateRegistration: string;
    state: string;
  };
  taxes: {
    usesCST: boolean;
    usesCSOSN: boolean;
    defaultCSOSN: string;
    defaultCSTICMS: string;
    pisRate: number;
    cofinsRate: number;
    notes: string;
  };
  cfop: {
    vendaEstadual: string;
    vendaInterestadual: string;
  };
  recommendations: string[];
}

export function useFiscalAIAccountant() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [lastAnalysis, setLastAnalysis] = useState<FiscalAnalysisResult | null>(null);

  // Get tax summary for the company
  const { data: taxSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['fiscal-tax-summary', company?.id],
    queryFn: async (): Promise<TaxSummary | null> => {
      if (!company?.id) return null;

      const { data, error } = await supabase.functions.invoke('fiscal-ai-accountant', {
        body: {
          action: 'get_tax_summary',
          companyId: company.id,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Analyze products
  const analyzeProducts = useMutation({
    mutationFn: async (productIds: string[]): Promise<FiscalAnalysisResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('fiscal-ai-accountant', {
        body: {
          action: 'analyze_products',
          companyId: company.id,
          products: productIds.map(id => ({ id })),
        },
      });

      if (error) throw error;
      setLastAnalysis(data);
      return data;
    },
    onSuccess: (data) => {
      if (data.issuesCount === 0) {
        toast.success('Todos os produtos estão corretamente configurados!');
      } else {
        toast.warning(`${data.issuesCount} problema(s) encontrado(s)`, {
          description: 'Revise as sugestões da IA Contadora',
        });
      }
    },
    onError: (error: any) => {
      toast.error('Erro na análise: ' + error.message);
    },
  });

  // Validate before emission
  const validateEmission = useMutation({
    mutationFn: async (params: {
      productIds: string[];
      operationType?: string;
      documentType?: string;
      customer?: any;
    }): Promise<FiscalValidationResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('fiscal-ai-accountant', {
        body: {
          action: 'validate_emission',
          companyId: company.id,
          products: params.productIds.map(id => ({ id })),
          operationType: params.operationType || 'venda_mercadoria_consumidor',
          documentType: params.documentType || 'nfce',
          customer: params.customer,
        },
      });

      if (error) throw error;
      return data;
    },
    onError: (error: any) => {
      toast.error('Erro na validação: ' + error.message);
    },
  });

  // Get AI suggestions
  const getSuggestions = useMutation({
    mutationFn: async (productIds: string[]): Promise<{
      success: boolean;
      usedAI: boolean;
      suggestions: FiscalSuggestion[];
      generalNotes?: string;
    }> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('fiscal-ai-accountant', {
        body: {
          action: 'suggest_correction',
          companyId: company.id,
          products: productIds.map(id => ({ id })),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.usedAI) {
        toast.success('Análise concluída com IA', {
          description: 'Sugestões geradas pelo contador virtual',
        });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao obter sugestões: ' + error.message);
    },
  });

  // Apply corrections
  const applyCorrections = useMutation({
    mutationFn: async (corrections: Array<{
      productId: string;
      ncm_code?: string;
      cfop_estadual?: string;
      cfop_interestadual?: string;
      csosn?: string;
      cst_icms?: string;
      cst_pis?: string;
      cst_cofins?: string;
      pis_rate?: number;
      cofins_rate?: number;
      has_st?: boolean;
    }>): Promise<{
      success: boolean;
      applied: number;
      errors: number;
      results: any[];
      message: string;
    }> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('fiscal-ai-accountant', {
        body: {
          action: 'apply_corrections',
          companyId: company.id,
          products: corrections,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-fiscal-data'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      if (data.errors === 0) {
        toast.success(data.message);
      } else {
        toast.warning(`${data.applied} correções aplicadas, ${data.errors} erro(s)`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao aplicar correções: ' + error.message);
    },
  });

  return {
    // Data
    taxSummary,
    lastAnalysis,
    
    // Loading states
    isSummaryLoading,
    isAnalyzing: analyzeProducts.isPending,
    isValidating: validateEmission.isPending,
    isGettingSuggestions: getSuggestions.isPending,
    isApplyingCorrections: applyCorrections.isPending,

    // Actions
    analyzeProducts: analyzeProducts.mutateAsync,
    validateEmission: validateEmission.mutateAsync,
    getSuggestions: getSuggestions.mutateAsync,
    applyCorrections: applyCorrections.mutateAsync,

    // Helpers
    clearAnalysis: () => setLastAnalysis(null),
  };
}
