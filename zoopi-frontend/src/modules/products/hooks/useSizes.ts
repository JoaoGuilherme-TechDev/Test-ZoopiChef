import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SizeInput {
  name: string;
  basePrice: string;
  slices: number;
  maxFlavors: number;
}

export interface Size extends SizeInput {
  id: string;
}

const LS_KEY = "zoopi_sizes";

function readLocalSizes(): Size[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Size[];
  } catch {
    return [];
  }
}

function writeLocalSizes(list: Size[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {}
}

export function useSizes() {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["sizes"],
    queryFn: async () => {
      return readLocalSizes();
    },
    staleTime: 0,
  });

  const createSize = useMutation({
    mutationFn: async (payload: SizeInput) => {
      const current = readLocalSizes();
      const exists = current.some(
        (s) => s.name.trim().toLowerCase() === payload.name.trim().toLowerCase()
      );
      if (exists) {
        const error = new Error("DUPLICATE_NAME");
        throw error;
      }
      const size: Size = {
        id: `size-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...payload,
      };
      const next = [size, ...current];
      writeLocalSizes(next);
      return size;
    },
    onSuccess: (created) => {
      qc.setQueryData<Size[]>(["sizes"], (old) => {
        const prev = old ?? [];
        return [created, ...prev.filter((s) => s.id !== created.id)];
      });
    },
  });

  const deleteSize = useMutation({
    mutationFn: async (id: string) => {
      const current = readLocalSizes();
      const next = current.filter((s) => s.id !== id);
      writeLocalSizes(next);
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<Size[]>(["sizes"], (old) => {
        const prev = old ?? [];
        return prev.filter((s) => s.id !== id);
      });
    },
  });

  const updateSizes = (updater: (prev: Size[]) => Size[]) => {
    const current = readLocalSizes();
    const next = updater(current);
    writeLocalSizes(next);
    qc.setQueryData<Size[]>(["sizes"], next);
  };

  return {
    sizes: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createSize,
    deleteSize,
    updateSizes,
  };
}

