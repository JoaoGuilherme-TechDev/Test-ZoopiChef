import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from "@/hooks/useCompany";

export interface FinancialAlert {
  id: string;
  company_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useFinancialAlerts(showDismissed = false) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["financial-alerts", company?.id, showDismissed],
    queryFn: async (): Promise<FinancialAlert[]> => {
      if (!company?.id) return [];

      let query = supabase
        .from("erp_financial_alerts")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (!showDismissed) {
        query = query.eq("is_dismissed", false);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}

export function useUnreadAlertsCount() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["financial-alerts-count", company?.id],
    queryFn: async (): Promise<number> => {
      if (!company?.id) return 0;

      const { count, error } = await supabase
        .from("erp_financial_alerts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("is_read", false)
        .eq("is_dismissed", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!company?.id,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("erp_financial_alerts")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-alerts-count"] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("erp_financial_alerts")
        .update({
          is_dismissed: true,
          dismissed_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-alerts-count"] });
    },
  });
}

export function useCreateFinancialAlert() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alert: Omit<FinancialAlert, "id" | "company_id" | "created_at" | "is_read" | "is_dismissed" | "read_at" | "dismissed_at">) => {
      if (!company?.id) throw new Error("Company not found");

      const { data, error } = await supabase
        .from("erp_financial_alerts")
        .insert({
          ...alert,
          company_id: company.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-alerts-count"] });
    },
  });
}
