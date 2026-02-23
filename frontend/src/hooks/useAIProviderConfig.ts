import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface AIProviderConfig {
  company_id: string;
  provider: string;
  api_key_encrypted: string | null;
  model_default: string;
  model_vision: string;
  model_fast: string;
  base_url: string;
  is_active: boolean;
  /** @deprecated This field is unused and will be removed in a future version */
  fallback_to_lovable?: boolean;
  fallback_provider: string | null;
  fallback_api_key_encrypted: string | null;
  fallback_base_url: string | null;
  fallback_model_default: string | null;
  created_at: string;
  updated_at: string;
}

export const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT)', description: 'GPT-4o, GPT-5', icon: '🟢' },
  { value: 'google', label: 'Google Gemini', description: 'Gemini 2.5, Gemini 3', icon: '🔵' },
  { value: 'groq', label: 'Groq', description: 'Llama 3, Mixtral', icon: '🟠' },
  { value: 'grok', label: 'Grok (xAI)', description: 'Grok-2, Grok-3', icon: '⚫' },
  { value: 'meta', label: 'Meta LLaMA', description: 'Llama 3.3, Llama 4', icon: '🔷' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 3.5', icon: '🟣' },
  { value: 'custom', label: 'Customizado', description: 'OpenAI-compatible API', icon: '⚙️' },
] as const;

export const AI_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Padrão)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Econômico)' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Padrão)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Rápido)' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Padrão)' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Rápido)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Avançado)' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Padrão)' },
    { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Rápido)' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ],
  grok: [
    { value: 'grok-3', label: 'Grok-3 (Padrão)' },
    { value: 'grok-2', label: 'Grok-2' },
    { value: 'grok-2-mini', label: 'Grok-2 Mini (Rápido)' },
  ],
  meta: [
    { value: 'llama-4-scout', label: 'Llama 4 Scout (Padrão)' },
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
    { value: 'llama-3.1-405b', label: 'Llama 3.1 405B (Avançado)' },
  ],
  custom: [
    { value: 'custom', label: 'Modelo Customizado' },
  ],
};

export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  anthropic: 'https://api.anthropic.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  grok: 'https://api.x.ai/v1',
  meta: 'https://api.together.xyz/v1',
  custom: '',
};

export function useAIProviderConfig() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ai-provider-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('ai_provider_config')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      return data as AIProviderConfig | null;
    },
    enabled: !!company?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<AIProviderConfig>) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('ai_provider_config')
        .upsert(
          { company_id: company.id, ...updates },
          { onConflict: 'company_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-config'] });
      toast.success('Configuração de IA salva com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar configuração: ' + error.message);
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase.functions.invoke('ai-healthcheck', {
        body: { company_id: company.id, test_custom_provider: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success(`Conexão com ${data.provider} testada com sucesso!`);
      } else {
        toast.error(`Falha na conexão: ${data.error || 'Erro desconhecido'}`);
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao testar conexão: ' + error.message);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    isPending: upsertMutation.isPending,
    testConnection: testConnection.mutate,
    isTestingConnection: testConnection.isPending,
  };
}

export function useAIHealthStatus() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['ai-health-status', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase.functions.invoke('ai-healthcheck', {
        body: { company_id: company.id },
      });

      if (error) throw error;
      return data as {
        ok: boolean;
        provider: string;
        model: string;
        modules: Array<{
          name: string;
          status: 'ok' | 'degraded' | 'unavailable';
          missingSecrets?: string[];
        }>;
      };
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
