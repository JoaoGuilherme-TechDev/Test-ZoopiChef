import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { useTables } from './useTables';
import { useTableSessions } from './useTableSessions';
import { useTodayTableReservations } from './useTableReservations';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef } from 'react';
import { mapSmartWaitlistEntryToFrontend, mapSmartWaitlistEntryToBackend, WaitlistEntry } from './useSmartWaitlist';

export interface AvailableTable {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
}

export function useWaiterWaitlist() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const { tables } = useTables();
  const { sessions } = useTableSessions();
  const { hasReservation } = useTodayTableReservations();
  const notifiedEntriesRef = useRef<Set<string>>(new Set());

  // Fetch active waitlist entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waiter-waitlist', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const response = await api.get('/reservations/smart-waitlist', {
        params: { companyId: company.id }
      });
      
      const allEntries = (response.data || []).map(mapSmartWaitlistEntryToFrontend);
      
      // Filter for waiting and notified statuses
      // Backend returns sorted by priority score, but we also need to respect that order
      return allEntries.filter((e: WaitlistEntry) => ['waiting', 'notified'].includes(e.status));
    },
    enabled: !!company?.id,
    refetchInterval: 15000, // Poll every 15s as backup
  });

  // Calculate available tables (not occupied, not reserved, with capacity)
  const availableTables: AvailableTable[] = tables
    .filter((t) => t.active)
    .filter((t) => {
      // Check if table has an active session
      const hasSession = sessions.some((s) => s.table_id === t.id);
      if (hasSession) return false;
      
      // Check if table has a reservation for today
      if (hasReservation(t.id)) return false;
      
      return true;
    })
    .map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: (t as any).capacity || 4, // Default capacity if not set
    }));

  // Find matching available table for a party size (FIFO with capacity match)
  const findMatchingTable = useCallback(
    (partySize: number): AvailableTable | null => {
      // Find smallest table that fits the party
      const matchingTables = availableTables
        .filter((t) => t.capacity >= partySize)
        .sort((a, b) => a.capacity - b.capacity);
      return matchingTables[0] || null;
    },
    [availableTables]
  );

  // Get next entry in queue that can be seated
  const getNextSeatable = useCallback((): {
    entry: WaitlistEntry;
    table: AvailableTable;
  } | null => {
    for (const entry of entries) {
      if (entry.status === 'waiting' || entry.status === 'notified') {
        const table = findMatchingTable(entry.party_size);
        if (table) {
          return { entry, table };
        }
      }
    }
    return null;
  }, [entries, findMatchingTable]);

  // Check for table availability and notify
  useEffect(() => {
    const next = getNextSeatable();
    if (next && next.entry.status === 'waiting') {
      // Only notify if we haven't notified this entry already in this session
      if (!notifiedEntriesRef.current.has(next.entry.id)) {
        notifiedEntriesRef.current.add(next.entry.id);
        toast.info(
          `Mesa ${next.table.number} disponível para ${next.entry.customer_name} (${next.entry.party_size} pessoas)`,
          {
            duration: 10000,
            action: {
              label: 'Chamar',
              onClick: () => notifyCustomer.mutate(next.entry.id),
            },
          }
        );
      }
    }
  }, [getNextSeatable]);

  // Add to waitlist with WhatsApp notification
  const addToWaitlist = useMutation({
    mutationFn: async (entry: {
      customer_name: string;
      customer_phone?: string;
      party_size: number;
      special_requests?: string;
      table_preference?: string;
    }) => {
      console.log('[Waitlist] ========= ADD TO WAITLIST START =========');
      
      // Validate name (minimum 2 characters)
      if (!entry.customer_name || entry.customer_name.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres');
      }
      
      // Validate party size
      if (!entry.party_size || entry.party_size < 1 || entry.party_size > 10) {
        throw new Error('Número de pessoas deve ser entre 1 e 10');
      }
      
      if (!company?.id) {
        throw new Error('Empresa não encontrada. Faça login novamente.');
      }
      
      // Check for duplicate names in current waitlist (using cached data)
      const duplicate = entries.find(e => 
        e.customer_name.trim().toLowerCase() === entry.customer_name.trim().toLowerCase() &&
        ['waiting', 'notified'].includes(e.status)
      );
      
      if (duplicate) {
        throw new Error(`Cliente "${entry.customer_name}" já está na fila`);
      }
      
      const payload = mapSmartWaitlistEntryToBackend({
        ...entry,
        status: 'waiting',
        company_id: company.id,
      });
      
      console.log('[Waitlist] Payload:', payload);
      
      const response = await api.post('/reservations/smart-waitlist', payload);
      const data = response.data;
      
      console.log('[Waitlist] Database Insert Success:', data);
      
      // Send WhatsApp notification if phone provided
      if (entry.customer_phone) {
        console.log('[Waitlist] Attempting WhatsApp notification for phone:', entry.customer_phone);
        try {
          // TODO: Migrate WhatsApp notification to backend
          console.log('WhatsApp notification logic pending migration to backend service');
        } catch (waError) {
          console.error('[Waitlist] WhatsApp Error (non-fatal):', waError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Cliente adicionado à fila');
      queryClient.invalidateQueries({ queryKey: ['waiter-waitlist'] });
    },
    onError: (error: any) => {
      console.error('[Waitlist] Mutation Error:', error);
      toast.error(error.message || 'Erro ao adicionar à fila');
    },
  });

  // Notify customer (set status to notified)
  const notifyCustomer = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/reservations/smart-waitlist/${id}`, {
        status: 'notified',
        notifiedAt: new Date().toISOString(),
      });
      
      // TODO: Trigger WhatsApp notification via backend
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-waitlist'] });
      toast.success('Cliente notificado');
    },
    onError: (e: Error) => toast.error('Erro ao notificar: ' + e.message),
  });

  // Seat customer with atomic table assignment
  const seatCustomer = useMutation({
    mutationFn: async ({ 
      waitlistId, 
      tableId 
    }: { 
      waitlistId: string; 
      tableId: string;
    }) => {
      if (!company?.id) throw new Error('No company');
      
      const response = await api.post(`/reservations/smart-waitlist/${waitlistId}/seat`, {
        tableId
      });
      
      const data = response.data;
      
      // Map backend response to frontend expectations
      const result = {
        success: data.success,
        table_number: data.tableNumber,
        table_name: data.tableName, // Might be undefined if not returned
        customer_name: data.customerName,
        session_id: data.sessionId,
        comanda_id: data.comandaId,
        command_number: data.commandNumber,
      };
      
      // Send WhatsApp notification about table ready
      // TODO: Migrate to backend
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['waiter-waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      toast.success(`${result.customer_name || 'Cliente'} acomodado na mesa ${result.table_number} - Comanda #${result.command_number} criada`);
    },
    onError: (e: any) => {
      toast.error('Erro: ' + (e.response?.data?.message || e.message));
    },
  });

  // Cancel / skip entry
  const cancelEntry = useMutation({
    mutationFn: async ({ id, noShow }: { id: string; noShow?: boolean }) => {
      await api.patch(`/reservations/smart-waitlist/${id}`, {
        status: noShow ? 'no_show' : 'cancelled',
        noShow: noShow || false,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['waiter-waitlist'] });
      toast.success(vars.noShow ? 'Marcado como não compareceu' : 'Entrada cancelada');
    },
    onError: (e: Error) => toast.error('Erro: ' + e.message),
  });

  // Update entry
  const updateEntry = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Pick<WaitlistEntry, 'party_size' | 'customer_phone' | 'special_requests'>>) => {
      const payload = mapSmartWaitlistEntryToBackend({
        ...updates,
        company_id: company?.id,
      });
      // Remove company_id from payload as we only want to update fields
      delete (payload as any).company_id;
      
      await api.patch(`/reservations/smart-waitlist/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiter-waitlist'] });
    },
  });

  return {
    entries,
    isLoading,
    availableTables,
    nextSeatable: getNextSeatable(),
    addToWaitlist,
    notifyCustomer,
    seatCustomer,
    cancelEntry,
    updateEntry,
    findMatchingTable,
  };
}
