import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
 
export interface DoughType {
  id: string;
  name: string;
  active: boolean;
}
 
const LS_KEY = "zoopi_dough_types";
 
function readLocal(): DoughType[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DoughType[];
  } catch {
    return [];
  }
}
 
function writeLocal(list: DoughType[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}
 
export function useDoughTypes() {
  const qc = useQueryClient();
 
  const listQuery = useQuery({
    queryKey: ["dough-types"],
    queryFn: async () => readLocal(),
    staleTime: 1000 * 30,
  });
 
  const createType = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome obrigatório");
      const current = readLocal();
      if (current.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error("Tipo de massa já existe");
      }
      const type: DoughType = {
        id: `dough-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        active: true,
      };
      writeLocal([type, ...current]);
      return type;
    },
    onSuccess: () => {
      qc.setQueryData<DoughType[]>(["dough-types"], readLocal());
      toast.success("Tipo de massa criado");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao criar tipo de massa");
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
      qc.setQueryData<DoughType[]>(["dough-types"], readLocal());
      toast.success("Tipo de massa removido");
    },
    onError: () => {
      toast.error("Erro ao remover tipo de massa");
    },
  });
 
  return {
    doughTypes: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createType,
    deleteType,
  };
}
