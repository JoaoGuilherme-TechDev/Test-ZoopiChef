import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';
import { toast } from 'sonner';
import type { SaaSSubscription, SaaSInvoice } from '../types';

export function useSaaSSubscription() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ['saas-subscription', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const { data, error } = await (supabase as any)
        .from('saas_subscriptions')
        .select('*, plan:saas_plans(*)')
        .eq('company_id', company.id)
        .maybeSingle();
      if (error) throw error;
      
      if (data?.plan?.features) {
        data.plan.features = typeof data.plan.features === 'string'
          ? JSON.parse(data.plan.features)
          : data.plan.features;
      }
      
      return data as SaaSSubscription | null;
    },
    enabled: !!company?.id,
  });

  const invoicesQuery = useQuery({
    queryKey: ['saas-invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await (supabase as any)
        .from('saas_invoices')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SaaSInvoice[];
    },
    enabled: !!company?.id,
  });

  const createSubscription = useMutation({
    mutationFn: async (planId: string) => {
      if (!company?.id) throw new Error('Empresa não selecionada');

      // Get plan details
      const { data: plan, error: planError } = await (supabase as any)
        .from('saas_plans')
        .select('*')
        .eq('id', planId)
        .single();
      if (planError) throw planError;

      // Calculate period
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.billing_period === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Create subscription
      const { data: subscription, error } = await (supabase as any)
        .from('saas_subscriptions')
        .insert({
          company_id: company.id,
          plan_id: planId,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Create first invoice
      await (supabase as any)
        .from('saas_invoices')
        .insert({
          company_id: company.id,
          subscription_id: subscription.id,
          amount_cents: plan.price_cents,
          status: 'pending',
          due_date: now.toISOString().split('T')[0],
        });

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['saas-invoices'] });
      toast.success('Assinatura criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar assinatura: ' + error.message);
    },
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      if (!subscriptionQuery.data?.id) throw new Error('Nenhuma assinatura ativa');

      const { error } = await (supabase as any)
        .from('saas_subscriptions')
        .update({
          cancel_at_period_end: true,
        })
        .eq('id', subscriptionQuery.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-subscription'] });
      toast.success('Assinatura será cancelada ao final do período');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  const changePlan = useMutation({
    mutationFn: async (newPlanId: string) => {
      if (!subscriptionQuery.data?.id) throw new Error('Nenhuma assinatura ativa');

      const { error } = await (supabase as any)
        .from('saas_subscriptions')
        .update({
          plan_id: newPlanId,
          cancel_at_period_end: false,
        })
        .eq('id', subscriptionQuery.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-subscription'] });
      toast.success('Plano alterado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar plano: ' + error.message);
    },
  });

  // Check subscription status
  const isActive = subscriptionQuery.data?.status === 'active';
  const isTrialing = subscriptionQuery.data?.status === 'trialing';
  const isPastDue = subscriptionQuery.data?.status === 'past_due';
  const willCancel = subscriptionQuery.data?.cancel_at_period_end;

  // Check feature access
  const hasFeature = (feature: 'ai' | 'whatsapp' | 'tracking' | 'multi_store') => {
    const plan = subscriptionQuery.data?.plan;
    if (!plan) return false;
    
    switch (feature) {
      case 'ai': return plan.has_ai_features;
      case 'whatsapp': return plan.has_whatsapp;
      case 'tracking': return plan.has_delivery_tracking;
      case 'multi_store': return plan.has_multi_store;
      default: return false;
    }
  };

  return {
    subscription: subscriptionQuery.data,
    invoices: invoicesQuery.data || [],
    isLoading: subscriptionQuery.isLoading,
    isActive,
    isTrialing,
    isPastDue,
    willCancel,
    hasFeature,
    createSubscription,
    cancelSubscription,
    changePlan,
  };
}
