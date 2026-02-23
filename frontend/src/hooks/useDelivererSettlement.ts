import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface SettlementOrder {
  id: string;
  order_number: number | null;
  total: number;
  payment_method: string | null;
  payment_method_normalized: string;
  change_for: number | null;
  delivery_fee: number | null;
  deliverer_id: string | null;
  created_at: string;
  customer_name: string | null;
  settled_at: string | null;
}

// Normaliza os diferentes valores de payment_method do banco para valores padronizados
const normalizePaymentMethod = (method: string | null): string => {
  if (!method) return '';
  const normalized = method.toLowerCase().trim();
  
  // Mapeia variações para valores padrão
  const mapping: Record<string, string> = {
    'dinheiro': 'dinheiro',
    'money': 'dinheiro',
    'cash': 'dinheiro',
    'pix': 'pix',
    'cartao_credito': 'cartao_credito',
    'cartao_debito': 'cartao_debito',
    'credit': 'cartao_credito',
    'credito': 'cartao_credito',
    'crédito': 'cartao_credito',
    'debit': 'cartao_debito',
    'debito': 'cartao_debito',
    'débito': 'cartao_debito',
    'card': 'cartao_credito',
    'cartao': 'cartao_credito',
    'cashier_qr': 'pix',
    'qr': 'pix',
  };
  
  return mapping[normalized] || normalized;
};

export interface DelivererSettlementData {
  delivererId: string;
  delivererName: string;
  orders: SettlementOrder[];
  totalAmount: number;
  totalDeliveryFees: number;
  cashAmount: number;
  cardAmount: number;
  pixAmount: number;
  changeGiven: number;
  netAmount: number;
}

export function useDelivererSettlement() {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Buscar pedidos ENTREGUES e NÃO ACERTADOS agrupados por entregador
  // REGRA: status = 'entregue' AND settled_at IS NULL AND deliverer_id IS NOT NULL
  const { data: settlements = [], isLoading, refetch } = useQuery({
    queryKey: ['delivererSettlements', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Query com filtros corretos para pedidos pendentes de acerto
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          payment_method,
          change_for,
          delivery_fee,
          deliverer_id,
          created_at,
          customer_name,
          settled_at,
          status,
          deliverer:deliverers(id, name)
        `)
        .eq('company_id', company.id)
        .eq('status', 'entregue')           // SOMENTE status entregue
        .not('deliverer_id', 'is', null)    // DEVE ter entregador
        .is('settled_at', null)             // NÃO pode estar acertado
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[useDelivererSettlement] Pedidos pendentes encontrados:', orders?.length || 0);

      // Agrupar por entregador
      const groupedByDeliverer = new Map<string, DelivererSettlementData>();

      (orders || []).forEach((order: any) => {
        const delivererId = order.deliverer_id;
        const delivererName = order.deliverer?.name || 'Entregador Desconhecido';

        if (!groupedByDeliverer.has(delivererId)) {
          groupedByDeliverer.set(delivererId, {
            delivererId,
            delivererName,
            orders: [],
            totalAmount: 0,
            totalDeliveryFees: 0,
            cashAmount: 0,
            cardAmount: 0,
            pixAmount: 0,
            changeGiven: 0,
            netAmount: 0,
          });
        }

        const settlement = groupedByDeliverer.get(delivererId)!;
        const orderTotal = Number(order.total) || 0;
        const deliveryFee = Number(order.delivery_fee) || 0;
        const changeFor = Number(order.change_for) || 0;
        
        // Normaliza o método de pagamento
        const normalizedMethod = normalizePaymentMethod(order.payment_method);
        
        const changeGiven = normalizedMethod === 'dinheiro' && changeFor > orderTotal 
          ? changeFor - orderTotal 
          : 0;

        settlement.orders.push({
          id: order.id,
          order_number: order.order_number,
          total: orderTotal,
          payment_method: order.payment_method,
          payment_method_normalized: normalizedMethod,
          change_for: order.change_for,
          delivery_fee: deliveryFee,
          deliverer_id: order.deliverer_id,
          created_at: order.created_at,
          customer_name: order.customer_name,
          settled_at: order.settled_at,
        });

        settlement.totalAmount += orderTotal;
        settlement.totalDeliveryFees += deliveryFee;
        settlement.changeGiven += changeGiven;

        // Usa o método normalizado para calcular os totais
        switch (normalizedMethod) {
          case 'dinheiro':
            settlement.cashAmount += orderTotal;
            break;
          case 'pix':
            settlement.pixAmount += orderTotal;
            break;
          case 'cartao_credito':
          case 'cartao_debito':
            settlement.cardAmount += orderTotal;
            break;
        }
      });

      // Calcular valor líquido para cada entregador
      // REGRA: O entregador recolheu cashAmount (já líquido após dar troco)
      // e tem direito a receber totalDeliveryFees como pagamento.
      // netAmount = o que o entregador deve devolver à empresa
      // netAmount = Dinheiro Recolhido - Taxa de Entrega (a pagar ao entregador)
      groupedByDeliverer.forEach((settlement) => {
        // Se positivo: entregador devolve à empresa
        // Se negativo: empresa deve pagar ao entregador
        settlement.netAmount = settlement.cashAmount - settlement.totalDeliveryFees;
      });

      return Array.from(groupedByDeliverer.values()).filter(s => s.orders.length > 0);
    },
    enabled: !!company?.id,
    staleTime: 0, // Sempre buscar dados frescos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Confirmar acerto de um entregador
  const confirmSettlement = useMutation({
    mutationFn: async ({ 
      delivererId, 
      orderIds, 
      notes 
    }: { 
      delivererId: string; 
      orderIds: string[]; 
      notes?: string;
    }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');

      const settlement = settlements.find(s => s.delivererId === delivererId);
      if (!settlement) throw new Error('Settlement not found');

      const now = new Date().toISOString();

      // 1. Criar registro em deliverer_settlements (histórico do acerto)
      const { data: settlementRecord, error: settlementError } = await supabase
        .from('deliverer_settlements')
        .insert({
          company_id: company.id,
          deliverer_id: delivererId,
          user_id: profile.id,
          period_start: settlement.orders[settlement.orders.length - 1]?.created_at || now,
          period_end: settlement.orders[0]?.created_at || now,
          total_orders: orderIds.length,
          total_amount_cents: Math.round(settlement.totalAmount * 100),
          total_delivery_fee_cents: Math.round(settlement.totalDeliveryFees * 100),
          cash_collected_cents: Math.round(settlement.cashAmount * 100),
          pix_collected_cents: Math.round(settlement.pixAmount * 100),
          card_collected_cents: Math.round(settlement.cardAmount * 100),
          amount_to_receive_cents: Math.round((settlement.cashAmount - settlement.changeGiven) * 100),
          amount_to_pay_cents: Math.round(settlement.totalDeliveryFees * 100),
          notes: notes || null,
          status: 'approved',
          approved_at: now,
          approved_by: profile.id,
        })
        .select('id')
        .single();

      if (settlementError) throw settlementError;

      // 2. Vincular pedidos ao acerto
      if (settlementRecord?.id) {
        const orderLinks = orderIds.map(orderId => {
          const order = settlement.orders.find(o => o.id === orderId);
          return {
            settlement_id: settlementRecord.id,
            order_id: orderId,
            order_total_cents: Math.round((order?.total || 0) * 100),
            delivery_fee_cents: Math.round((order?.delivery_fee || 0) * 100),
            payment_method: order?.payment_method || null,
          };
        });

        await supabase
          .from('deliverer_settlement_orders')
          .insert(orderLinks);
      }

      // 3. Marcar todos os pedidos como acertados
      const { error: updateError } = await supabase
        .from('orders')
        .update({ settled_at: now })
        .in('id', orderIds);

      if (updateError) throw updateError;

      // 4. Criar registro em contas a pagar (taxa de entrega devida ao entregador)
      if (settlement.totalDeliveryFees > 0) {
        await supabase
          .from('accounts_payable')
          .insert({
            company_id: company.id,
            description: `Acerto ${settlement.delivererName} - ${orderIds.length} pedidos`,
            amount_cents: Math.round(settlement.totalDeliveryFees * 100),
            category: 'entregador',
            reference_type: 'deliverer_settlement',
            reference_id: settlementRecord?.id,
            notes: `Dinheiro: R$ ${settlement.cashAmount.toFixed(2)} | Troco dado: R$ ${settlement.changeGiven.toFixed(2)} | A receber do entregador: R$ ${settlement.netAmount.toFixed(2)}`,
            due_date: new Date().toISOString().split('T')[0],
            created_by: profile.id,
            status: 'pending',
          });
      }

      return { orderIds, delivererId, settlementId: settlementRecord?.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivererSettlements'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      toast.success('Acerto confirmado! Pedidos baixados, histórico e conta a pagar criados.');
    },
    onError: (error) => {
      console.error('Erro no acerto:', error);
      toast.error('Erro ao confirmar acerto');
    },
  });

  return {
    settlements,
    isLoading,
    confirmSettlement,
    refetch,
  };
}