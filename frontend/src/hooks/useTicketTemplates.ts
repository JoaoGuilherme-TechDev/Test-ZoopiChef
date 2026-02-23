import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export type TicketTemplateType = 'main' | 'production';

export interface TemplateSection {
  type: string;
  [key: string]: any;
}

export interface TemplateConfig {
  sections: TemplateSection[];
  styles: Record<string, any>;
}

export interface TicketTemplate {
  id: string;
  company_id: string;
  template_type: TicketTemplateType;
  name: string;
  description: string | null;
  paper_width: 58 | 80;
  template_config: TemplateConfig;
  elements: any[];
  is_default: boolean;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para gerenciar templates de tickets (gerencial e produção)
 */
export function useTicketTemplates(type?: TicketTemplateType) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['ticket-templates', company?.id, type],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = (supabase as any)
        .from('ticket_templates')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('is_system', { ascending: false })
        .order('name');

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        ...row,
        template_config: row.template_config || { sections: [], styles: {} },
        elements: row.elements || [],
      })) as TicketTemplate[];
    },
    enabled: !!company?.id,
  });

  // Buscar template padrão para um tipo
  const getDefaultTemplate = (templateType: TicketTemplateType): TicketTemplate | undefined => {
    return templates?.find(t => t.template_type === templateType && t.is_default);
  };

  // Criar novo template
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<TicketTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await (supabase as any)
        .from('ticket_templates')
        .insert([{
          company_id: company.id,
          template_type: template.template_type,
          name: template.name,
          description: template.description,
          paper_width: template.paper_width,
          template_config: JSON.parse(JSON.stringify(template.template_config)),
          elements: JSON.parse(JSON.stringify(template.elements || [])),
          is_default: false,
          is_system: false,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar template');
    },
  });

  // Atualizar template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketTemplate> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const updatePayload: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updatePayload.name = updates.name;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.paper_width !== undefined) updatePayload.paper_width = updates.paper_width;
      if (updates.template_config !== undefined) {
        updatePayload.template_config = JSON.parse(JSON.stringify(updates.template_config));
      }
      if (updates.elements !== undefined) {
        updatePayload.elements = JSON.parse(JSON.stringify(updates.elements));
      }
      if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;

      const { data, error } = await (supabase as any)
        .from('ticket_templates')
        .update(updatePayload)
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template atualizado!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar template');
    },
  });

  // Definir como padrão
  const setAsDefault = useMutation({
    mutationFn: async ({ id, templateType }: { id: string; templateType: TicketTemplateType }) => {
      if (!company?.id) throw new Error('No company');

      // Remover padrão atual
      await (supabase as any)
        .from('ticket_templates')
        .update({ is_default: false })
        .eq('company_id', company.id)
        .eq('template_type', templateType);

      // Definir novo padrão
      const { data, error } = await (supabase as any)
        .from('ticket_templates')
        .update({ is_default: true })
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template definido como padrão!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao definir padrão');
    },
  });

  // Duplicar template
  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!company?.id) throw new Error('No company');

      const template = templates?.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      const { data, error } = await (supabase as any)
        .from('ticket_templates')
        .insert([{
          company_id: company.id,
          template_type: template.template_type,
          name: `${template.name} (Cópia)`,
          description: template.description,
          paper_width: template.paper_width,
          template_config: JSON.parse(JSON.stringify(template.template_config)),
          elements: JSON.parse(JSON.stringify(template.elements)),
          is_default: false,
          is_system: false,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template duplicado!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao duplicar template');
    },
  });

  // Excluir template (apenas não-sistema)
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      if (!company?.id) throw new Error('No company');

      const template = templates?.find(t => t.id === templateId);
      if (template?.is_system) {
        throw new Error('Não é possível excluir templates do sistema');
      }

      const { error } = await (supabase as any)
        .from('ticket_templates')
        .delete()
        .eq('id', templateId)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-templates'] });
      toast.success('Template excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir template');
    },
  });

  // Filtrar por tipo
  const mainTemplates = templates?.filter(t => t.template_type === 'main') || [];
  const productionTemplates = templates?.filter(t => t.template_type === 'production') || [];

  return {
    templates: templates || [],
    mainTemplates,
    productionTemplates,
    isLoading,
    getDefaultTemplate,
    createTemplate,
    updateTemplate,
    setAsDefault,
    duplicateTemplate,
    deleteTemplate,
  };
}
