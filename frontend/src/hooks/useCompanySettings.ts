import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface CompanyIntegrations {
  company_id: string;
  whatsapp_provider: 'zapi' | 'twilio' | 'evolution' | null;
  whatsapp_api_key_masked: string | null;
  whatsapp_instance_id: string | null;
  whatsapp_default_number: string | null;
  whatsapp_enabled: boolean;
  pix_provider: 'mercadopago' | 'asaas' | 'manual' | null;
  pix_enabled: boolean;
  pix_key: string | null;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random' | null;
  // Stripe / Payment Gateway
  stripe_enabled: boolean;
  stripe_secret_key_masked: string | null;
  stripe_publishable_key: string | null;
  stripe_webhook_secret_masked: string | null;
  stripe_account_id: string | null;
  stripe_mode: 'test' | 'live';
  payment_gateway: 'stripe' | 'mercadopago' | 'asaas' | 'manual';
  // Review settings
  review_enabled: boolean;
  review_auto_send: boolean;
  review_delay_minutes: number;
  review_default_public: boolean;
  review_require_comment: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyAISettings {
  company_id: string;
  chat_provider: string;
  chat_enabled: boolean;
  tts_provider: 'openai' | 'elevenlabs';
  tts_enabled: boolean;
  daily_analysis_limit: number;
  daily_chat_limit: number;
  analysis_count_today: number;
  chat_count_today: number;
  last_reset_date: string;
  // External AI provider keys for self-hosted scenarios
  openai_api_key: string | null;
  gemini_api_key: string | null;
  anthropic_api_key: string | null;
  groq_api_key: string | null;
  preferred_model: string | null;
  use_custom_keys: boolean;
  created_at: string;
  updated_at: string;
}

const mapIntegrationsToFrontend = (data: any): CompanyIntegrations => ({
  company_id: data.companyId,
  whatsapp_provider: data.whatsappProvider,
  whatsapp_api_key_masked: data.whatsappApiKeyMasked,
  whatsapp_instance_id: data.whatsappInstanceId,
  whatsapp_default_number: data.whatsappDefaultNumber,
  whatsapp_enabled: data.whatsappEnabled,
  pix_provider: data.pixProvider,
  pix_enabled: data.pixEnabled,
  pix_key: data.pixKey,
  pix_key_type: data.pixKeyType,
  stripe_enabled: data.stripeEnabled,
  stripe_secret_key_masked: data.stripeSecretKeyMasked,
  stripe_publishable_key: data.stripePublishableKey,
  stripe_webhook_secret_masked: data.stripeWebhookSecretMasked,
  stripe_account_id: data.stripeAccountId,
  stripe_mode: data.stripeMode,
  payment_gateway: data.paymentGateway,
  review_enabled: data.reviewEnabled,
  review_auto_send: data.reviewAutoSend,
  review_delay_minutes: data.reviewDelayMinutes,
  review_default_public: data.reviewDefaultPublic,
  review_require_comment: data.reviewRequireComment,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapIntegrationsToBackend = (data: Partial<CompanyIntegrations>): any => ({
  whatsappProvider: data.whatsapp_provider,
  whatsappApiKeyMasked: data.whatsapp_api_key_masked,
  whatsappInstanceId: data.whatsapp_instance_id,
  whatsappDefaultNumber: data.whatsapp_default_number,
  whatsappEnabled: data.whatsapp_enabled,
  pixProvider: data.pix_provider,
  pixEnabled: data.pix_enabled,
  pixKey: data.pix_key,
  pixKeyType: data.pix_key_type,
  stripeEnabled: data.stripe_enabled,
  stripeSecretKeyMasked: data.stripe_secret_key_masked,
  stripePublishableKey: data.stripe_publishable_key,
  stripeWebhookSecretMasked: data.stripe_webhook_secret_masked,
  stripeAccountId: data.stripe_account_id,
  stripeMode: data.stripe_mode,
  paymentGateway: data.payment_gateway,
  reviewEnabled: data.review_enabled,
  reviewAutoSend: data.review_auto_send,
  reviewDelayMinutes: data.review_delay_minutes,
  reviewDefaultPublic: data.review_default_public,
  reviewRequireComment: data.review_require_comment,
});

const mapAISettingsToFrontend = (data: any): CompanyAISettings => ({
  company_id: data.companyId,
  chat_provider: data.chatProvider,
  chat_enabled: data.chatEnabled,
  tts_provider: data.ttsProvider,
  tts_enabled: data.ttsEnabled,
  daily_analysis_limit: data.dailyAnalysisLimit,
  daily_chat_limit: data.dailyChatLimit,
  analysis_count_today: data.analysisCountToday,
  chat_count_today: data.chatCountToday,
  last_reset_date: data.lastResetDate,
  openai_api_key: data.openaiApiKey,
  gemini_api_key: data.geminiApiKey,
  anthropic_api_key: data.anthropicApiKey,
  groq_api_key: data.groqApiKey,
  preferred_model: data.preferredModel,
  use_custom_keys: data.useCustomKeys,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapAISettingsToBackend = (data: Partial<CompanyAISettings>): any => ({
  chatProvider: data.chat_provider,
  chatEnabled: data.chat_enabled,
  ttsProvider: data.tts_provider,
  ttsEnabled: data.tts_enabled,
  dailyAnalysisLimit: data.daily_analysis_limit,
  dailyChatLimit: data.daily_chat_limit,
  analysisCountToday: data.analysis_count_today,
  chatCountToday: data.chat_count_today,
  lastResetDate: data.last_reset_date,
  openaiApiKey: data.openai_api_key,
  geminiApiKey: data.gemini_api_key,
  anthropicApiKey: data.anthropic_api_key,
  groqApiKey: data.groq_api_key,
  preferredModel: data.preferred_model,
  useCustomKeys: data.use_custom_keys,
});

export function useCompanyIntegrations() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-integrations', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data } = await api.get(`/companies/${company.id}/integrations`);
      if (!data) return null;
      return mapIntegrationsToFrontend(data);
    },
    enabled: !!company?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyIntegrations>) => {
      if (!company?.id) throw new Error('No company');

      const payload = mapIntegrationsToBackend(updates);
      const { data } = await api.post(`/companies/${company.id}/integrations`, payload);
      return mapIntegrationsToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-integrations'] });
      toast.success('Integrações atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar integrações: ' + (error.message || 'Erro desconhecido'));
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    isPending: upsertMutation.isPending,
  };
}

export function useCompanyAISettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-ai-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data } = await api.get(`/companies/${company.id}/ai-settings`);
      if (!data) return null;
      return mapAISettingsToFrontend(data);
    },
    enabled: !!company?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<CompanyAISettings>) => {
      if (!company?.id) throw new Error('No company');

      const payload = mapAISettingsToBackend(updates);
      const { data } = await api.post(`/companies/${company.id}/ai-settings`, payload);
      return mapAISettingsToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-ai-settings'] });
      toast.success('Configurações de IA atualizadas!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configurações de IA: ' + (error.message || 'Erro desconhecido'));
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    upsert: upsertMutation.mutateAsync,
    isPending: upsertMutation.isPending,
  };
}

export function useUploadLogo() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!company?.id) throw new Error('No company');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'logos');

      const { data } = await api.post('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const publicUrl = data.url;

      // Update company with logo URL
      await api.patch(`/companies/${company.id}`, { logoUrl: publicUrl });

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Logo atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar logo: ' + (error.message || 'Erro desconhecido'));
    },
  });
}
