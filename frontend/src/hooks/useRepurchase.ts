import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from "./useProfile";
import { toast } from "@/hooks/use-toast";

export interface RepurchaseSuggestion {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  product_ids: string[];
  product_names: string[];
  predicted_products: { id: string; name: string; count: number; probability: number }[];
  message_template: string;
  channel: string;
  send_window_start: string;
  send_window_end: string;
  confidence: string;
  ai_reason: string | null;
  days_since_last_order: number | null;
  avg_order_frequency: number | null;
  preferred_hour: number | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useRepurchaseSuggestions() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["repurchase-suggestions", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("repurchase_suggestions")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RepurchaseSuggestion[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useAnalyzeRepurchase() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (daysThreshold: number = 7) => {
      if (!profile?.company_id) throw new Error("No company");

      const { data, error } = await supabase.functions.invoke("ai-repurchase", {
        body: { company_id: profile.company_id, action: "analyze", days_threshold: daysThreshold },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions"] });
      toast({
        title: "Análise concluída",
        description: data.message || `${data.suggestions || 0} sugestões geradas`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSendRepurchase() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!profile?.company_id) throw new Error("No company");

      const { data, error } = await supabase.functions.invoke("ai-repurchase", {
        body: { company_id: profile.company_id, action: "send", suggestion_id: suggestionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions"] });
      toast({ title: "Mensagem enviada" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useSendAllRepurchase() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      if (!profile?.company_id) throw new Error("No company");

      const results = await Promise.allSettled(
        suggestionIds.map(async (id) => {
          const { data, error } = await supabase.functions.invoke("ai-repurchase", {
            body: { company_id: profile.company_id, action: "send", suggestion_id: id },
          });
          if (error) throw error;
          return data;
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;
      
      return { successCount, failCount, total: suggestionIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions"] });
      toast({ 
        title: "Envio em lote concluído",
        description: `${data.successCount} enviadas com sucesso${data.failCount > 0 ? `, ${data.failCount} falharam` : ''}`
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar em lote",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateRepurchaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("repurchase_suggestions")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions"] });
      toast({ title: "Status atualizado" });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteRepurchaseSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repurchase_suggestions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions"] });
      toast({ title: "Sugestão removida" });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRepurchaseStats() {
  const { data: suggestions } = useRepurchaseSuggestions();

  return {
    total: suggestions?.length || 0,
    pending: suggestions?.filter((s) => s.status === "pending").length || 0,
    sent: suggestions?.filter((s) => s.status === "sent").length || 0,
    dismissed: suggestions?.filter((s) => s.status === "dismissed").length || 0,
    highConfidence: suggestions?.filter((s) => s.confidence === "high").length || 0,
  };
}
