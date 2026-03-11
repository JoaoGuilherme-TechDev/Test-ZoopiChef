import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

export type FinancialSeverity = "critical" | "warning" | "info";

export interface FinancialAlert {
  id: string;
  title: string;
  message: string;
  severity: FinancialSeverity;
  alert_type: string;
  is_read: boolean;
  created_at: string;
}

const QUERY_KEY = ["financial-alerts"];
const LS_KEY = "zoopi_financial_alerts";

function readLocal(): FinancialAlert[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FinancialAlert[];
  } catch {
    return [];
  }
}

function writeLocal(alerts: FinancialAlert[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

export function useFinancialAlerts() {
  return useQuery<FinancialAlert[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await api.get("/finance/alerts");
        const data = res.data as FinancialAlert[];
        writeLocal(data);
        return data;
      } catch {
        return readLocal();
      }
    },
    initialData: readLocal(),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.post(`/finance/alerts/${id}/read`);
      } catch {
        const current = (qc.getQueryData(QUERY_KEY) as FinancialAlert[] | undefined) ?? readLocal();
        const updated = current.map((a) => (a.id === id ? { ...a, is_read: true } : a));
        writeLocal(updated);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Alerta marcado como lido");
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.post(`/finance/alerts/${id}/dismiss`);
      } catch {
        const current = (qc.getQueryData(QUERY_KEY) as FinancialAlert[] | undefined) ?? readLocal();
        const updated = current.filter((a) => a.id !== id);
        writeLocal(updated);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Alerta descartado");
    },
  });
}
