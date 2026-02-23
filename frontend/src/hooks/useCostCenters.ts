import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from "./useCompany";

export interface CostCenter {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCostCenters() {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ["cost-centers", company?.id],
    queryFn: async (): Promise<CostCenter[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });
}
