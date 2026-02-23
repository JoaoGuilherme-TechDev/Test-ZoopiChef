import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';

export interface WhatsAppMessage {
  id: string;
  company_id: string;
  customer_phone: string;
  customer_name: string;
  message: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  message_type: 'text' | 'image' | 'document' | 'audio';
  media_url?: string;
  external_id?: string;
  error_message?: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
}

export interface WhatsAppTemplate {
  id: string;
  company_id: string;
  name: string;
  content: string;
  variables: string[];
  category: 'order_status' | 'marketing' | 'notification' | 'custom';
  is_active: boolean;
  created_at: string;
}

export interface SendMessageParams {
  phone: string;
  message: string;
  customerName?: string;
  messageType?: 'text' | 'image' | 'document';
  mediaUrl?: string;
}

export function useWhatsAppIntegration() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch campaign settings for WhatsApp config
  const configQuery = useQuery({
    queryKey: ['whatsapp-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await supabase
        .from('campaign_settings')
        .select('*')
        .eq('company_id', company.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch message history from campaign_messages (reuse existing table)
  const messagesQuery = useQuery({
    queryKey: ['whatsapp-messages', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('campaign_messages')
        .select('*')
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Send WhatsApp message
  const sendMessage = useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const config = configQuery.data;
      if (!config?.whatsapp_instance_id || !config?.whatsapp_api_key) {
        throw new Error('WhatsApp não configurado. Acesse Configurações > Integrações.');
      }

      // Call edge function to send message
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          companyId: company.id,
          phone: params.phone,
          message: params.message,
          customerName: params.customerName,
          messageType: params.messageType || 'text',
          mediaUrl: params.mediaUrl,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      toast.success('Mensagem enviada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  // Send template message - simplified
  const sendTemplateMessage = useMutation({
    mutationFn: async ({ 
      phone, 
      message 
    }: { 
      phone: string; 
      message: string;
    }) => {
      return sendMessage.mutateAsync({ phone, message });
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar mensagem: ' + error.message);
    },
  });

  // Check connection status
  const checkConnection = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('whatsapp-status', {
        body: { companyId: company.id },
      });

      if (error) throw error;
      return data;
    },
  });

  const isConfigured = !!(configQuery.data?.whatsapp_instance_id && configQuery.data?.whatsapp_api_key);

  return {
    config: configQuery.data,
    messages: messagesQuery.data || [],
    isLoading: configQuery.isLoading || messagesQuery.isLoading,
    isConfigured,
    sendMessage,
    sendTemplateMessage,
    checkConnection,
  };
}
