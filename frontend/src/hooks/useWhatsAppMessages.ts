import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface WhatsAppInbound {
  id: string;
  company_id: string;
  customer_id: string | null;
  from_phone: string;
  message_text: string | null;
  raw_payload: any;
  created_at: string;
}

export interface WhatsAppOutbound {
  id: string;
  company_id: string;
  customer_id: string | null;
  to_phone: string;
  message_text: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export function useWhatsAppInbound() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['whatsapp_inbound', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('whatsapp_inbound_messages')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WhatsAppInbound[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useWhatsAppOutbound() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['whatsapp_outbound', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('whatsapp_outbound_messages')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WhatsAppOutbound[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useSendWhatsApp() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      message,
      customerId,
    }: {
      phone: string;
      message: string;
      customerId?: string;
    }) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      // Primeiro registra a mensagem como pendente
      const { data: outbound, error: insertError } = await supabase
        .from('whatsapp_outbound_messages')
        .insert({
          company_id: profile.company_id,
          customer_id: customerId || null,
          to_phone: phone,
          message_text: message,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Chama a edge function para enviar
      const { data, error } = await supabase.functions.invoke('send-whatsapp-direct', {
        body: {
          company_id: profile.company_id,
          outbound_id: outbound.id,
          phone,
          message,
        },
      });

      if (error) {
        // Atualiza status para failed
        await supabase
          .from('whatsapp_outbound_messages')
          .update({ status: 'failed', error_message: error.message })
          .eq('id', outbound.id);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_outbound'] });
      toast.success('Mensagem enviada!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar: ' + error.message);
    },
  });
}

export function useWhatsAppConversations() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['whatsapp_conversations', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Buscar últimas mensagens por telefone (inbound + outbound)
      const { data: inbound } = await supabase
        .from('whatsapp_inbound_messages')
        .select('*, customers(name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: outbound } = await supabase
        .from('whatsapp_outbound_messages')
        .select('*, customers(name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Combinar e agrupar por telefone
      const conversations = new Map<string, {
        phone: string;
        customerName: string | null;
        customerId: string | null;
        lastMessage: string;
        lastMessageAt: string;
        isInbound: boolean;
        unreadCount: number;
      }>();

      // Processar inbound
      (inbound || []).forEach((msg: any) => {
        const phone = msg.from_phone;
        if (!conversations.has(phone) || new Date(msg.created_at) > new Date(conversations.get(phone)!.lastMessageAt)) {
          conversations.set(phone, {
            phone,
            customerName: msg.customers?.name || null,
            customerId: msg.customer_id,
            lastMessage: msg.message_text || '',
            lastMessageAt: msg.created_at,
            isInbound: true,
            unreadCount: conversations.has(phone) ? conversations.get(phone)!.unreadCount + 1 : 1,
          });
        }
      });

      // Processar outbound
      (outbound || []).forEach((msg: any) => {
        const phone = msg.to_phone;
        if (!conversations.has(phone) || new Date(msg.created_at) > new Date(conversations.get(phone)!.lastMessageAt)) {
          conversations.set(phone, {
            phone,
            customerName: msg.customers?.name || null,
            customerId: msg.customer_id,
            lastMessage: msg.message_text,
            lastMessageAt: msg.created_at,
            isInbound: false,
            unreadCount: 0,
          });
        }
      });

      return Array.from(conversations.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    },
    enabled: !!profile?.company_id,
  });
}

export function useConversationMessages(phone: string | null) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['conversation_messages', profile?.company_id, phone],
    queryFn: async () => {
      if (!profile?.company_id || !phone) return [];

      const [{ data: inbound }, { data: outbound }] = await Promise.all([
        supabase
          .from('whatsapp_inbound_messages')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('from_phone', phone)
          .order('created_at', { ascending: true }),
        supabase
          .from('whatsapp_outbound_messages')
          .select('*')
          .eq('company_id', profile.company_id)
          .eq('to_phone', phone)
          .order('created_at', { ascending: true }),
      ]);

      const messages = [
        ...(inbound || []).map((m: any) => ({ ...m, type: 'inbound' as const })),
        ...(outbound || []).map((m: any) => ({ ...m, type: 'outbound' as const, message_text: m.message_text })),
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      return messages;
    },
    enabled: !!profile?.company_id && !!phone,
  });
}
