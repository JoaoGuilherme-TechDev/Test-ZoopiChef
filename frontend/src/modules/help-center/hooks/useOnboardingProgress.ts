import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from '@/hooks/useCompany';

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  points: number;
  path?: string;
  checkFn?: () => Promise<boolean>;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  company_id: string;
  step_key: string;
  completed_at: string | null;
  points_earned: number;
}

// Define all onboarding steps
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'company_setup',
    title: 'Configurar empresa',
    description: 'Complete os dados da sua empresa',
    points: 10,
    path: '/company',
  },
  {
    key: 'first_product',
    title: 'Cadastrar primeiro produto',
    description: 'Adicione seu primeiro produto ao cardápio',
    points: 15,
    path: '/products',
  },
  {
    key: 'first_category',
    title: 'Criar categoria',
    description: 'Organize seus produtos em categorias',
    points: 10,
    path: '/categories',
  },
  {
    key: 'delivery_config',
    title: 'Configurar delivery',
    description: 'Defina taxas e áreas de entrega',
    points: 15,
    path: '/settings/delivery',
  },
  {
    key: 'first_order',
    title: 'Receber primeiro pedido',
    description: 'Processe seu primeiro pedido no sistema',
    points: 20,
    path: '/orders',
  },
  {
    key: 'cash_register',
    title: 'Abrir caixa',
    description: 'Faça sua primeira abertura de caixa',
    points: 15,
    path: '/cash-register',
  },
  {
    key: 'first_customer',
    title: 'Cadastrar cliente',
    description: 'Adicione seu primeiro cliente',
    points: 10,
    path: '/customers',
  },
  {
    key: 'view_reports',
    title: 'Ver relatórios',
    description: 'Explore os relatórios do sistema',
    points: 10,
    path: '/reports',
  },
  {
    key: 'ai_recommendations',
    title: 'Explorar IA Gestora',
    description: 'Veja as sugestões inteligentes',
    points: 20,
    path: '/ai-recommendations',
  },
  {
    key: 'branding',
    title: 'Personalizar marca',
    description: 'Configure cores e logo da sua marca',
    points: 15,
    path: '/settings/branding',
  },
];

export function useOnboardingProgress() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding-progress', company?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) return [];

      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', company.id);

      if (error) throw error;
      return data as OnboardingProgress[];
    },
    enabled: !!company?.id,
  });

  const completeStep = useMutation({
    mutationFn: async (stepKey: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) throw new Error('Not authenticated');

      const step = ONBOARDING_STEPS.find((s) => s.key === stepKey);
      if (!step) throw new Error('Step not found');

      const { error } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: user.id,
          company_id: company.id,
          step_key: stepKey,
          completed_at: new Date().toISOString(),
          points_earned: step.points,
        }, {
          onConflict: 'user_id,company_id,step_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });

  const completedSteps = progress?.filter((p) => p.completed_at) || [];
  const totalPoints = completedSteps.reduce((sum, p) => sum + p.points_earned, 0);
  const maxPoints = ONBOARDING_STEPS.reduce((sum, s) => sum + s.points, 0);
  const progressPercent = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);

  const isStepCompleted = (stepKey: string) => {
    return completedSteps.some((p) => p.step_key === stepKey);
  };

  const getNextStep = () => {
    return ONBOARDING_STEPS.find((step) => !isStepCompleted(step.key));
  };

  return {
    progress,
    isLoading,
    completeStep,
    completedSteps,
    totalPoints,
    maxPoints,
    progressPercent,
    isStepCompleted,
    getNextStep,
    allSteps: ONBOARDING_STEPS,
  };
}
