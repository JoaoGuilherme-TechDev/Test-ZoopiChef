import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type PrintMode = 'browser' | 'windows' | 'network';

export interface PrintSector {
  id: string;
  company_id: string;
  name: string;
  color: string;
  sla_minutes: number;
  active: boolean;
  display_order: number;
  print_mode: PrintMode;
  printer_name: string | null;
  printer_host: string | null;
  printer_port: number;
  copy_to_sector_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductPrintSector {
  id: string;
  product_id: string;
  sector_id: string;
  created_at: string;
}

export function usePrintSectors() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: sectors = [], isLoading, error } = useQuery({
    queryKey: ['print-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('print_sectors')
        .select('*')
        .eq('company_id', company.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as PrintSector[];
    },
    enabled: !!company?.id,
  });

  const createSector = useMutation({
    mutationFn: async (sector: { name: string; color?: string; sla_minutes?: number; active?: boolean; display_order?: number }) => {
      if (!company?.id) throw new Error('No company');
      
      const { data, error } = await supabase
        .from('print_sectors')
        .insert([{ ...sector, company_id: company.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-sectors'] });
      toast.success('Setor criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar setor');
    },
  });

  const updateSector = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PrintSector> & { id: string }) => {
      const { data, error } = await supabase
        .from('print_sectors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-sectors'] });
      toast.success('Setor atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar setor');
    },
  });

  const deleteSector = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('print_sectors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-sectors'] });
      toast.success('Setor excluído!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir setor');
    },
  });

  return {
    sectors,
    activeSectors: sectors.filter(s => s.active),
    isLoading,
    error,
    createSector,
    updateSector,
    deleteSector,
  };
}

export function useProductPrintSectors() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['product-print-sectors', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Get all product-sector mappings for products in this company
      const { data, error } = await supabase
        .from('product_print_sectors')
        .select(`
          *,
          product:products!inner(id, company_id),
          sector:print_sectors!inner(id, name, color)
        `)
        .eq('product.company_id', company.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const assignSector = useMutation({
    mutationFn: async ({ productId, sectorId }: { productId: string; sectorId: string }) => {
      const { data, error } = await supabase
        .from('product_print_sectors')
        .insert({ product_id: productId, sector_id: sectorId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-print-sectors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao vincular setor');
    },
  });

  const removeSector = useMutation({
    mutationFn: async ({ productId, sectorId }: { productId: string; sectorId: string }) => {
      const { error } = await supabase
        .from('product_print_sectors')
        .delete()
        .eq('product_id', productId)
        .eq('sector_id', sectorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-print-sectors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover setor');
    },
  });

  // Helper to get sectors for a specific product
  const getSectorsForProduct = (productId: string) => {
    return mappings.filter((m: any) => m.product_id === productId);
  };

  return {
    mappings,
    isLoading,
    assignSector,
    removeSector,
    getSectorsForProduct,
  };
}
