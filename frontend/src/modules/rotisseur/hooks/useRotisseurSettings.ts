import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase-shim';
import type { RotisseurSettings } from "../types";

export function useRotisseurSettingsPublic(companyId: string | undefined) {
  return useQuery({
    queryKey: ["rotisseur-settings-public", companyId],
    queryFn: async (): Promise<RotisseurSettings | null> => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("rotisseur_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching rotisseur settings:", error);
        return null;
      }

      if (!data) {
        // Return default settings if none configured
        return {
          company_id: companyId,
          is_enabled: false,
          welcome_title: "Maître Rôtisseur",
          welcome_subtitle: "Seu especialista em carnes",
          welcome_description: "Deixe-me ajudá-lo a escolher os melhores cortes para sua ocasião",
          primary_color: "#8B0000",
          accent_color: "#D4AF37",
          meat_category_ids: [],
          accompaniment_category_ids: [],
          extra_category_ids: [],
          beverage_category_ids: [],
          ai_personality: "friendly",
        };
      }

      return {
        company_id: data.company_id,
        is_enabled: data.is_enabled ?? false,
        welcome_title: data.welcome_title ?? "Maître Rôtisseur",
        welcome_subtitle: data.welcome_subtitle ?? "Seu especialista em carnes",
        welcome_description: data.welcome_description ?? "Deixe-me ajudá-lo a escolher os melhores cortes",
        primary_color: data.primary_color ?? "#8B0000",
        accent_color: data.accent_color ?? "#D4AF37",
        logo_url: data.logo_url ?? undefined,
        meat_category_ids: data.meat_category_ids ?? [],
        accompaniment_category_ids: data.accompaniment_category_ids ?? [],
        extra_category_ids: data.extra_category_ids ?? [],
        beverage_category_ids: data.beverage_category_ids ?? [],
        ai_personality: (data.ai_personality as 'formal' | 'friendly' | 'expert') ?? "friendly",
      };
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
