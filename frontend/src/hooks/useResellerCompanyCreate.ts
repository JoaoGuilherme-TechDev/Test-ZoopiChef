import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useMyReseller } from './useResellers';
import { toast } from 'sonner';

interface CreateResellerCompanyParams {
  name: string;
  slug: string;
  plan_id?: string;
  trial_days?: number;
  owner_email?: string;
  owner_name?: string;
  owner_password?: string;
}

export function useResellerCompanyCreate() {
  const queryClient = useQueryClient();
  const { reseller } = useMyReseller();

  return useMutation({
    mutationFn: async (params: CreateResellerCompanyParams) => {
      if (!reseller?.id) {
        throw new Error('Revendedor não encontrado');
      }

      // 1. Create company with reseller_id
      const trialEndsAt = params.trial_days 
        ? new Date(Date.now() + params.trial_days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: params.name,
          slug: params.slug,
          is_active: true,
          trial_ends_at: trialEndsAt,
          reseller_id: reseller.id,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // 2. Create subscription if plan provided
      if (params.plan_id) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            company_id: company.id,
            plan_id: params.plan_id,
            status: trialEndsAt ? 'trial' : 'active',
          });

        if (subError) {
          console.error('Error creating subscription:', subError);
        }
      }

      // 3. If owner email provided, create the admin user via edge function
      if (params.owner_email && params.owner_password) {
        const { error: userError } = await supabase.functions.invoke('create-company-user', {
          body: {
            company_id: company.id,
            email: params.owner_email,
            password: params.owner_password,
            full_name: params.owner_name || params.name,
            role: 'company_admin',
          },
        });

        if (userError) {
          console.error('Error creating company admin:', userError);
          // Don't fail the whole operation, just warn
          toast.warning('Empresa criada, mas houve erro ao criar o administrador');
        }
      }

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-companies'] });
      queryClient.invalidateQueries({ queryKey: ['saas-companies'] });
      toast.success('Empresa criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating company:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma empresa com esse slug');
      } else {
        toast.error(`Erro ao criar empresa: ${error.message}`);
      }
    },
  });
}
