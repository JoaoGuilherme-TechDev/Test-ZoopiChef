import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useCompany } from "@/hooks/useCompany";
import { useEffect } from "react";

export interface SelfServiceEntry {
  id: string;
  company_id: string;
  comanda_id: string | null;
  table_id: string | null;
  product_name: string;
  weight_kg: number;
  price_per_kg: number;
  total_value: number;
  barcode: string | null;
  created_at: string;
  created_by: string | null;
  comanda?: {
    command_number: number;
  } | null;
  table?: {
    number: number;
  } | null;
}

export function useSelfServiceEntries(limit = 10) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["self-service-entries", company?.id, limit],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("self_service_entries")
        .select(`
          *,
          comanda:comandas(command_number),
          table:tables(number)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as SelfServiceEntry[];
    },
    enabled: !!company?.id,
  });

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const channel = supabase
      .channel("self-service-entries-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "self_service_entries",
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["self-service-entries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, queryClient]);

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateSelfServiceEntry() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      comanda_id?: string | null;
      table_id?: string | null;
      product_name: string;
      weight_kg: number;
      price_per_kg: number;
      total_value: number;
      barcode?: string | null;
    }) => {
      if (!company?.id) throw new Error("Company not found");

      const { data, error } = await supabase
        .from("self_service_entries")
        .insert({
          company_id: company.id,
          comanda_id: entry.comanda_id || null,
          table_id: entry.table_id || null,
          product_name: entry.product_name,
          weight_kg: entry.weight_kg,
          price_per_kg: entry.price_per_kg,
          total_value: entry.total_value,
          barcode: entry.barcode || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["self-service-entries"] });
    },
  });
}

export function useDeleteSelfServiceEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("self_service_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["self-service-entries"] });
    },
  });
}
