import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { printInternalMessage } from '@/lib/print/internalMessage';
import { toast } from 'sonner';

/**
 * Listener de impressão para mensagens internas.
 *
 * Importante: impressão via navegador (window.print) pode ser bloqueada sem interação do usuário.
 * Por isso, quando existir "Impressora padrão" configurada, tentamos impressão via serviço local (rede).
 * 
 * Usa Realtime como primário e polling como fallback silencioso.
 */
export function InternalMessagePrintListener() {
  const { data: company } = useCompany();
  const printedMessagesRef = useRef<Set<string>>(new Set());
  const lastCheckedRef = useRef<string>(new Date().toISOString());
  const warnedMissingPrinterRef = useRef(false);
  const isRealtimeConnectedRef = useRef(false);

  const shouldPrint = useCallback((targetType: string) => {
    return targetType === 'printer' || targetType === 'all';
  }, []);

  const tryPrint = useCallback(async (message: {
    id: string;
    target_type: string;
    sender_name: string;
    message: string;
    created_at: string;
    target_sector_id: string | null;
  }, companyData: { name: string; default_printer: string | null }) => {
    if (!shouldPrint(message.target_type)) return;

    if (printedMessagesRef.current.has(message.id)) return;
    printedMessagesRef.current.add(message.id);

    if (!companyData.default_printer && !warnedMissingPrinterRef.current) {
      warnedMissingPrinterRef.current = true;
      toast.error('Impressora padrão não configurada (Empresa → Impressora padrão)');
    }

    try {
      const result = await printInternalMessage(message, companyData.name, companyData.default_printer);

      if (result.success) {
        toast.success('Mensagem enviada para impressão');
      } else {
        toast.error(result.error || 'Erro ao imprimir');
      }
    } catch (error) {
      console.error('[InternalMessagePrint] Print error:', error);
    }
  }, [shouldPrint]);

  useEffect(() => {
    if (!company?.id) return;

    const companyData = { name: company.name, default_printer: company.default_printer };

    const poll = async () => {
      // Skip polling if realtime is working
      if (isRealtimeConnectedRef.current) return;
      
      try {
        const since = lastCheckedRef.current;
        lastCheckedRef.current = new Date().toISOString();

        const { data, error } = await supabase
          .from('internal_messages')
          .select('id,target_type,sender_name,message,created_at,target_sector_id')
          .eq('company_id', company.id)
          .in('target_type', ['printer', 'all'])
          .gt('created_at', since)
          .order('created_at', { ascending: true })
          .limit(20);

        if (error) {
          // Silently handle network errors
          return;
        }

        (data || []).forEach((m) => {
          void tryPrint(m as any, companyData);
        });
      } catch {
        // Silently handle exceptions - polling will retry
      }
    };

    // Realtime as primary method
    const channel = supabase
      .channel('internal-messages-print')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          const message = payload.new as any;
          void tryPrint(message, companyData);
        }
      )
      .subscribe((status) => {
        isRealtimeConnectedRef.current = status === 'SUBSCRIBED';
      });

    // Polling as fallback (every 30s instead of 4s)
    const interval = window.setInterval(poll, 30000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [company?.id, company?.name, company?.default_printer, tryPrint]);

  return null;
}

