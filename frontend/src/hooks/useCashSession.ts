import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { printCashSupplyReceipt } from '@/components/cash/CashSupplyPrint';
import { printCashClosingReceipt } from '@/components/cash/CashClosingPrint';

export interface CashSession {
  id: string;
  company_id: string;
  opened_by: string;
  opened_at: string;
  opening_balance: number;
  closed_by: string | null;
  closed_at: string | null;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  notes: string | null;
  status: 'open' | 'closed';
  business_date: string; // Data de negócio - sempre a data de ABERTURA do caixa
}

export interface CashClosingSummary {
  totalOrders: number;
  totalRevenue: number;
  avgTicket: number;
  payments: {
    dinheiro: { count: number; total: number };
    pix: { count: number; total: number };
    cartao_credito: { count: number; total: number };
    cartao_debito: { count: number; total: number };
    fiado: { count: number; total: number };
    outros: { count: number; total: number };
  };
  deliveryFees: number;
  discounts: number;
  cancelled: { count: number; total: number };
  changeGiven: number;
  fiadoGenerated: number;
  fiadoReceived: number;
  openingBalance: number;
  expectedCash: number;
  suppliesTotal: number;
  withdrawalsTotal: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  delivererStats: Array<{ name: string; deliveries: number; totalValue: number }>;
}

export function useCashSession() {
  const { data: company } = useCompany();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  // Buscar sessão de caixa aberta
  const { data: openSession, isLoading } = useQuery({
    queryKey: ['cash-session-open', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CashSession | null;
    },
    enabled: !!company?.id,
  });

  // Buscar histórico de sessões
  const { data: sessionHistory = [] } = useQuery({
    queryKey: ['cash-sessions-history', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('company_id', company.id)
        .order('opened_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as CashSession[];
    },
    enabled: !!company?.id,
  });

  // Abrir caixa
  const openCash = useMutation({
    mutationFn: async ({ openingBalance, notes }: { openingBalance: number; notes?: string }) => {
      if (!company?.id || !profile?.id) throw new Error('Dados não disponíveis');

      // Verificar se já existe caixa aberto
      const { data: existing } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'open')
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um caixa aberto');
      }

      // Calcular business_date (data de negócio) - sempre a data de ABERTURA
      // Em timezone de São Paulo
      const now = new Date();
      const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const businessDate = saoPauloFormatter.format(now); // Formato YYYY-MM-DD

      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          company_id: company.id,
          opened_by: profile.id,
          opening_balance: openingBalance,
          business_date: businessDate,
          notes,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Retornar dados adicionais para a impressão automática
      return { 
        session: data, 
        operatorName: profile.full_name || 'Operador',
        companyName: company.name || 'Empresa',
        notes 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session-open'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions-history'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      toast.success('Caixa aberto com sucesso!');
      
      // Impressão automática do cupom de suprimento
      setTimeout(() => {
        try {
          printCashSupplyReceipt({
            session: data.session as CashSession,
            operatorName: data.operatorName,
            companyName: data.companyName,
            notes: data.notes,
          });
          toast.success('Cupom de suprimento enviado para impressão');
        } catch (printError) {
          console.error('Erro ao imprimir suprimento:', printError);
        }
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao abrir caixa');
    },
  });

  // Fechar caixa
  const closeCash = useMutation({
    mutationFn: async ({ 
      closingBalance, 
      notes,
      differenceReason,
      weatherNote,
      printReceipt = true,
      summarySnapshot,
    }: { 
      closingBalance: number; 
      notes?: string;
      differenceReason?: string;
      weatherNote?: string;
      printReceipt?: boolean;
      summarySnapshot?: CashClosingSummary | null;
    }) => {
      if (!company?.id || !profile?.id) {
        throw new Error('Dados do usuário não disponíveis');
      }
      
      if (!openSession?.id) {
        throw new Error('Nenhum caixa aberto para fechar');
      }

      // Calcular saldo esperado (somente dinheiro)
      const { data: orders } = await supabase
        .from('orders')
        .select('total, payment_method, change_for')
        .eq('company_id', company.id)
        .eq('cash_session_id', openSession.id)
        .is('cancelled_at', null);

      // Buscar movimentações de caixa (suprimentos e sangrias)
      const { data: movements } = await supabase
        .from('cash_movements')
        .select('movement_type, amount')
        .eq('cash_session_id', openSession.id);

      const cashOrders = orders?.filter(o => 
        o.payment_method?.toLowerCase() === 'dinheiro'
      ) || [];
      
      const cashFromOrders = cashOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const changeGiven = cashOrders.reduce((sum, o) => {
        const changeFor = Number(o.change_for) || 0;
        const total = Number(o.total) || 0;
        return sum + (changeFor > total ? changeFor - total : 0);
      }, 0);

      // Calcular suprimentos e sangrias
      const suppliesTotal = movements?.filter(m => m.movement_type === 'supply')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;
      const withdrawalsTotal = movements?.filter(m => m.movement_type === 'withdrawal')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;

      // Saldo esperado = Abertura + Dinheiro Vendas - Troco + Suprimentos - Sangrias
      const expectedBalance = openSession.opening_balance + cashFromOrders - changeGiven + suppliesTotal - withdrawalsTotal;
      const difference = closingBalance - expectedBalance;

      // Prepare summary stats
      const summary = summarySnapshot;
      
      const { data, error } = await supabase
        .from('cash_sessions')
        .update({
          closed_by: profile.id,
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          expected_balance: expectedBalance,
          difference,
          difference_reason: differenceReason || null,
          weather_note: weatherNote || null,
          notes,
          status: 'closed',
          // Store summary stats
          total_orders: summary?.totalOrders || 0,
          total_revenue: summary?.totalRevenue || 0,
          avg_ticket: summary?.avgTicket || 0,
          cancel_count: summary?.cancelled?.count || 0,
          cancel_total: summary?.cancelled?.total || 0,
          delivery_fee_total: summary?.deliveryFees || 0,
          change_given_total: summary?.changeGiven || 0,
          payments_summary: summary?.payments || null,
        })
        .eq('id', openSession.id)
        .select()
        .single();

      if (error) throw error;

      // Se há diferença, lançar automaticamente no plano de contas
      if (Math.abs(difference) > 0.01) {
        try {
          // Buscar ou criar contas de sobra/falta
          const adjustmentType = difference > 0 ? 'sobra' : 'falta';
          const accountCode = difference > 0 ? '4.1.1.1' : '4.1.1.2';
          
          // Verificar se a conta existe
          let { data: chartAccount } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('company_id', company.id)
            .eq('code', accountCode)
            .maybeSingle();

          // Se não existe, criar estrutura de contas
          if (!chartAccount) {
            // Criar nível 1
            let { data: level1 } = await supabase
              .from('chart_of_accounts')
              .select('id')
              .eq('company_id', company.id)
              .eq('code', '4')
              .maybeSingle();

            if (!level1) {
              const { data: newL1 } = await supabase
                .from('chart_of_accounts')
                .insert({
                  company_id: company.id,
                  code: '4',
                  name: 'Outras Receitas e Despesas',
                  level: 1,
                  account_type: 'other',
                })
                .select()
                .single();
              level1 = newL1;
            }

            // Criar nível 2
            let { data: level2 } = await supabase
              .from('chart_of_accounts')
              .select('id')
              .eq('company_id', company.id)
              .eq('code', '4.1')
              .maybeSingle();

            if (!level2 && level1) {
              const { data: newL2 } = await supabase
                .from('chart_of_accounts')
                .insert({
                  company_id: company.id,
                  code: '4.1',
                  name: 'Ajustes de Caixa',
                  level: 2,
                  account_type: 'adjustment',
                  parent_id: level1.id,
                })
                .select()
                .single();
              level2 = newL2;
            }

            // Criar nível 3
            let { data: level3 } = await supabase
              .from('chart_of_accounts')
              .select('id')
              .eq('company_id', company.id)
              .eq('code', '4.1.1')
              .maybeSingle();

            if (!level3 && level2) {
              const { data: newL3 } = await supabase
                .from('chart_of_accounts')
                .insert({
                  company_id: company.id,
                  code: '4.1.1',
                  name: 'Diferenças de Caixa',
                  level: 3,
                  account_type: 'adjustment',
                  parent_id: level2.id,
                })
                .select()
                .single();
              level3 = newL3;
            }

            // Criar conta específica (sobra ou falta)
            if (level3) {
              const { data: newAccount } = await supabase
                .from('chart_of_accounts')
                .insert({
                  company_id: company.id,
                  code: accountCode,
                  name: difference > 0 ? 'Sobra de Caixa' : 'Falta de Caixa',
                  level: 4,
                  account_type: difference > 0 ? 'income' : 'expense',
                  parent_id: level3.id,
                })
                .select()
                .single();
              chartAccount = newAccount;
            }
          }

          // Criar o lançamento de ajuste
          if (chartAccount) {
            await supabase
              .from('cash_adjustments')
              .insert({
                company_id: company.id,
                cash_session_id: openSession.id,
                adjustment_type: adjustmentType,
                amount: Math.abs(difference),
                reason: differenceReason || `${adjustmentType === 'sobra' ? 'Sobra' : 'Falta'} de caixa no fechamento`,
                created_by: profile.id,
                chart_account_id: chartAccount.id,
              });

            // Se for falta, criar conta a pagar automaticamente
            if (difference < 0) {
              await supabase
                .from('accounts_payable')
                .insert({
                  company_id: company.id,
                  description: `Falta de Caixa - Sessão ${openSession.id.slice(0, 8)}`,
                  amount_cents: Math.round(Math.abs(difference) * 100),
                  category_id: chartAccount.id,
                  status: 'paid', // Já considerado como baixado (descontado do caixa)
                  paid_at: new Date().toISOString(),
                  paid_by: profile.id,
                  created_by: profile.id,
                  notes: differenceReason || 'Lançamento automático de falta de caixa',
                });
            }
          }
        } catch (adjustmentError) {
          console.error('Erro ao criar ajuste de caixa:', adjustmentError);
          // Não impede o fechamento, apenas loga
        }
      }
      
      return { 
        session: data, 
        closingBalance,
        difference,
        summary: summarySnapshot,
        operatorName: profile.full_name || 'Operador',
        companyName: company.name || 'Empresa',
        printReceipt,
      };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session-open'] });
      queryClient.invalidateQueries({ queryKey: ['cash-sessions-history'] });
      queryClient.invalidateQueries({ queryKey: ['cash-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cash-history'] });
      queryClient.invalidateQueries({ queryKey: ['cash-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-payable'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      let message = 'Caixa fechado com sucesso!';
      if (data.difference && Math.abs(data.difference) > 0.01) {
        const tipo = data.difference > 0 ? 'Sobra' : 'Falta';
        message += ` ${tipo} de R$ ${Math.abs(data.difference).toFixed(2)} registrada.`;
      }
      toast.success(message);
      
      // Impressão automática do fechamento
      if (data.printReceipt && data.summary) {
        setTimeout(() => {
          try {
            printCashClosingReceipt({
              session: data.session as CashSession,
              summary: data.summary,
              closingBalance: data.closingBalance,
              operatorName: data.operatorName,
              companyName: data.companyName,
            });
            toast.success('Relatório de fechamento enviado para impressão');
          } catch (printError) {
            console.error('Erro ao imprimir fechamento:', printError);
          }
        }, 500);
      }

      // Enviar email de relatório se configurado
      if (company?.id && data.session?.id) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-shift-report-email', {
            body: {
              company_id: company.id,
              cash_session_id: data.session.id,
            },
          });
          if (emailError) {
            console.error('Erro ao enviar email de relatório:', emailError);
          } else {
            console.log('Email de relatório enviado');
          }
        } catch (emailErr) {
          console.error('Erro ao invocar função de email:', emailErr);
        }
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao fechar caixa:', error);
      toast.error(error.message || 'Erro ao fechar caixa');
    },
  });

  // Buscar resumo completo do caixa atual para fechamento
  const { data: cashSummary } = useQuery({
    queryKey: ['cash-summary', openSession?.id],
    queryFn: async (): Promise<CashClosingSummary | null> => {
      if (!company?.id || !openSession?.id) return null;

      // Get orders for this session
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*),
          deliverer:deliverers(id, name)
        `)
        .eq('company_id', company.id)
        .eq('cash_session_id', openSession.id);

      const validOrders = orders?.filter(o => !o.cancelled_at) || [];
      const cancelledOrders = orders?.filter(o => o.cancelled_at) || [];

      // Get credit transactions for this period
      const { data: creditTransactions } = await supabase
        .from('customer_credit_transactions')
        .select('*')
        .eq('company_id', company.id)
        .gte('created_at', openSession.opened_at);

      // Buscar movimentações de caixa (suprimentos e sangrias)
      const { data: movements } = await supabase
        .from('cash_movements')
        .select('movement_type, amount')
        .eq('cash_session_id', openSession.id);

      const suppliesTotal = movements?.filter(m => m.movement_type === 'supply')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;
      const withdrawalsTotal = movements?.filter(m => m.movement_type === 'withdrawal')
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0;

      // Calculate payment totals
      const getPaymentTotal = (methods: string[]) => {
        const filtered = validOrders.filter(o => 
          methods.some(m => o.payment_method?.toLowerCase().includes(m.toLowerCase()))
        );
        return {
          count: filtered.length,
          total: filtered.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        };
      };

      const dinheiroOrders = validOrders.filter(o => o.payment_method?.toLowerCase() === 'dinheiro');
      const changeGiven = dinheiroOrders.reduce((sum, o) => {
        const changeFor = Number(o.change_for) || 0;
        const total = Number(o.total) || 0;
        return sum + (changeFor > total ? changeFor - total : 0);
      }, 0);

      // Top products
      const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
      validOrders.forEach((order: any) => {
        order.items?.forEach((item: any) => {
          const name = item.product_name;
          if (!productMap[name]) {
            productMap[name] = { name, quantity: 0, revenue: 0 };
          }
          productMap[name].quantity += item.quantity;
          productMap[name].revenue += item.quantity * item.unit_price;
        });
      });
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Deliverer stats
      const delivererMap: Record<string, { name: string; deliveries: number; totalValue: number }> = {};
      validOrders.filter((o: any) => o.deliverer).forEach((order: any) => {
        const deliverer = order.deliverer;
        if (!delivererMap[deliverer.id]) {
          delivererMap[deliverer.id] = { name: deliverer.name, deliveries: 0, totalValue: 0 };
        }
        delivererMap[deliverer.id].deliveries += 1;
        delivererMap[deliverer.id].totalValue += Number(order.total) || 0;
      });
      const delivererStats = Object.values(delivererMap).sort((a, b) => b.deliveries - a.deliveries);

      // Calculate other methods
      const knownMethods = ['dinheiro', 'pix', 'cart', 'credito', 'debito', 'fiado'];
      const otherOrders = validOrders.filter(o => 
        !knownMethods.some(m => o.payment_method?.toLowerCase().includes(m))
      );

      const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const summary: CashClosingSummary = {
        totalOrders: validOrders.length,
        totalRevenue,
        avgTicket: validOrders.length > 0 ? totalRevenue / validOrders.length : 0,
        payments: {
          dinheiro: {
            count: dinheiroOrders.length,
            total: dinheiroOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          },
          pix: getPaymentTotal(['pix']),
          cartao_credito: getPaymentTotal(['credito', 'cartao_credito']),
          cartao_debito: getPaymentTotal(['debito', 'cartao_debito']),
          fiado: getPaymentTotal(['fiado']),
          outros: {
            count: otherOrders.length,
            total: otherOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          },
        },
        deliveryFees: validOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0),
        discounts: 0, // Would need discount tracking
        cancelled: {
          count: cancelledOrders.length,
          total: cancelledOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        },
        changeGiven,
        fiadoGenerated: getPaymentTotal(['fiado']).total,
        fiadoReceived: creditTransactions
          ?.filter(t => t.transaction_type === 'payment' || t.transaction_type === 'credit')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
        openingBalance: openSession.opening_balance,
        expectedCash: openSession.opening_balance + 
          dinheiroOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) - 
          changeGiven + suppliesTotal - withdrawalsTotal,
        suppliesTotal,
        withdrawalsTotal,
        topProducts,
        delivererStats,
      };

      return summary;
    },
    enabled: !!openSession?.id,
    refetchInterval: 30000,
  });

  return {
    openSession,
    isLoading,
    sessionHistory,
    cashSummary,
    openCash,
    closeCash,
    isCashOpen: !!openSession,
  };
}
