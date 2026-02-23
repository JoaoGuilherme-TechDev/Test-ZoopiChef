import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { Order } from './useOrders';
import { PrintService } from '@/lib/print/PrintService';
import { toast } from 'sonner';

interface PrintQueueItem {
  id: string;
  order_id: string;
  company_id: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  attempts: number;
  error_message: string | null;
  created_at: string;
  printed_at: string | null;
}

interface AutoPrintConfig {
  enabled: boolean;
  print_on_status: string; // Status que dispara a impressão (ex: 'confirmed', 'novo')
  auto_retry: boolean;
  max_retries: number;
}

/**
 * Hook para impressão automática de pedidos
 * 
 * IMPORTANTE: Impressão 100% silenciosa no navegador é limitada por segurança.
 * Para funcionar automaticamente, o operador precisa:
 * 1. Usar Chrome/Edge em modo Kiosk com impressora padrão configurada
 * 2. Ou usar um agente de impressão local
 * 
 * Este hook implementa uma fila de impressão que processa pedidos automaticamente
 * e permite reimprimir em caso de falha.
 */
export function useAutoPrint() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const printService = PrintService.getInstance();
  const isProcessing = useRef(false);

  // Configure footer from company settings
  useEffect(() => {
    if (company) {
      printService.setFooterConfig({
        site: company.print_footer_site || 'www.zoopi.app.br',
        phone: company.print_footer_phone || '(16) 98258.6199',
      });
    }
  }, [company?.print_footer_site, company?.print_footer_phone]);

  // Configuração de auto print
  const { data: config } = useQuery({
    queryKey: ['auto-print-config', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      
      // Usa companies.auto_print_enabled como base
      const { data } = await supabase
        .from('companies')
        .select('auto_print_enabled')
        .eq('id', company.id)
        .maybeSingle();
      
      return {
        enabled: data?.auto_print_enabled || false,
        print_on_status: 'novo', // Imprime quando o pedido chega como novo
        auto_retry: true,
        max_retries: 3,
      } as AutoPrintConfig;
    },
    enabled: !!company?.id,
  });

  // Fila de impressão pendente
  const { data: printQueue = [], refetch: refetchQueue } = useQuery({
    queryKey: ['print-queue', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Buscar pedidos novos que ainda não foram impressos
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status, created_at')
        .eq('company_id', company.id)
        .eq('status', 'novo')
        .order('created_at', { ascending: true })
        .limit(50);
      
      return orders?.map(o => ({
        id: o.id,
        order_id: o.id,
        status: 'pending' as const,
        attempts: 0,
        error_message: null,
        created_at: o.created_at,
      })) || [];
    },
    enabled: !!company?.id && config?.enabled === true,
    staleTime: 1000 * 20, // 20 segundos
    refetchInterval: 1000 * 45, // OTIMIZAÇÃO: 45 segundos (era 10s)
    refetchOnWindowFocus: false,
  });

  // Imprimir um pedido específico
  const printOrder = useMutation({
    mutationFn: async (orderId: string) => {
      // Buscar dados completos do pedido
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      if (!order) throw new Error('Pedido não encontrado');
      
      // Tentar imprimir
      const result = await printService.printOrder(order as Order, company?.name);
      
      if (!result.success) {
        throw new Error(result.error || 'Falha na impressão');
      }
      
      return result;
    },
    onSuccess: (_, orderId) => {
      // toast.success removed to reduce notification spam
      queryClient.invalidateQueries({ queryKey: ['print-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro na impressão: ${error.message}`);
    },
  });

  // Processar fila automaticamente
  const processQueue = useCallback(async () => {
    if (!config?.enabled || isProcessing.current) return;
    if (printQueue.length === 0) return;
    
    isProcessing.current = true;
    
    try {
      for (const item of printQueue) {
        if (item.status === 'pending') {
          console.log('[AutoPrint] Processando pedido:', item.order_id);
          
          // Abrir janela de impressão automaticamente
          // NOTA: Em navegadores modernos, isso ainda pode requerer interação do usuário
          // Para impressão totalmente silenciosa, use modo Kiosk ou agente local
          await printOrder.mutateAsync(item.order_id);
          
          // Pequeno delay entre impressões
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('[AutoPrint] Erro no processamento:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [config?.enabled, printQueue, printOrder]);

  // Auto-processar quando há itens na fila
  useEffect(() => {
    if (config?.enabled && printQueue.length > 0) {
      processQueue();
    }
  }, [config?.enabled, printQueue.length, processQueue]);

  // Atualizar configuração
  const updateConfig = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!company?.id) throw new Error('Empresa não encontrada');
      
      const { error } = await supabase
        .from('companies')
        .update({ auto_print_enabled: enabled })
        .eq('id', company.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-print-config'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  return {
    config,
    printQueue,
    isProcessing: isProcessing.current,
    printOrder,
    refetchQueue,
    updateConfig,
  };
}

/**
 * Instruções para impressão automática silenciosa:
 * 
 * OPÇÃO 1 - Chrome em Modo Kiosk:
 * 1. Configurar impressora padrão no Windows/Mac/Linux
 * 2. Criar atalho do Chrome com flags:
 *    chrome.exe --kiosk --kiosk-printing "https://seuapp.lovable.app/orders"
 * 3. O Chrome abrirá em tela cheia e imprimirá automaticamente
 * 
 * OPÇÃO 2 - Agente de Impressão Local:
 * 1. Instalar um serviço local que escuta chamadas HTTP
 * 2. Enviar dados do pedido para localhost:XXXX
 * 3. O agente imprime diretamente na impressora USB/rede
 * 
 * OPÇÃO 3 - Electron App:
 * 1. Criar app desktop com Electron
 * 2. Usar node-printer ou similar para impressão direta
 * 3. Distribuir para os computadores da loja
 */
