import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface CompanyPizzaSettings {
  company_id: string;
  pricing_model: 'maior' | 'media' | 'partes';
  default_sizes: string[];
  slices_per_size: Record<string, number>;
  max_flavors_per_size: Record<string, number>;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<CompanyPizzaSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  pricing_model: 'maior',
  default_sizes: ['Broto', 'Média', 'Grande', 'Gigante'],
  slices_per_size: { Broto: 4, Média: 6, Grande: 8, Gigante: 12 },
  max_flavors_per_size: { Broto: 1, Média: 2, Grande: 3, Gigante: 4 },
};

export function useCompanyPizzaSettings() {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ['company-pizza-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const { data, error } = await supabase
        .from('company_pizza_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      if (error) throw error;
      
      // Return data with defaults if not found
      if (!data) {
        return {
          company_id: company.id,
          ...DEFAULT_SETTINGS,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as CompanyPizzaSettings;
      }
      
      return data as CompanyPizzaSettings;
    },
    enabled: !!company?.id,
  });
}

export function useUpsertCompanyPizzaSettings() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (settings: Partial<Omit<CompanyPizzaSettings, 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('company_pizza_settings')
        .upsert({
          company_id: company.id,
          ...settings,
        }, {
          onConflict: 'company_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CompanyPizzaSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-pizza-settings'] });
      toast.success('Configurações de pizza salvas!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar configurações');
    },
  });
}

export const PRICING_MODEL_LABELS: Record<string, string> = {
  maior: 'Cobrar pelo maior sabor',
  media: 'Cobrar pela média dos sabores',
  partes: 'Cobrar proporcional (por parte)',
};

export const PRICING_MODEL_DESCRIPTIONS: Record<string, string> = {
  maior: 'O valor da pizza será o do sabor mais caro entre os escolhidos',
  media: 'O valor da pizza será a média dos preços dos sabores',
  partes: 'Cada sabor contribui proporcionalmente (1/n do seu preço base)',
};
