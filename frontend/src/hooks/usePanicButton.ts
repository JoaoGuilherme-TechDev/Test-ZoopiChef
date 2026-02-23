import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

interface PanicSettings {
  panic_enabled: boolean;
  panic_phones: string[];
  panic_whatsapp_message: string;
  panic_kds_message: string;
}

export function usePanicButton() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['panic-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('company_integrations')
        .select('panic_enabled, panic_phones, panic_whatsapp_message, panic_kds_message')
        .eq('company_id', company.id)
        .maybeSingle();
      
      if (error) throw error;
      
      return data as PanicSettings | null;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<PanicSettings>) => {
      if (!company?.id) throw new Error('Company not found');
      
      const { error } = await supabase
        .from('company_integrations')
        .upsert({
          company_id: company.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panic-settings', company?.id] });
    },
  });

  const triggerPanic = async (): Promise<{ success: boolean; errors: string[] }> => {
    if (!company?.id || !settings?.panic_enabled) {
      return { success: false, errors: ['Botão de pânico não configurado'] };
    }

    setIsTriggering(true);
    const errors: string[] = [];

    try {
      // 1. Send internal message to KDS
      const { error: kdsError } = await supabase
        .from('internal_messages')
        .insert({
          company_id: company.id,
          sender_name: 'Sistema',
          message: settings.panic_kds_message || 'Erro de comunicação',
          target_type: 'kds',
          is_read: false,
        });

      if (kdsError) {
        console.error('Error sending KDS message:', kdsError);
        errors.push('Falha ao enviar mensagem para KDS');
      }

      // 2. Send WhatsApp messages to all registered phones
      const phones = settings.panic_phones || [];
      
      if (phones.length > 0) {
        // Try to send via edge function
        const promises = phones.map(async (phone) => {
          try {
            const { error } = await supabase.functions.invoke('send-whatsapp-direct', {
              body: {
                company_id: company.id,
                phone: phone.replace(/\D/g, ''),
                message: settings.panic_whatsapp_message || 'Socorro! Estamos com problemas sérios.',
              },
            });
            
            if (error) {
              console.error(`Error sending WhatsApp to ${phone}:`, error);
              return { phone, success: false };
            }
            return { phone, success: true };
          } catch (err) {
            console.error(`Error sending WhatsApp to ${phone}:`, err);
            return { phone, success: false };
          }
        });

        const results = await Promise.all(promises);
        const failed = results.filter(r => !r.success);
        
        if (failed.length > 0) {
          errors.push(`Falha ao enviar para ${failed.length} telefone(s)`);
        }
      }

      return { 
        success: errors.length === 0, 
        errors 
      };
    } catch (err) {
      console.error('Panic trigger error:', err);
      return { success: false, errors: ['Erro ao acionar pânico'] };
    } finally {
      setIsTriggering(false);
    }
  };

  return {
    settings,
    isLoading,
    isTriggering,
    updateSettings,
    triggerPanic,
    isEnabled: settings?.panic_enabled ?? false,
  };
}
