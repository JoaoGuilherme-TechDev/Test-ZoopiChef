/**
 * Hook para gerenciar configurações globais de branding do Kiosk
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export type MenuHierarchy = 'category_subcategory_products' | 'subcategory_products' | 'products_only';

export interface KioskBrandingSettings {
  company_id: string;
  enabled: boolean;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  accent_color: string;
  text_color: string;
  button_radius: 'rounded' | 'pill' | 'square';
  font_family: string;
  menu_hierarchy: MenuHierarchy;
  created_at: string;
  updated_at: string;
}

// Paletas de cores predefinidas para Kiosk
export const KIOSK_COLOR_PALETTES = [
  {
    name: 'Clássico Escuro',
    colors: {
      primary_color: '#000000',
      secondary_color: '#ffffff',
      background_color: '#1a1a1a',
      accent_color: '#ff6b00',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Restaurante Elegante',
    colors: {
      primary_color: '#8b0000',
      secondary_color: '#ffd700',
      background_color: '#1c1c1c',
      accent_color: '#ffd700',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Fast Food Vibrante',
    colors: {
      primary_color: '#ff0000',
      secondary_color: '#ffcc00',
      background_color: '#2d2d2d',
      accent_color: '#ffcc00',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Natural & Orgânico',
    colors: {
      primary_color: '#2e7d32',
      secondary_color: '#a5d6a7',
      background_color: '#1b2e1b',
      accent_color: '#81c784',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Café Aconchegante',
    colors: {
      primary_color: '#6d4c41',
      secondary_color: '#d7ccc8',
      background_color: '#3e2723',
      accent_color: '#bcaaa4',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Sushi Moderno',
    colors: {
      primary_color: '#1a237e',
      secondary_color: '#e8eaf6',
      background_color: '#0d1321',
      accent_color: '#ff5252',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Pizzaria Italiana',
    colors: {
      primary_color: '#c62828',
      secondary_color: '#ffccbc',
      background_color: '#1c1107',
      accent_color: '#ff8a65',
      text_color: '#ffffff',
    },
  },
  {
    name: 'Clean Claro',
    colors: {
      primary_color: '#212121',
      secondary_color: '#757575',
      background_color: '#fafafa',
      accent_color: '#ff5722',
      text_color: '#212121',
    },
  },
];

const DEFAULT_KIOSK_SETTINGS: Partial<KioskBrandingSettings> = {
  enabled: false,
  primary_color: '#000000',
  secondary_color: '#ffffff',
  background_color: '#1a1a1a',
  accent_color: '#ff6b00',
  text_color: '#ffffff',
  button_radius: 'rounded',
  font_family: 'Inter',
  menu_hierarchy: 'category_subcategory_products',
};

export function useKioskSettings() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['kiosk_branding_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      // Use 'as any' para nova tabela ainda não nos types gerados
      const { data, error } = await (supabase as any)
        .from('kiosk_branding_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) {
        // Se a tabela não existir, retorna defaults
        console.warn('Kiosk branding settings not found, using defaults');
        return DEFAULT_KIOSK_SETTINGS as KioskBrandingSettings;
      }
      
      return data as KioskBrandingSettings | null;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertKioskSettings() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: Partial<KioskBrandingSettings>) => {
      if (!company?.id) throw new Error('Company not found');

      // Use 'as any' para nova tabela ainda não nos types gerados
      const { data: result, error } = await (supabase as any)
        .from('kiosk_branding_settings')
        .upsert({ company_id: company.id, ...data }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk_branding_settings'] });
    },
  });
}

// Hook para buscar settings por company_id (acesso público)
export function usePublicKioskSettings(companyId: string | null) {
  return useQuery({
    queryKey: ['kiosk_branding_settings_public', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      // Use 'as any' para nova tabela ainda não nos types gerados
      const { data, error } = await (supabase as any)
        .from('kiosk_branding_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_KIOSK_SETTINGS as KioskBrandingSettings;
      }
      
      return data as KioskBrandingSettings;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}
