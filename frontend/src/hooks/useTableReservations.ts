import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { format, parse, isAfter, isBefore, addMinutes } from 'date-fns';
import { mapReservationToFrontend } from './useReservations';

export interface TableReservation {
  id: string;
  company_id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_cpf: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reservation_reason: string | null;
  reservation_reason_other: string | null;
  needs_wheelchair_access: boolean;
  needs_disability_access: boolean;
  needs_baby_chair: boolean;
  other_needs: string | null;
  notes: string | null;
  special_requests: string | null;
  created_at: string;
  table?: { id: string; number: number; name: string | null };
}

// Hook to get today's reservations for tables
export function useTodayTableReservations() {
  const { data: company } = useCompany();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: reservations = [], isLoading, refetch } = useQuery({
    queryKey: ['today-table-reservations', company?.id, today],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get('/reservations', {
        params: {
          companyId: company.id,
          startDate: today,
          endDate: today
        }
      });

      const allReservations = (response.data || []).map(mapReservationToFrontend);
      
      // Filter for active statuses only
      return allReservations.filter((r: any) => 
        ['pending', 'confirmed'].includes(r.status)
      ) as TableReservation[];
    },
    enabled: !!company?.id,
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 60, // OTIMIZAÇÃO: 60 segundos (era 30s)
    refetchOnWindowFocus: false,
  });

  // Get reservations grouped by table_id
  const reservationsByTable = reservations.reduce((acc, res) => {
    if (res.table_id) {
      if (!acc[res.table_id]) {
        acc[res.table_id] = [];
      }
      acc[res.table_id].push(res);
    }
    return acc;
  }, {} as Record<string, TableReservation[]>);

  // Get the active/next reservation for a table (considering time window)
  const getActiveReservation = (tableId: string): TableReservation | null => {
    const tableReservations = reservationsByTable[tableId] || [];
    if (tableReservations.length === 0) return null;

    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    // Find a reservation that is currently active or upcoming within 30 minutes
    for (const res of tableReservations) {
      const resTime = res.reservation_time.slice(0, 5); // HH:mm
      const resDateTime = parse(`${res.reservation_date} ${resTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const endTime = addMinutes(resDateTime, res.duration_minutes || 120);
      
      // Reservation is active if current time is within the reservation window
      // Or if it's upcoming within 30 minutes
      const startWindow = addMinutes(resDateTime, -30);
      
      if (isAfter(now, startWindow) && isBefore(now, endTime)) {
        return res;
      }
    }

    // If no active reservation, return the next one
    return tableReservations[0] || null;
  };

  // Check if a table has a reservation (pending or confirmed) for today
  const hasReservation = (tableId: string): boolean => {
    return (reservationsByTable[tableId]?.length || 0) > 0;
  };

  // Get all reservations for a specific table
  const getReservationsForTable = (tableId: string): TableReservation[] => {
    return reservationsByTable[tableId] || [];
  };

  return {
    reservations,
    reservationsByTable,
    getActiveReservation,
    hasReservation,
    getReservationsForTable,
    isLoading,
    refetch,
  };
}
