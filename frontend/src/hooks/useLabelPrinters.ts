import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import type { LabelPrinter, LabelTemplate } from '@/lib/print/labels';

export function useLabelPrinters() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const printersQuery = useQuery({
    queryKey: ['label-printers', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('label_printers')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      return data as LabelPrinter[];
    },
    enabled: !!company?.id,
  });

  const templatesQuery = useQuery({
    queryKey: ['label-templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      
      if (error) throw error;
      return data as LabelTemplate[];
    },
    enabled: !!company?.id,
  });

  const createPrinter = useMutation({
    mutationFn: async (printer: Partial<LabelPrinter>) => {
      if (!company?.id) throw new Error('No company');
      
      const insertData = { ...printer, company_id: company.id };
      
      const { data, error } = await supabase
        .from('label_printers')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as LabelPrinter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-printers'] });
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
    },
  });

  const updatePrinter = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LabelPrinter> & { id: string }) => {
      const { data, error } = await supabase
        .from('label_printers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as LabelPrinter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-printers'] });
    },
  });

  const deletePrinter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('label_printers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-printers'] });
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<LabelTemplate>) => {
      if (!company?.id) throw new Error('No company');
      
      const insertData = { ...template, company_id: company.id };
      
      const { data, error } = await supabase
        .from('label_templates')
        .insert(insertData as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as LabelTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LabelTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('label_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as LabelTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('label_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-templates'] });
    },
  });

  // Get default printer and template
  const defaultPrinter = printersQuery.data?.find(p => p.is_default && p.is_active);
  const activePrinters = printersQuery.data?.filter(p => p.is_active) || [];

  return {
    printers: printersQuery.data || [],
    templates: templatesQuery.data || [],
    defaultPrinter,
    activePrinters,
    isLoading: printersQuery.isLoading || templatesQuery.isLoading,
    createPrinter,
    updatePrinter,
    deletePrinter,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
