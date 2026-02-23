import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from './useCompany';
import { PizzaKDSStep, PIZZA_KDS_STEP_ORDER } from './usePizzaKDSSettings';
import { useEffect } from 'react';

export interface PizzaOrderStepProgress {
  id: string;
  order_id: string;
  order_item_id: string | null;
  company_id: string;
  current_step: PizzaKDSStep;
  step_dough_border_started_at: string | null;
  step_dough_border_completed_at: string | null;
  step_dough_border_operator_id: string | null;
  step_toppings_started_at: string | null;
  step_toppings_completed_at: string | null;
  step_toppings_operator_id: string | null;
  step_oven_started_at: string | null;
  step_oven_completed_at: string | null;
  step_oven_operator_id: string | null;
  step_finish_started_at: string | null;
  step_finish_completed_at: string | null;
  step_finish_operator_id: string | null;
  is_completed: boolean;
  dough_type: string | null;
  border_type: string | null;
  created_at: string;
  updated_at: string;
}

export function usePizzaOrderProgress(companyId?: string) {
  const { data: company } = useCompany();
  const effectiveCompanyId = companyId || company?.id;
  const queryClient = useQueryClient();

  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['pizza-order-progress', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .from('pizza_order_step_progress')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_completed', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PizzaOrderStepProgress[];
    },
    enabled: !!effectiveCompanyId,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!effectiveCompanyId) return;

    const channel = supabase
      .channel(`pizza-progress-${effectiveCompanyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizza_order_step_progress',
          filter: `company_id=eq.${effectiveCompanyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pizza-order-progress', effectiveCompanyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveCompanyId, queryClient]);

  return { progress, isLoading };
}

export function usePizzaStepActions(companyId?: string) {
  const { data: company } = useCompany();
  const effectiveCompanyId = companyId || company?.id;
  const queryClient = useQueryClient();

  const startStep = useMutation({
    mutationFn: async ({ progressId, operatorId }: { progressId: string; operatorId: string }) => {
      // Get current progress
      const { data: current, error: fetchError } = await supabase
        .from('pizza_order_step_progress')
        .select('*')
        .eq('id', progressId)
        .single();

      if (fetchError || !current) throw new Error('Progress not found');

      const step = current.current_step as PizzaKDSStep;
      const startedAtField = `step_${step}_started_at`;
      const operatorField = `step_${step}_operator_id`;

      const { error } = await supabase
        .from('pizza_order_step_progress')
        .update({
          [startedAtField]: new Date().toISOString(),
          [operatorField]: operatorId,
        })
        .eq('id', progressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-order-progress'] });
    },
  });

  const completeStep = useMutation({
    mutationFn: async ({
      progressId,
      operatorId,
      enabledSteps,
    }: {
      progressId: string;
      operatorId: string;
      enabledSteps: PizzaKDSStep[];
    }) => {
      // Get current progress
      const { data: current, error: fetchError } = await supabase
        .from('pizza_order_step_progress')
        .select('*')
        .eq('id', progressId)
        .single();

      if (fetchError || !current) throw new Error('Progress not found');

      const currentStep = current.current_step as PizzaKDSStep;
      const completedAtField = `step_${currentStep}_completed_at`;
      const operatorField = `step_${currentStep}_operator_id`;

      // Find next enabled step
      const currentIndex = PIZZA_KDS_STEP_ORDER.indexOf(currentStep);
      let nextStep: PizzaKDSStep | null = null;

      for (let i = currentIndex + 1; i < PIZZA_KDS_STEP_ORDER.length; i++) {
        if (enabledSteps.includes(PIZZA_KDS_STEP_ORDER[i])) {
          nextStep = PIZZA_KDS_STEP_ORDER[i];
          break;
        }
      }

      const updateData: Record<string, unknown> = {
        [completedAtField]: new Date().toISOString(),
        [operatorField]: operatorId,
      };

      if (nextStep) {
        updateData.current_step = nextStep;
      } else {
        updateData.is_completed = true;
      }

      const { error } = await supabase
        .from('pizza_order_step_progress')
        .update(updateData)
        .eq('id', progressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizza-order-progress'] });
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    },
  });

  return { startStep, completeStep };
}

/**
 * Create pizza step progress when a pizza order item is added
 */
export async function createPizzaStepProgress(
  companyId: string,
  orderId: string,
  orderItemId: string,
  doughType?: string,
  borderType?: string
): Promise<void> {
  // Get enabled steps from settings
  const { data: settings } = await supabase
    .from('pizza_kds_settings')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (!settings?.is_enabled) return;

  // Find first enabled step
  const enabledSteps: PizzaKDSStep[] = [];
  if (settings.step_dough_border_enabled) enabledSteps.push('dough_border');
  if (settings.step_toppings_enabled) enabledSteps.push('toppings');
  if (settings.step_oven_enabled) enabledSteps.push('oven');
  if (settings.step_finish_enabled) enabledSteps.push('finish');

  if (enabledSteps.length === 0) return;

  const firstStep = enabledSteps[0];

  await supabase.from('pizza_order_step_progress').insert({
    company_id: companyId,
    order_id: orderId,
    order_item_id: orderItemId,
    current_step: firstStep,
    dough_type: doughType || null,
    border_type: borderType || null,
  });
}
