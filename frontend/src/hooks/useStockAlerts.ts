import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface StockAlertItem {
  id: string;
  name: string;
  sku: string | null;
  current_stock: number;
  min_stock: number;
  percentage: number;
  status: 'critical' | 'low' | 'ok';
}

export interface StockAlertSettings {
  enabled: boolean;
  whatsapp_notify: boolean;
  email_notify: boolean;
  notify_phones: string[];
  critical_threshold: number; // percentage of min_stock
  check_interval_hours: number;
}

export function useStockAlerts() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const alertItemsQuery = useQuery({
    queryKey: ['stock-alerts', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await (supabase as any)
        .from('erp_items')
        .select('id, name, sku, current_stock, min_stock')
        .eq('company_id', company.id)
        .eq('track_stock', true)
        .eq('active', true)
        .not('min_stock', 'is', null);

      if (error) throw error;

      const items: StockAlertItem[] = (data || [])
        .filter((item: any) => item.min_stock > 0 && item.current_stock <= item.min_stock)
        .map((item: any) => {
          const percentage = Math.round((item.current_stock / item.min_stock) * 100);
          let status: 'critical' | 'low' | 'ok' = 'ok';
          
          if (percentage <= 25) {
            status = 'critical';
          } else if (percentage <= 100) {
            status = 'low';
          }

          return {
            ...item,
            percentage,
            status,
          };
        })
        .sort((a: StockAlertItem, b: StockAlertItem) => a.percentage - b.percentage);

      return items;
    },
    enabled: !!company?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const sendAlertNotification = useMutation({
    mutationFn: async (items: StockAlertItem[]) => {
      if (!company?.id || items.length === 0) return;

      const criticalItems = items.filter(i => i.status === 'critical');
      const lowItems = items.filter(i => i.status === 'low');

      let message = `🚨 *Alerta de Estoque - ${company.name}*\n\n`;
      
      if (criticalItems.length > 0) {
        message += `⛔ *CRÍTICO (${criticalItems.length} itens):*\n`;
        criticalItems.slice(0, 5).forEach(item => {
          message += `• ${item.name}: ${item.current_stock}/${item.min_stock} (${item.percentage}%)\n`;
        });
        if (criticalItems.length > 5) {
          message += `  ...e mais ${criticalItems.length - 5} itens\n`;
        }
        message += '\n';
      }

      if (lowItems.length > 0) {
        message += `⚠️ *Baixo (${lowItems.length} itens):*\n`;
        lowItems.slice(0, 5).forEach(item => {
          message += `• ${item.name}: ${item.current_stock}/${item.min_stock} (${item.percentage}%)\n`;
        });
        if (lowItems.length > 5) {
          message += `  ...e mais ${lowItems.length - 5} itens\n`;
        }
      }

      // Get company integration settings for WhatsApp number
      const { data: integration } = await (supabase as any)
        .from('company_integrations')
        .select('whatsapp_default_number, whatsapp_enabled')
        .eq('company_id', company.id)
        .maybeSingle();

      if (!integration?.whatsapp_default_number) {
        throw new Error('Número de WhatsApp não configurado nas integrações');
      }

      // Send alert to configured number
      const { error } = await supabase.functions.invoke('send-whatsapp-direct', {
        body: {
          company_id: company.id,
          phone: integration.whatsapp_default_number,
          message,
        },
      });

      if (error) throw error;

      return { sent: true, recipients: 1 };
    },
    onSuccess: (data) => {
      if (data?.sent) {
        toast.success(`Alerta enviado para ${data.recipients} destinatário(s)`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar alerta: ' + error.message);
    },
  });

  const criticalCount = alertItemsQuery.data?.filter(i => i.status === 'critical').length || 0;
  const lowCount = alertItemsQuery.data?.filter(i => i.status === 'low').length || 0;

  return {
    items: alertItemsQuery.data || [],
    isLoading: alertItemsQuery.isLoading,
    criticalCount,
    lowCount,
    totalAlerts: criticalCount + lowCount,
    sendAlertNotification,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['stock-alerts'] }),
  };
}
