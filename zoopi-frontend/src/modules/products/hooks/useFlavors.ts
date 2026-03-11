import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface FlavorSizePrice {
  sizeId: string;
  price: string;
}

export interface FlavorInput {
  name: string;
  group?: string;
  description?: string;
  ingredients?: string;
  sizes: FlavorSizePrice[];
  type: 'pizza' | 'border';
}

export interface Flavor extends FlavorInput {
  id: string;
}

const LS_KEY = "zoopi_flavors";

function readLocal(): Flavor[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Flavor[];
  } catch {
    return [];
  }
}

function writeLocal(list: Flavor[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

export function useFlavors() {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["flavors"],
    queryFn: async () => {
      return readLocal();
    },
    staleTime: 1000 * 30,
  });

  const createFlavor = useMutation({
    mutationFn: async (payload: FlavorInput) => {
      const localFlavor: Flavor = {
        id: `flavor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...payload,
      };
      const current = readLocal();
      const next = [localFlavor, ...current];
      writeLocal(next);
      return localFlavor;
    },
    onSuccess: (created) => {
      qc.setQueryData<Flavor[]>(["flavors"], (old) => {
        const prev = old ?? [];
        const localList = readLocal();
        const merged = [created, ...prev.filter(f => f.id !== created.id)];
        if (created.id.startsWith("local-")) writeLocal([created, ...localList]);
        return merged;
      });
      toast.success("Sabor criado com sucesso");
    },
    onError: () => {
      toast.error("Não foi possível criar o sabor");
    },
  });

  const updateFlavors = (updater: (prev: Flavor[]) => Flavor[]) => {
    const current = readLocal();
    const next = updater(current);
    writeLocal(next);
    qc.setQueryData<Flavor[]>(["flavors"], next);
  };

  const updateFlavor = useMutation({
    mutationFn: async (payload: { id: string; data: FlavorInput }) => {
      const current = readLocal();
      const next = current.map((f) => (f.id === payload.id ? { ...payload.data, id: f.id } : f));
      writeLocal(next);
      return payload.id;
    },
    onSuccess: () => {
      qc.setQueryData<Flavor[]>(["flavors"], readLocal());
      toast.success("Sabor atualizado");
    },
    onError: () => {
      toast.error("Não foi possível atualizar o sabor");
    },
  });

  const deleteFlavor = useMutation({
    mutationFn: async (id: string) => {
      const current = readLocal();
      const next = current.filter((f) => f.id !== id);
      writeLocal(next);
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<Flavor[]>(["flavors"], (old) => {
        const prev = old ?? [];
        return prev.filter((f) => f.id !== id);
      });
      toast.success("Sabor removido");
    },
    onError: () => {
      toast.error("Não foi possível remover o sabor");
    },
  });

  return {
    flavors: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createFlavor,
    updateFlavors,
    updateFlavor,
    deleteFlavor,
  };
}
