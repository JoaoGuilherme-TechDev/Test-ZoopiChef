import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface TableSession {
  id: string;
  company_id: string;
  table_id: string;
  status: 'open' | 'idle_warning' | 'bill_requested' | 'closed';
  opened_at: string;
  last_activity_at: string;
  closed_at: string | null;
  total_amount_cents: number;
  notes: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  people_count: number | null;
  weather_note: string | null;
  created_at: string;
  updated_at: string;
  table?: {
    id: string;
    number: number;
    name: string | null;
  };
}

export const mapSessionToFrontend = (data: any): TableSession => ({
  id: data.id,
  company_id: data.companyId,
  table_id: data.tableId,
  status: data.status,
  opened_at: data.openedAt,
  last_activity_at: data.lastActivityAt,
  closed_at: data.closedAt,
  total_amount_cents: Math.round((Number(data.totalAmount) || 0) * 100),
  notes: data.notes,
  customer_name: data.customerName,
  customer_phone: data.customerPhone,
  people_count: data.peopleCount,
  weather_note: data.weatherNote,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  table: data.table ? {
    id: data.table.id,
    number: data.table.number,
    name: data.table.name
  } : undefined
});

export const mapSessionToBackend = (data: Partial<TableSession>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.table_id !== undefined) mapped.tableId = data.table_id;
  if (data.status !== undefined) mapped.status = data.status;
  if (data.opened_at !== undefined) mapped.openedAt = data.opened_at;
  if (data.last_activity_at !== undefined) mapped.lastActivityAt = data.last_activity_at;
  if (data.closed_at !== undefined) mapped.closedAt = data.closed_at;
  if (data.total_amount_cents !== undefined) mapped.totalAmount = data.total_amount_cents / 100;
  if (data.notes !== undefined) mapped.notes = data.notes;
  if (data.customer_name !== undefined) mapped.customerName = data.customer_name;
  if (data.customer_phone !== undefined) mapped.customerPhone = data.customer_phone;
  if (data.people_count !== undefined) mapped.peopleCount = data.people_count;
  if (data.weather_note !== undefined) mapped.weatherNote = data.weather_note;
  return mapped;
};

export function useTableSessions() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['table-sessions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const response = await api.get('/table-sessions', {
        params: { 
          companyId: company.id,
          active: 'true'
        }
      });

      return (response.data || []).map(mapSessionToFrontend);
    },
    enabled: !!company?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for idle detection
  });

  const openTable = useMutation({
    mutationFn: async ({ 
      tableId, 
      customerName, 
      customerPhone, 
      peopleCount 
    }: { 
      tableId: string; 
      customerName?: string; 
      customerPhone?: string; 
      peopleCount?: number;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post('/table-sessions/open', {
        companyId: company.id,
        tableId,
        customerName,
        customerPhone,
        peopleCount
      });

      return mapSessionToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa aberta com sucesso!');
    },
    onError: (error) => {
      console.error('Error opening table:', error);
      toast.error('Erro ao abrir mesa');
    },
  });

  const updateSessionStatus = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: TableSession['status'] }) => {
      const updates: any = { status };
      if (status === 'closed') {
        updates.closedAt = new Date().toISOString();
      }
      
      const payload = mapSessionToBackend(updates);
      const response = await api.patch(`/table-sessions/${sessionId}`, payload);
      return mapSessionToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const updateLastActivity = useMutation({
    mutationFn: async (sessionId: string) => {
      const payload = { lastActivityAt: new Date().toISOString() };
      const response = await api.patch(`/table-sessions/${sessionId}`, payload);
      return mapSessionToFrontend(response.data);
    },
  });

  const updateSessionTotal = useMutation({
    mutationFn: async ({ sessionId, totalCents }: { sessionId: string; totalCents: number }) => {
      const payload = { totalAmount: totalCents / 100 };
      const response = await api.patch(`/table-sessions/${sessionId}`, payload);
      return mapSessionToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
    },
  });

  const requestBill = useMutation({
    mutationFn: async (sessionId: string) => {
      const payload = { status: 'bill_requested' };
      const response = await api.patch(`/table-sessions/${sessionId}`, payload);
      return mapSessionToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      toast.success('Conta solicitada');
    },
  });

  const reopenTable = useMutation({
    mutationFn: async (sessionId: string) => {
      const payload = { 
        status: 'open',
        closedAt: null 
      };
      const response = await api.patch(`/table-sessions/${sessionId}`, payload);
      return mapSessionToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa reaberta');
    },
  });

  // Get session by table ID
  const getSessionByTableId = (tableId: string) => {
    return sessions.find(s => s.table_id === tableId);
  };

  return {
    sessions,
    activeSessions: sessions.filter(s => s.status !== 'closed'),
    isLoading,
    error,
    openTable,
    updateSessionStatus,
    updateLastActivity,
    updateSessionTotal,
    requestBill,
    reopenTable,
    getSessionByTableId,
  };
}
