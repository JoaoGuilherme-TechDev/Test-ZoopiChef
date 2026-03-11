import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
 
export interface BorderType {
  id: string;
  name: string;
  active: boolean;
}
 
const LS_KEY = "zoopi_border_types";
 
function readLocal(): BorderType[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BorderType[];
  } catch {
    return [];
  }
}
 
function writeLocal(list: BorderType[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}
 
export function useBorderTypes() {
  const qc = useQueryClient();
 
  const listQuery = useQuery({
    queryKey: ["border-types"],
    queryFn: async () => readLocal(),
    staleTime: 1000 * 30,
  });
 
  const createType = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      const current = readLocal();
      if (current.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error("Tipo de borda já existe");
      }
      const type: BorderType = {
        id: `border-type-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        active: true,
      };
      writeLocal([type, ...current]);
      return type;
    },
    onSuccess: () => {
      qc.setQueryData<BorderType[]>(["border-types"], readLocal());
      toast.success("Tipo de borda criado");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao criar tipo de borda");
    },
  });
 
  const deleteType = useMutation({
    mutationFn: async (id: string) => {
      const current = readLocal();
      const next = current.filter((t) => t.id !== id);
      writeLocal(next);
      return id;
    },
    onSuccess: () => {
      qc.setQueryData<BorderType[]>(["border-types"], readLocal());
      toast.success("Tipo de borda removido");
    },
    onError: () => {
      toast.error("Erro ao remover tipo de borda");
    },
  });
 
  return {
    borderTypes: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createType,
    deleteType,
  };
}
