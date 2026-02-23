import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface PrintLayoutElement {
  enabled: boolean;
  order: number;
  font_size: 'small' | 'normal' | 'large' | 'xlarge';
  bold: boolean;
  inverted: boolean;
  // Header specific
  show_logo?: boolean;
  show_company_name?: boolean;
  show_datetime?: boolean;
  show_order_number?: boolean;
  // Customer specific
  show_name?: boolean;
  show_phone?: boolean;
  show_address?: boolean;
  // Items specific
  show_quantity?: boolean;
  show_price?: boolean;
  show_notes?: boolean;
  show_addons?: boolean;
  // Footer specific
  show_subtotal?: boolean;
  show_discount?: boolean;
  show_delivery_fee?: boolean;
  show_total?: boolean;
  show_payment_method?: boolean;
  show_change?: boolean;
}

export interface PrintLayoutElements {
  header: PrintLayoutElement;
  customer: PrintLayoutElement;
  items: PrintLayoutElement;
  footer: PrintLayoutElement;
}

export interface PrintLayoutConfig {
  id: string;
  company_id: string;
  elements_config: PrintLayoutElements;
  paper_width_mm: number;
  line_separator_char: string;
  show_qr_code: boolean;
  footer_message: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_LAYOUT: PrintLayoutElements = {
  header: {
    enabled: true,
    order: 1,
    font_size: 'normal',
    bold: true,
    inverted: false,
    show_logo: true,
    show_company_name: true,
    show_datetime: true,
    show_order_number: true,
  },
  customer: {
    enabled: true,
    order: 2,
    font_size: 'normal',
    bold: false,
    inverted: false,
    show_name: true,
    show_phone: true,
    show_address: true,
  },
  items: {
    enabled: true,
    order: 3,
    font_size: 'normal',
    bold: false,
    inverted: false,
    show_quantity: true,
    show_price: true,
    show_notes: true,
    show_addons: true,
  },
  footer: {
    enabled: true,
    order: 4,
    font_size: 'normal',
    bold: false,
    inverted: false,
    show_subtotal: true,
    show_discount: true,
    show_delivery_fee: true,
    show_total: true,
    show_payment_method: true,
    show_change: true,
  },
};

export function usePrintLayoutConfig() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['print-layout-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('print_layout_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return config with parsed elements, or default
      if (data) {
        return {
          ...data,
          elements_config: (data.elements_config as unknown as PrintLayoutElements) || DEFAULT_LAYOUT,
        } as PrintLayoutConfig;
      }
      
      return null;
    },
    enabled: !!company?.id,
  });

  const saveConfig = useMutation({
    mutationFn: async (updates: Partial<Omit<PrintLayoutConfig, 'id' | 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('No company');

      // Check if config exists
      const { data: existing } = await supabase
        .from('print_layout_config')
        .select('id')
        .eq('company_id', company.id)
        .maybeSingle();

      // Convert elements_config to JSON-compatible format
      const elementsJson = updates.elements_config 
        ? JSON.parse(JSON.stringify(updates.elements_config))
        : undefined;

      if (existing) {
        // Update - build update object carefully
        const updatePayload: Record<string, unknown> = {};
        if (elementsJson !== undefined) updatePayload.elements_config = elementsJson;
        if (updates.paper_width_mm !== undefined) updatePayload.paper_width_mm = updates.paper_width_mm;
        if (updates.line_separator_char !== undefined) updatePayload.line_separator_char = updates.line_separator_char;
        if (updates.show_qr_code !== undefined) updatePayload.show_qr_code = updates.show_qr_code;
        if (updates.footer_message !== undefined) updatePayload.footer_message = updates.footer_message;

        const { data, error } = await supabase
          .from('print_layout_config')
          .update(updatePayload)
          .eq('company_id', company.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('print_layout_config')
          .insert([{
            company_id: company.id,
            elements_config: elementsJson || JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
            paper_width_mm: updates.paper_width_mm ?? 80,
            line_separator_char: updates.line_separator_char ?? '-',
            show_qr_code: updates.show_qr_code ?? false,
            footer_message: updates.footer_message ?? null,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-layout-config'] });
      toast.success('Layout de impressão salvo!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar layout');
    },
  });

  // Get the current layout elements (from config or default)
  const elements = config?.elements_config || DEFAULT_LAYOUT;

  // Helper to update a single element
  const updateElement = (
    key: keyof PrintLayoutElements,
    updates: Partial<PrintLayoutElement>
  ) => {
    const newElements = {
      ...elements,
      [key]: { ...elements[key], ...updates },
    };
    return saveConfig.mutateAsync({ elements_config: newElements });
  };

  // Helper to reorder elements
  const reorderElements = (orderedKeys: (keyof PrintLayoutElements)[]) => {
    const newElements = { ...elements };
    orderedKeys.forEach((key, index) => {
      newElements[key] = { ...newElements[key], order: index + 1 };
    });
    return saveConfig.mutateAsync({ elements_config: newElements });
  };

  return {
    config,
    elements,
    isLoading,
    saveConfig,
    updateElement,
    reorderElements,
    DEFAULT_LAYOUT,
  };
}
