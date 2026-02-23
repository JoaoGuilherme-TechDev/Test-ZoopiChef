import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { ReceiptTemplate, ReceiptElement } from '@/components/receipt-editor/types';

export function useReceiptTemplates() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['receipt-templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('receipt_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        ...row,
        elements: (row.elements as ReceiptElement[]) || [],
      })) as ReceiptTemplate[];
    },
    enabled: !!company?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<ReceiptTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company');

      // If this is default, unset other defaults
      if (template.is_default) {
        await (supabase as any)
          .from('receipt_templates')
          .update({ is_default: false })
          .eq('company_id', company.id);
      }

      const { data, error } = await (supabase as any)
        .from('receipt_templates')
        .insert([{
          company_id: company.id,
          name: template.name,
          paper_width: template.paper_width,
          elements: JSON.parse(JSON.stringify(template.elements)),
          is_default: template.is_default,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReceiptTemplate> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      // If setting as default, unset other defaults
      if (updates.is_default) {
        await (supabase as any)
          .from('receipt_templates')
          .update({ is_default: false })
          .eq('company_id', company.id)
          .neq('id', id);
      }

      const updatePayload: Record<string, unknown> = {};
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.paper_width !== undefined) updatePayload.paper_width = updates.paper_width;
      if (updates.elements !== undefined) updatePayload.elements = JSON.parse(JSON.stringify(updates.elements));
      if (updates.is_default !== undefined) updatePayload.is_default = updates.is_default;

      const { data, error } = await (supabase as any)
        .from('receipt_templates')
        .update(updatePayload)
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await (supabase as any)
        .from('receipt_templates')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-templates'] });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!company?.id) throw new Error('No company');

      const template = templates?.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await (supabase as any)
        .from('receipt_templates')
        .insert([{
          company_id: company.id,
          name: `${template.name} (Cópia)`,
          paper_width: template.paper_width,
          elements: JSON.parse(JSON.stringify(template.elements)),
          is_default: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-templates'] });
    },
  });

  return {
    templates: templates || [],
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
}
