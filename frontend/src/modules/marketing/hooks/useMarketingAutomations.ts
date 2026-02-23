import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { MarketingAutomation } from '../types';

// Automações pré-definidas (podem ser persistidas no banco futuramente)
const DEFAULT_AUTOMATIONS: Omit<MarketingAutomation, 'id' | 'company_id' | 'created_at'>[] = [
  {
    name: 'Boas-vindas ao novo cliente',
    trigger_type: 'new_customer',
    trigger_config: {},
    action_type: 'send_whatsapp',
    action_config: { 
      template: 'Olá {{nome}}! Seja bem-vindo(a) à {{empresa}}! 🎉' 
    },
    is_active: true,
    executions_count: 0,
  },
  {
    name: 'Recuperação de carrinho abandonado',
    trigger_type: 'abandoned_cart',
    trigger_config: { delay_minutes: 30 },
    action_type: 'send_whatsapp',
    action_config: { 
      template: 'Oi {{nome}}! Você esqueceu itens no carrinho. Finalize seu pedido agora! 🛒' 
    },
    is_active: false,
    executions_count: 0,
  },
  {
    name: 'Aniversário do cliente',
    trigger_type: 'birthday',
    trigger_config: {},
    action_type: 'apply_coupon',
    action_config: { 
      discount_percent: 10,
      message: 'Feliz aniversário, {{nome}}! 🎂 Use o cupom ANIVER10 para 10% de desconto!' 
    },
    is_active: true,
    executions_count: 0,
  },
  {
    name: 'Reativação de cliente inativo',
    trigger_type: 'inactive',
    trigger_config: { days_inactive: 30 },
    action_type: 'send_whatsapp',
    action_config: { 
      template: 'Sentimos sua falta, {{nome}}! 💔 Volte e ganhe frete grátis no próximo pedido!' 
    },
    is_active: false,
    executions_count: 0,
  },
  {
    name: 'Agradecimento pós-compra',
    trigger_type: 'post_purchase',
    trigger_config: { delay_hours: 24 },
    action_type: 'send_whatsapp',
    action_config: { 
      template: 'Obrigado pela compra, {{nome}}! 🙏 Esperamos que tenha gostado!' 
    },
    is_active: true,
    executions_count: 0,
  },
];

export function useMarketingAutomations() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['marketing-automations', company?.id],
    queryFn: async (): Promise<MarketingAutomation[]> => {
      if (!company?.id) return [];
      
      // Por enquanto, retornar automações padrão
      // Futuramente, buscar do banco de dados
      return DEFAULT_AUTOMATIONS.map((a, index) => ({
        ...a,
        id: `auto-${index}`,
        company_id: company.id,
        created_at: new Date().toISOString(),
      }));
    },
    enabled: !!company?.id,
  });

  const toggleAutomation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // Simular toggle - persistir no banco futuramente
      return { id, is_active };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-automations'] });
      toast.success('Automação atualizada!');
    },
  });

  const activeAutomations = automations.filter(a => a.is_active);
  const inactiveAutomations = automations.filter(a => !a.is_active);

  return {
    automations,
    activeAutomations,
    inactiveAutomations,
    isLoading,
    toggleAutomation,
  };
}
