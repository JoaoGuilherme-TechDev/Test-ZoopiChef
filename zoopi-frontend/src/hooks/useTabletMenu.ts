import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface TabletMenu {
  company: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  };
  categories: {
    id: string;
    name: string;
    image_url: string | null;
    subcategories: {
      id: string;
      name: string;
      products: {
        id: string;
        name: string;
        description: string | null;
        image_url: string | null;
        prices: {
          id: string;
          label: string;
          price: string;
        }[];
      }[];
    }[];
  }[];
}

export function useTabletMenu(slug: string | undefined) {
  return useQuery({
    queryKey: ["tablet-menu", slug],
    queryFn: async () => {
      if (!slug) return null;
      try {
        // Chama o endpoint público do seu backend NestJS
        const response = await api.get<TabletMenu>(`/public/company/${slug}/menu`);
        return response.data;
      } catch (error) {
        console.error("Erro ao buscar cardápio do tablet:", error);
        throw error;
      }
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos para o cardápio
    retry: 1, // Tenta novamente uma vez em caso de erro
  });
}