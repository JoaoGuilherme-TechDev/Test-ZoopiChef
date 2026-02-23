import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ExtractedProduct {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  subcategory?: string;
  ncm_code?: string;
  ean_code?: string;
  internal_code?: string;
  composition?: string;
  is_weighted?: boolean;
  has_st?: boolean;
  cfop_estadual?: string;
  cfop_interestadual?: string;
  tax_notes?: string;
  // Pizza-specific (ONLY when category === "Pizza")
  is_pizza?: boolean;
  // Creative name suggestion
  suggested_name?: string;
  // UI state
  selected?: boolean;
  subcategory_id?: string;
}

export interface ExtractionResult {
  success: boolean;
  products: ExtractedProduct[];
  summary: string;
  newCategoriesSuggested: string[];
  newSubcategoriesSuggested: { name: string; category: string }[];
  existingCategories: { id: string; name: string }[];
  existingSubcategories: { id: string; name: string; category_id: string }[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  errorDetails: { product: string; error: string }[];
  products: any[];
  message: string;
}

export function useAIProductImport() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  // Extract products from file content
  const extractProducts = useMutation({
    mutationFn: async (params: {
      fileContent: string;
      fileType: string;
      fileName: string;
    }): Promise<ExtractionResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'extract',
          companyId: company.id,
          fileContent: params.fileContent,
          fileType: params.fileType,
          fileName: params.fileName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na extração');

      return data;
    },
    onSuccess: (data) => {
      setExtractionResult(data);
      setExtractedProducts(data.products.map((p: ExtractedProduct) => ({
        ...p,
        selected: true,
      })));
      toast.success(`${data.products.length} produtos extraídos`, {
        description: data.summary,
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao extrair produtos: ' + error.message);
    },
  });

  // Analyze fiscal data for products
  const analyzeFiscal = useMutation({
    mutationFn: async (products: ExtractedProduct[]): Promise<{
      success: boolean;
      products: ExtractedProduct[];
      taxRegime: string;
      regimeName: string;
    }> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'analyze_fiscal',
          companyId: company.id,
          products,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na análise fiscal');

      return data;
    },
    onSuccess: (data) => {
      setExtractedProducts(prev => 
        prev.map(p => {
          const enriched = data.products.find(
            (ep: ExtractedProduct) => ep.name === p.name
          );
          return enriched ? { ...p, ...enriched } : p;
        })
      );
      toast.success('Análise fiscal concluída', {
        description: `Regime: ${data.regimeName}`,
      });
    },
    onError: (error: any) => {
      toast.error('Erro na análise fiscal: ' + error.message);
    },
  });

  // Import selected products
  const importProducts = useMutation({
    mutationFn: async (params: {
      products: ExtractedProduct[];
      subcategoryId?: string;
    }): Promise<ImportResult> => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      const selectedProducts = params.products.filter(p => p.selected !== false);
      
      if (selectedProducts.length === 0) {
        throw new Error('Nenhum produto selecionado para importar');
      }

      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'import',
          companyId: company.id,
          products: selectedProducts,
          subcategoryId: params.subcategoryId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na importação');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      
      toast.success(data.message);
      
      // Clear state after successful import
      setExtractedProducts([]);
      setExtractionResult(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });

  // Update a single extracted product
  const updateExtractedProduct = (index: number, updates: Partial<ExtractedProduct>) => {
    setExtractedProducts(prev => 
      prev.map((p, i) => i === index ? { ...p, ...updates } : p)
    );
  };

  // Toggle product selection
  const toggleProductSelection = (index: number) => {
    setExtractedProducts(prev =>
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  // Select/deselect all
  const toggleAllProducts = (selected: boolean) => {
    setExtractedProducts(prev => prev.map(p => ({ ...p, selected })));
  };

  // Remove product from list
  const removeProduct = (index: number) => {
    setExtractedProducts(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all extracted products
  const clearExtraction = () => {
    setExtractedProducts([]);
    setExtractionResult(null);
  };

  return {
    // Data
    extractedProducts,
    extractionResult,
    selectedCount: extractedProducts.filter(p => p.selected !== false).length,
    
    // Loading states
    isExtracting: extractProducts.isPending,
    isAnalyzingFiscal: analyzeFiscal.isPending,
    isImporting: importProducts.isPending,

    // Actions
    extractProducts: extractProducts.mutateAsync,
    analyzeFiscal: analyzeFiscal.mutateAsync,
    importProducts: importProducts.mutateAsync,

    // Product management
    updateExtractedProduct,
    toggleProductSelection,
    toggleAllProducts,
    removeProduct,
    clearExtraction,
  };
}
