import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import { useProfile } from "./useProfile";
import { toast } from "@/hooks/use-toast";
import { useUpdateConfidenceOnAction, type Module } from "./useConfidenceScores";

export interface Campaign {
  id: string;
  company_id: string;
  type: string;
  audience_rule: string;
  audience_count: number;
  product_ids: string[];
  message_template: string;
  cta: string | null;
  channel: string;
  send_window_start: string;
  send_window_end: string;
  confidence: string;
  status: string;
  ai_reason: string | null;
  scheduled_for: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  message_text: string;
  channel: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CampaignSettings {
  company_id: string;
  enabled: boolean;
  whatsapp_provider: string | null;
  whatsapp_api_key: string | null;
  whatsapp_instance_id: string | null;
  send_window_start: string;
  send_window_end: string;
  max_messages_per_customer_per_day: number;
  days_inactive_trigger: number;
}

export function useCampaigns() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["campaigns", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!profile?.company_id,
  });
}

export function useCampaignMessages(campaignId?: string) {
  return useQuery({
    queryKey: ["campaign-messages", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("campaign_messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CampaignMessage[];
    },
    enabled: !!campaignId,
  });
}

export function useCampaignSettings() {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["campaign-settings", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("campaign_settings")
        .select("*")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error) throw error;
      return data as CampaignSettings | null;
    },
    enabled: !!profile?.company_id,
  });
}

export function useUpdateCampaignSettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (settings: Partial<CampaignSettings>) => {
      if (!profile?.company_id) throw new Error("No company");

      const { data: existing } = await supabase
        .from("campaign_settings")
        .select("company_id")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("campaign_settings")
          .update(settings)
          .eq("company_id", profile.company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_settings")
          .insert({ company_id: profile.company_id, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-settings"] });
      toast({ title: "Configurações salvas" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAnalyzeCampaigns() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("No company");

      const { data, error } = await supabase.functions.invoke("ai-campaigns", {
        body: { company_id: profile.company_id, action: "analyze" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      
      if (data.campaigns?.length === 0 || data.message?.includes("No customers")) {
        toast({
          title: "Análise concluída",
          description: "Nenhum cliente elegível para campanhas. Cadastre clientes para gerar campanhas.",
        });
      } else {
        toast({
          title: "Análise concluída",
          description: data.message || `${data.campaigns?.length || 0} campanhas sugeridas`,
        });
      }
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

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const updateConfidence = useUpdateConfidenceOnAction();

  return useMutation({
    mutationFn: async ({ id, status, campaignType }: { id: string; status: string; campaignType?: string }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      
      // Update confidence score based on action
      if (campaignType && (status === "approved" || status === "cancelled")) {
        updateConfidence.mutate({
          module: "gestora" as Module,
          suggestionType: `campaign_${campaignType}`,
          action: status === "approved" ? "applied" : "dismissed",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campanha atualizada" });
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

export function useExecuteCampaign() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      if (!profile?.company_id) throw new Error("No company");

      // First approve the campaign
      await supabase
        .from("campaigns")
        .update({ status: "approved" })
        .eq("id", campaignId);

      // Then execute
      const { data, error } = await supabase.functions.invoke("ai-campaigns", {
        body: { company_id: profile.company_id, action: "execute", campaign_id: campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-messages"] });
      toast({
        title: "Campanha executada",
        description: data.message || "Mensagens prontas para envio",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na execução",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCampaignStats() {
  const { data: campaigns } = useCampaigns();

  const stats = {
    total: campaigns?.length || 0,
    pending: campaigns?.filter((c) => c.status === "pending").length || 0,
    completed: campaigns?.filter((c) => c.status === "completed").length || 0,
    totalAudience: campaigns?.reduce((sum, c) => sum + c.audience_count, 0) || 0,
  };

  return stats;
}
