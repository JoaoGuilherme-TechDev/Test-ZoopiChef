import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import { createPrintJobsForOrder } from '@/utils/createPrintJobsForOrder';

/**
 * AutoPrintListener - Componente de Impressão Automática
 * 
 * Este componente escuta novos pedidos em tempo real e dispara
 * impressão automática de duas formas:
 * 
 * 1. Se o Zoopi Print Agent estiver rodando (localhost:3848):
 *    - Cria um job na print_job_queue
 *    - O agente imprime SILENCIOSAMENTE (sem diálogo)
 * 
 * 2. Se o agente NÃO estiver rodando:
 *    - Usa window.print() como fallback
 *    - Requer Chrome com --kiosk-printing para imprimir sem diálogo
 * 
 * =====================================================
 * OPÇÃO 1: ZOOPI PRINT AGENT (RECOMENDADO)
 * =====================================================
 * 
 * 1. Baixe o agente em Configurações → Impressão
 * 2. Execute: npm install && node agent.js
 * 3. Acesse http://localhost:3848 para configurar
 * 4. Inicie o agente - pedidos imprimirão automaticamente!
 * 
 * =====================================================
 * OPÇÃO 2: CHROME KIOSK MODE (FALLBACK)
 * =====================================================
 * 
 * Se não quiser usar o agente, crie um atalho do Chrome:
 * "C:\...\chrome.exe" --kiosk --kiosk-printing "https://seuapp/orders"
 * 
 * =====================================================
 */

// Global tracker to prevent duplicate prints across component remounts
const globalPrintedOrders = new Set<string>();
const globalAutoInitialized = new Set<string>();

export function AutoPrintListener() {
  const { data: company } = useCompany();
  const printingRef = useRef<Set<string>>(new Set());
  
  const [hasActiveSectors, setHasActiveSectors] = useState<boolean | null>(null);

  // Check if there are active print sectors configured
  // If sectors exist, KitchenPrintListener handles sector-based printing
  // so we should NOT print the full receipt here (avoid duplicates)
  useEffect(() => {
    if (!company?.id) return;
    
    const checkSectors = async () => {
      try {
        const result = await (supabase as any)
          .from('print_sectors')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('active', true);  // FIX: coluna correta é 'active', não 'is_active'
        
        const hasSectors = (result.count || 0) > 0;
        setHasActiveSectors(hasSectors);
        console.log('[AutoPrint] Setores ativos configurados:', hasSectors, 'count:', result.count);
      } catch (e) {
        console.warn('[AutoPrint] Erro ao verificar setores:', e);
        setHasActiveSectors(false);
      }
    };
    
    checkSectors();
  }, [company?.id]);

  // A impressão automática SEMPRE cria jobs na fila (print_job_queue).
  // O agente (desktop) faz o polling/realtime e imprime sem depender de localhost.
  // (Evita abrir o diálogo do navegador / window.print.)

  // (Modo navegador/HTML removido aqui: impressão automática é feita via fila do agente)

  // Função que dispara a impressão
  const triggerPrint = useCallback(async (orderId: string) => {
    // Evita impressão duplicada - check global AND local
    if (globalPrintedOrders.has(orderId) || printingRef.current.has(orderId)) {
      console.log('[AutoPrint] Pedido já foi impresso, ignorando:', orderId);
      return;
    }
    
    printingRef.current.add(orderId);
    globalPrintedOrders.add(orderId);
    console.log('[AutoPrint] Iniciando impressão:', orderId);

    try {
      // Evita duplicar jobs: se algum fluxo já criou jobs para esse pedido, não recria.
      if (company?.id) {
        const { data: existing, error: existingError } = await (supabase as any)
          .from('print_job_queue')
          .select('id')
          .eq('company_id', company.id)
          .eq('order_id', orderId)
          .limit(1);

        if (existingError) {
          console.warn('[AutoPrint] Falha ao checar jobs existentes (seguindo):', existingError);
        }

        if ((existing || []).length > 0) {
          console.log('[AutoPrint] Jobs já existem para o pedido, ignorando criação:', orderId);
          return;
        }

        console.log('[AutoPrint] Criando job na fila (print_job_queue)');
        await createPrintJobsForOrder(company.id, orderId);
        toast.success('Pedido enviado para impressão automática');
        return;
      }

      // Não faz fallback para window.print aqui para evitar abrir diálogo no navegador.
      toast.error('Não foi possível enviar para impressão automática');
      return;
    } catch (error) {
      console.error('[AutoPrint] Erro:', error);
      toast.error('Erro na impressão automática');
    } finally {
      // Remove da lista após 5s para permitir reimpressão manual se necessário
      setTimeout(() => {
        printingRef.current.delete(orderId);
      }, 5000);
    }
  }, [company?.id]);

  // Escuta novos pedidos em tempo real
  useEffect(() => {
    if (!company?.id || !company?.auto_print_enabled) {
      console.log('[AutoPrint] Desabilitado ou sem empresa');
      return;
    }

    // Prevent duplicate initialization per company
    const initKey = `auto-${company.id}`;
    if (globalAutoInitialized.has(initKey)) {
      console.log('[AutoPrint] Already initialized for this company');
      return;
    }
    globalAutoInitialized.add(initKey);

    console.log('[AutoPrint] Iniciando listener para empresa:', company.id);

    const channel = supabase
      .channel(`auto-print-orders-${company.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${company.id}`,
        },
        (payload) => {
          console.log('[AutoPrint] Novo pedido detectado:', payload.new);
          const newOrder = payload.new as any;
          
          // Se há setores de impressão configurados, NÃO imprime aqui
          // porque o KitchenPrintListener já cuida da impressão por setor
          if (hasActiveSectors) {
            console.log('[AutoPrint] Setores ativos detectados - impressão delegada ao KitchenPrintListener');
            return;
          }
          
          // Imprime pedido assim que ele chega como NOVO (e também suporta caso chegue direto em preparo)
          if (newOrder.status === 'novo' || newOrder.status === 'preparo') {
            triggerPrint(newOrder.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AutoPrint] Canal conectado com sucesso');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Silently handle - realtime will auto-reconnect
          console.log('[AutoPrint] Canal desconectado, aguardando reconexão automática');
        }
      });

    return () => {
      console.log('[AutoPrint] Removendo listener');
      globalAutoInitialized.delete(initKey);
      supabase.removeChannel(channel);
      
    };
  }, [company?.id, company?.auto_print_enabled, triggerPrint, hasActiveSectors]);

  // Componente não renderiza nada visualmente
  return null;
}

/**
 * =====================================================
 * DOCUMENTAÇÃO - IMPRESSÃO AUTOMÁTICA SILENCIOSA
 * =====================================================
 * 
 * O sistema detecta automaticamente se o Zoopi Print Agent está
 * rodando. Se estiver, imprime SILENCIOSAMENTE (sem diálogo).
 * Se não estiver, usa window.print() como fallback.
 * 
 * =====================================================
 * OPÇÃO 1: ZOOPI PRINT AGENT (RECOMENDADO)
 * =====================================================
 * 
 * Impressão 100% automática, sem diálogo, USB ou rede.
 * 
 * PASSO 1 - BAIXAR O AGENTE:
 * 1. Acesse Configurações → Impressão
 * 2. Clique em "Baixar Agente de Impressão"
 * 3. Extraia os arquivos em uma pasta
 * 
 * PASSO 2 - INSTALAR DEPENDÊNCIAS:
 * 1. Abra o Prompt de Comando na pasta
 * 2. Execute: npm install
 * 
 * PASSO 3 - INICIAR O AGENTE:
 * 1. Dê duplo clique em INICIAR.bat
 * 2. Ou execute: node agent.js
 * 
 * PASSO 4 - CONFIGURAR:
 * 1. Acesse http://localhost:3848
 * 2. Configure: Supabase URL, Key, Company ID
 * 3. Configure a impressora (Rede ou USB)
 * 4. Clique em "INICIAR"
 * 
 * Pronto! Os pedidos serão impressos automaticamente.
 * 
 * =====================================================
 * OPÇÃO 2: CHROME KIOSK MODE (FALLBACK)
 * =====================================================
 * 
 * Se o agente não estiver rodando, o sistema usa window.print().
 * Para imprimir sem diálogo, use Chrome em modo Kiosk:
 * 
 * 1. Crie um atalho com o comando:
 *    "C:\...\chrome.exe" --kiosk --kiosk-printing "https://seuapp/orders"
 * 
 * 2. Configure a impressora térmica como padrão
 * 
 * 3. Execute o atalho - pedidos imprimirão na impressora padrão
 * 
 * =====================================================
 * SOLUÇÃO DE PROBLEMAS
 * =====================================================
 * 
 * - "Diálogo de impressão aparece":
 *   → Inicie o Zoopi Print Agent (localhost:3848)
 *   → Ou use Chrome com --kiosk-printing
 * 
 * - "Agent não conecta":
 *   → Verifique se node agent.js está rodando
 *   → Acesse http://localhost:3848 para verificar
 * 
 * - "Impressora não imprime":
 *   → Verifique IP/porta da impressora
 *   → Use o botão "Testar Conexão" no agent
 * 
 * =====================================================
 */
