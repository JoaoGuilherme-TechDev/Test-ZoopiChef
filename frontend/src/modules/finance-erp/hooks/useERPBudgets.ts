import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface Budget {
  id: string;
  company_id: string;
  category_id: string | null;
  cost_center_id: string | null;
  name: string;
  budget_type: string;
  period_type: string;
  period_year: number;
  period_month: number | null;
  planned_amount_cents: number;
  actual_amount_cents: number;
  variance_cents: number;
  alert_threshold_percent: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  usage_percent?: number;
  category_name?: string;
  cost_center_name?: string;
}

export interface BudgetInsert {
  name: string;
  budget_type: string;
  period_type: string;
  period_year: number;
  period_month?: number | null;
  planned_amount_cents: number;
  category_id?: string | null;
  cost_center_id?: string | null;
  alert_threshold_percent?: number;
  notes?: string | null;
}

export function useERPBudgets(year?: number) {
  const { data: company } = useCompany();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ["erp-budgets", company?.id, currentYear],
    queryFn: async (): Promise<Budget[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("erp_budgets")
        .select(`
          *,
          category:chart_of_accounts(name),
          cost_center:cost_centers(name)
        `)
        .eq("company_id", company.id)
        .eq("period_year", currentYear)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      return (data || []).map((b: any) => ({
        ...b,
        category_name: b.category?.name,
        cost_center_name: b.cost_center?.name,
        usage_percent: b.planned_amount_cents > 0
          ? Math.round((b.actual_amount_cents / b.planned_amount_cents) * 100)
          : 0,
      }));
    },
    enabled: !!company?.id,
  });
}

export function useCreateBudget() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: BudgetInsert) => {
      if (!company?.id) throw new Error("Company not found");

      const { data, error } = await supabase
        .from("erp_budgets")
        .insert({
          ...budget,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-budgets"] });
      toast.success("Orçamento criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar orçamento: ${error.message}`);
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Budget> & { id: string }) => {
      const { data, error } = await supabase
        .from("erp_budgets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-budgets"] });
      toast.success("Orçamento atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("erp_budgets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-budgets"] });
      toast.success("Orçamento excluído");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}
