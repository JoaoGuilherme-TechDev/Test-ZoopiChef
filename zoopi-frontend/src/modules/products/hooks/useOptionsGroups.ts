/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface OptionItem {
  id?: string;
  name: string;
  price: string;
  active: boolean;
  order: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  min_qty: number;
  max_qty: number;
  active: boolean;
  items: OptionItem[];
}

export function useOptionsGroups() {
  const queryClient = useQueryClient();

  // 1. Busca todos os grupos da empresa
  const groupsQuery = useQuery({
    queryKey: ["options-groups"],
    queryFn: async () => {
      const response = await api.get<any[]>("/options-groups");
      return response.data.map((group) => ({
        ...group,
        active: (group.items || []).some(
          (item: any) => item.active !== false
        ),
      })) as OptionGroup[];
    },
  });

  // 2. Criar Grupo (incluindo itens)
  const createGroup = useMutation({
    mutationFn: async (data: any) => {
      return api.post("/options-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["options-groups"] });
    },
  });

  // 3. Atualizar Grupo
  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return api.patch(`/options-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["options-groups"] });
    },
  });

  // 4. Deletar Grupo
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/options-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["options-groups"] });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
  };
}
