import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Table {
  id: string;
  company_id: string;
  number: number;
  name: string | null;
  active: boolean;
  status: 'available' | 'occupied' | 'reserved';
  current_order_id: string | null;
  capacity: number;
  created_at: string;
  updated_at: string;
}

export interface TableEvent {
  id: string;
  company_id: string;
  table_id: string;
  event_type: 'call_waiter' | 'ask_bill' | 'order_placed' | 'table_opened' | 'table_closed';
  status: 'pending' | 'acknowledged' | 'resolved';
  notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const mapTableToFrontend = (data: any): Table => ({
  id: data.id,
  company_id: data.companyId,
  number: data.number,
  name: data.name,
  active: data.active,
  status: data.status,
  current_order_id: data.currentOrderId,
  capacity: data.capacity,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

const mapTableToBackend = (data: Partial<Table>): any => ({
  companyId: data.company_id,
  number: data.number,
  name: data.name,
  active: data.active,
  status: data.status,
  currentOrderId: data.current_order_id,
  capacity: data.capacity,
});

const mapTableEventToFrontend = (data: any): TableEvent & { table: { number: number; name: string | null } } => ({
  id: data.id,
  company_id: data.companyId,
  table_id: data.tableId,
  event_type: data.eventType,
  status: data.status,
  notes: data.notes,
  created_at: data.createdAt,
  resolved_at: data.resolvedAt,
  table: data.table ? {
    number: data.table.number,
    name: data.table.name,
  } : { number: 0, name: '' },
});

export function useTables() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading, error } = useQuery({
    queryKey: ['tables', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data } = await api.get(`/tables?companyId=${company.id}`);
      return data.map(mapTableToFrontend);
    },
    enabled: !!company?.id,
  });

  // Realtime subscription replaced by polling or simple invalidation for now
  // Ideally we would use a WebSocket here
  // For now, let's poll every 30 seconds to keep sync roughly
  /* 
  useEffect(() => {
     // ... realtime logic ...
  }, []);
  */

  const createTable = useMutation({
    mutationFn: async (table: { number: number; name?: string }) => {
      if (!company?.id) throw new Error('No company');
      
      const payload = { ...table, companyId: company.id };
      const { data } = await api.post('/tables', payload);
      return mapTableToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar mesa: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const updateTable = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Table> & { id: string }) => {
      const payload = mapTableToBackend(updates);
      const { data } = await api.patch(`/tables/${id}`, payload);
      return mapTableToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar mesa: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover mesa: ' + (error.message || 'Erro desconhecido'));
    },
  });

  return {
    tables,
    activeTables: tables.filter((t) => t.active),
    isLoading,
    error,
    createTable,
    updateTable,
    deleteTable,
  };
}

export function useTableEvents() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['table-events', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data } = await api.get(`/table-events?companyId=${company.id}&status=pending`);
      return data.map(mapTableEventToFrontend);
    },
    enabled: !!company?.id,
    refetchInterval: 15000, // Poll every 15s for new events
  });

  const createEvent = useMutation({
    mutationFn: async (event: { table_id: string; event_type: TableEvent['event_type']; notes?: string; company_id: string }) => {
      const payload = {
        companyId: event.company_id,
        tableId: event.table_id,
        eventType: event.event_type,
        notes: event.notes,
      };
      const { data } = await api.post('/table-events', payload);
      return mapTableEventToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-events'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar evento: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const resolveEvent = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/table-events/${id}/resolve`, {});
      return mapTableEventToFrontend(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-events'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao resolver evento: ' + (error.message || 'Erro desconhecido'));
    },
  });

  return {
    events,
    pendingEvents: events.filter((e) => e.status === 'pending'),
    isLoading,
    createEvent,
    resolveEvent,
  };
}
