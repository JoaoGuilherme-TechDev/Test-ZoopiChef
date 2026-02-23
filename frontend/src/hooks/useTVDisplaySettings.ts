import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';

export type SoundType = 'chime' | 'bell' | 'ding' | 'notification' | 'custom';

export interface TVDisplaySettings {
  company_id: string;
  enabled: boolean;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  accent_color: string;
  text_color: string;
  font_family: string;
  show_logo: boolean;
  show_clock: boolean;
  show_weather: boolean;
  transition_style: 'fade' | 'slide' | 'zoom';
  transition_duration_ms: number;
  slide_duration_seconds: number;
  ticker_message: string | null;
  sound_enabled: boolean;
  sound_type: SoundType;
  sound_volume: number;
  custom_sound_url: string | null;
  // Order ready overlay customization
  order_ready_duration_seconds: number; // 0 = infinite until dismissed
  sound_loop: boolean; // Whether to loop sound until overlay closes
  created_at: string;
  updated_at: string;
}

// Duration options for order ready overlay
export const ORDER_READY_DURATION_OPTIONS = [
  { value: 5, label: '5 segundos' },
  { value: 10, label: '10 segundos' },
  { value: 15, label: '15 segundos' },
  { value: 30, label: '30 segundos' },
  { value: 0, label: 'Infinito (até fechar)' },
] as const;

const DEFAULT_TV_SETTINGS: Partial<TVDisplaySettings> = {
  enabled: false,
  primary_color: '#000000',
  secondary_color: '#ffffff',
  background_color: '#1a1a1a',
  accent_color: '#ff6b00',
  text_color: '#ffffff',
  font_family: 'Inter',
  show_logo: true,
  show_clock: true,
  show_weather: false,
  transition_style: 'fade',
  transition_duration_ms: 500,
  slide_duration_seconds: 10,
  sound_enabled: true,
  sound_type: 'chime',
  sound_volume: 0.7,
  custom_sound_url: null,
  order_ready_duration_seconds: 5,
  sound_loop: false,
};

// Predefined sound options
export const TV_SOUND_PRESETS = [
  { id: 'chime', name: 'Chime (Padrão)', description: 'Som suave e agradável' },
  { id: 'bell', name: 'Sino', description: 'Som clássico de sino' },
  { id: 'ding', name: 'Ding', description: 'Som curto e discreto' },
  { id: 'notification', name: 'Notificação', description: 'Som moderno de alerta' },
  { id: 'custom', name: 'Personalizado', description: 'Use seu próprio arquivo de áudio' },
] as const;

export function useTVDisplaySettings() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['tv_display_settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('tv_display_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as TVDisplaySettings | null;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertTVDisplaySettings() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (data: Partial<TVDisplaySettings>) => {
      if (!company?.id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('tv_display_settings')
        .upsert({ company_id: company.id, ...data }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv_display_settings'] });
    },
  });
}

// Paletas de cores predefinidas
export const TV_COLOR_PALETTES = [
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
    name: 'Clean Branco',
    colors: {
      primary_color: '#212121',
      secondary_color: '#757575',
      background_color: '#fafafa',
      accent_color: '#ff5722',
      text_color: '#212121',
    },
  },
];
