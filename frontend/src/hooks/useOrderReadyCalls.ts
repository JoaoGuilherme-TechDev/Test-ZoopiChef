import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface OrderReadyCall {
  id: string;
  company_id: string;
  order_id: string;
  order_number: number;
  customer_name: string | null;
  triggered_at: string;
  displayed_at: string | null;
}

// Hook para disparar chamada de pedido pronto (usado no KDS)
export function useOrderReadyCallTrigger() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const triggerOrderReady = useMutation({
    mutationFn: async ({
      orderId,
      orderNumber,
      customerName,
    }: {
      orderId: string;
      orderNumber: number;
      customerName?: string | null;
    }) => {
      if (!company?.id) throw new Error('No company');

      // Verificar se a feature está habilitada
      const { data: companyData } = await supabase
        .from('companies')
        .select('enable_order_ready_call')
        .eq('id', company.id)
        .single();

      if (!companyData?.enable_order_ready_call) {
        console.log('Order ready call disabled for this company');
        return null;
      }

      // Inserir evento de chamada
      const { data, error } = await (supabase as any)
        .from('order_ready_calls')
        .insert({
          company_id: company.id,
          order_id: orderId,
          order_number: orderNumber,
          customer_name: customerName || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-ready-calls'] });
    },
  });

  return { triggerOrderReady };
}

// Hook para escutar chamadas na TV (via realtime)
export function useOrderReadyCallsListener(companyId: string | undefined) {
  const [callQueue, setCallQueue] = useState<OrderReadyCall[]>([]);
  const [currentCall, setCurrentCall] = useState<OrderReadyCall | null>(null);
  const [recentCalls, setRecentCalls] = useState<OrderReadyCall[]>([]);
  const isProcessingRef = useRef(false);
  const connectionTimeRef = useRef<Date>(new Date());

  // Processar fila de chamadas
  const processQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    
    setCallQueue((queue) => {
      if (queue.length === 0) {
        setCurrentCall(null);
        return queue;
      }

      isProcessingRef.current = true;
      const [nextCall, ...rest] = queue;
      setCurrentCall(nextCall);

      // Adicionar aos recentes (máximo 3)
      setRecentCalls((recent) => {
        const updated = [nextCall, ...recent.filter(r => r.id !== nextCall.id)];
        return updated.slice(0, 3);
      });

      // Remover após 5 segundos
      setTimeout(() => {
        setCurrentCall(null);
        isProcessingRef.current = false;
        // Processar próximo após pequeno delay
        setTimeout(() => processQueue(), 300);
      }, 5000);

      return rest;
    });
  }, []);

  // Adicionar nova chamada à fila
  const addToQueue = useCallback((call: OrderReadyCall) => {
    // Ignorar chamadas antigas (antes da conexão)
    const callTime = new Date(call.triggered_at);
    if (callTime < connectionTimeRef.current) {
      console.log('Ignoring old order ready call:', call.order_number);
      return;
    }

    setCallQueue((queue) => {
      // Evitar duplicatas
      if (queue.some(q => q.id === call.id)) return queue;
      return [...queue, call];
    });
  }, []);

  // Processar fila quando mudar
  useEffect(() => {
    if (callQueue.length > 0 && !isProcessingRef.current && !currentCall) {
      processQueue();
    }
  }, [callQueue, currentCall, processQueue]);

  // Escutar eventos realtime
  useEffect(() => {
    if (!companyId) return;

    // Marcar tempo de conexão
    connectionTimeRef.current = new Date();

    // Buscar últimas 3 chamadas do dia para histórico inicial
    const fetchRecentCalls = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await (supabase as any)
        .from('order_ready_calls')
        .select('*')
        .eq('company_id', companyId)
        .gte('triggered_at', today.toISOString())
        .order('triggered_at', { ascending: false })
        .limit(3);

      if (data) {
        setRecentCalls(data);
      }
    };

    fetchRecentCalls();

    // Subscription realtime
    const channel = supabase
      .channel(`order-ready-calls-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_ready_calls',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const newCall = payload.new as OrderReadyCall;
          addToQueue(newCall);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, addToQueue]);

  return {
    currentCall,
    recentCalls,
    queueLength: callQueue.length,
  };
}
