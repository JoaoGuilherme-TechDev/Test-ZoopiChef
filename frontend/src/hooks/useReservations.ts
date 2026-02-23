import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCompany } from './useCompany';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export interface Reservation {
  id: string;
  company_id: string;
  customer_id: string | null;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  confirmed_at: string | null;
  confirmed_via: string | null;
  confirmation_token: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  special_requests: string | null;
  reservation_reason: string | null;
  reservation_reason_other: string | null;
  needs_wheelchair_access: boolean;
  needs_disability_access: boolean;
  needs_baby_chair: boolean;
  other_needs: string | null;
  customer_cpf: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  table?: { id: string; number: number; name: string | null };
  customer?: { id: string; name: string; phone: string };
}

export interface ReservationSettings {
  company_id: string;
  enabled: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  default_duration_minutes: number;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number;
  max_party_size: number;
  min_party_size: number;
  auto_confirm: boolean;
  require_confirmation: boolean;
  confirmation_deadline_hours: number;
  send_whatsapp_confirmation: boolean;
  send_whatsapp_reminder: boolean;
  reminder_hours_before: number;
  confirmation_message_template: string;
  reminder_message_template: string;
  created_at: string;
  updated_at: string;
}

export interface WaitlistEntry {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  desired_date: string;
  desired_time: string | null;
  flexible_time: boolean;
  status: 'waiting' | 'notified' | 'converted' | 'expired';
  converted_to_reservation_id: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationBlock {
  id: string;
  company_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string | null;
  created_at: string;
}

const defaultSettings: Omit<ReservationSettings, 'company_id' | 'created_at' | 'updated_at'> = {
  enabled: true,
  min_advance_hours: 2,
  max_advance_days: 30,
  default_duration_minutes: 120,
  opening_time: '11:00',
  closing_time: '23:00',
  slot_interval_minutes: 30,
  max_party_size: 20,
  min_party_size: 1,
  auto_confirm: false,
  require_confirmation: true,
  confirmation_deadline_hours: 24,
  send_whatsapp_confirmation: true,
  send_whatsapp_reminder: true,
  reminder_hours_before: 3,
  confirmation_message_template: 'Olá {name}! Sua reserva para {date} às {time} foi confirmada. Mesa para {party_size} pessoas. Até breve!',
  reminder_message_template: 'Olá {name}! Lembrando da sua reserva hoje às {time}. Mesa para {party_size} pessoas. Esperamos você!',
};

export const mapReservationToFrontend = (data: any): Reservation => ({
  id: data.id,
  company_id: data.companyId,
  customer_id: data.customerId,
  table_id: data.tableId,
  customer_name: data.customerName,
  customer_phone: data.customerPhone,
  customer_email: data.customerEmail,
  party_size: data.partySize,
  reservation_date: data.reservationDate,
  reservation_time: data.reservationTime,
  duration_minutes: data.durationMinutes,
  status: data.status,
  confirmed_at: data.confirmedAt,
  confirmed_via: data.confirmedVia,
  confirmation_token: data.confirmationToken,
  cancelled_at: data.cancelledAt,
  cancel_reason: data.cancelReason,
  notes: data.notes,
  special_requests: data.specialRequests,
  reservation_reason: data.reservationReason,
  reservation_reason_other: data.reservationReasonOther,
  needs_wheelchair_access: data.needsWheelchairAccess,
  needs_disability_access: data.needsDisabilityAccess,
  needs_baby_chair: data.needsBabyChair,
  other_needs: data.otherNeeds,
  customer_cpf: data.customerCpf,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
  table: data.table ? {
    id: data.table.id,
    number: data.table.number,
    name: data.table.name
  } : undefined,
  customer: data.customer ? {
    id: data.customer.id,
    name: data.customer.name,
    phone: data.customer.phone
  } : undefined
});

export const mapReservationToBackend = (data: Partial<Reservation>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.customer_id !== undefined) mapped.customerId = data.customer_id;
  if (data.table_id !== undefined) mapped.tableId = data.table_id;
  if (data.customer_name !== undefined) mapped.customerName = data.customer_name;
  if (data.customer_phone !== undefined) mapped.customerPhone = data.customer_phone;
  if (data.customer_email !== undefined) mapped.customerEmail = data.customer_email;
  if (data.party_size !== undefined) mapped.partySize = data.party_size;
  if (data.reservation_date !== undefined) mapped.reservationDate = data.reservation_date;
  if (data.reservation_time !== undefined) mapped.reservationTime = data.reservation_time;
  if (data.duration_minutes !== undefined) mapped.durationMinutes = data.duration_minutes;
  if (data.status !== undefined) mapped.status = data.status;
  if (data.confirmed_at !== undefined) mapped.confirmedAt = data.confirmed_at;
  if (data.confirmed_via !== undefined) mapped.confirmedVia = data.confirmed_via;
  if (data.confirmation_token !== undefined) mapped.confirmationToken = data.confirmation_token;
  if (data.cancelled_at !== undefined) mapped.cancelledAt = data.cancelled_at;
  if (data.cancel_reason !== undefined) mapped.cancelReason = data.cancel_reason;
  if (data.notes !== undefined) mapped.notes = data.notes;
  if (data.special_requests !== undefined) mapped.specialRequests = data.special_requests;
  if (data.reservation_reason !== undefined) mapped.reservationReason = data.reservation_reason;
  if (data.reservation_reason_other !== undefined) mapped.reservationReasonOther = data.reservation_reason_other;
  if (data.needs_wheelchair_access !== undefined) mapped.needsWheelchairAccess = data.needs_wheelchair_access;
  if (data.needs_disability_access !== undefined) mapped.needsDisabilityAccess = data.needs_disability_access;
  if (data.needs_baby_chair !== undefined) mapped.needsBabyChair = data.needs_baby_chair;
  if (data.other_needs !== undefined) mapped.otherNeeds = data.other_needs;
  if (data.customer_cpf !== undefined) mapped.customerCpf = data.customer_cpf;
  return mapped;
};

export const mapSettingsToFrontend = (data: any): ReservationSettings => ({
  company_id: data.companyId,
  enabled: data.enabled,
  min_advance_hours: data.minAdvanceHours,
  max_advance_days: data.maxAdvanceDays,
  default_duration_minutes: data.defaultDurationMinutes,
  opening_time: data.openingTime,
  closing_time: data.closingTime,
  slot_interval_minutes: data.slotIntervalMinutes,
  max_party_size: data.maxPartySize,
  min_party_size: data.minPartySize,
  auto_confirm: data.autoConfirm,
  require_confirmation: data.requireConfirmation,
  confirmation_deadline_hours: data.confirmationDeadlineHours,
  send_whatsapp_confirmation: data.sendWhatsappConfirmation,
  send_whatsapp_reminder: data.sendWhatsappReminder,
  reminder_hours_before: data.reminderHoursBefore,
  confirmation_message_template: data.confirmationMessageTemplate,
  reminder_message_template: data.reminderMessageTemplate,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

export const mapSettingsToBackend = (data: Partial<ReservationSettings>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.enabled !== undefined) mapped.enabled = data.enabled;
  if (data.min_advance_hours !== undefined) mapped.minAdvanceHours = data.min_advance_hours;
  if (data.max_advance_days !== undefined) mapped.maxAdvanceDays = data.max_advance_days;
  if (data.default_duration_minutes !== undefined) mapped.defaultDurationMinutes = data.default_duration_minutes;
  if (data.opening_time !== undefined) mapped.openingTime = data.opening_time;
  if (data.closing_time !== undefined) mapped.closingTime = data.closing_time;
  if (data.slot_interval_minutes !== undefined) mapped.slotIntervalMinutes = data.slot_interval_minutes;
  if (data.max_party_size !== undefined) mapped.maxPartySize = data.max_party_size;
  if (data.min_party_size !== undefined) mapped.minPartySize = data.min_party_size;
  if (data.auto_confirm !== undefined) mapped.autoConfirm = data.auto_confirm;
  if (data.require_confirmation !== undefined) mapped.requireConfirmation = data.require_confirmation;
  if (data.confirmation_deadline_hours !== undefined) mapped.confirmationDeadlineHours = data.confirmation_deadline_hours;
  if (data.send_whatsapp_confirmation !== undefined) mapped.sendWhatsappConfirmation = data.send_whatsapp_confirmation;
  if (data.send_whatsapp_reminder !== undefined) mapped.sendWhatsappReminder = data.send_whatsapp_reminder;
  if (data.reminder_hours_before !== undefined) mapped.reminderHoursBefore = data.reminder_hours_before;
  if (data.confirmation_message_template !== undefined) mapped.confirmationMessageTemplate = data.confirmation_message_template;
  if (data.reminder_message_template !== undefined) mapped.reminderMessageTemplate = data.reminder_message_template;
  return mapped;
};

export const mapWaitlistToFrontend = (data: any): WaitlistEntry => ({
  id: data.id,
  company_id: data.companyId,
  customer_id: data.customerId,
  customer_name: data.customerName,
  customer_phone: data.customerPhone,
  party_size: data.partySize,
  desired_date: data.desiredDate,
  desired_time: data.desiredTime,
  flexible_time: data.flexibleTime,
  status: data.status,
  converted_to_reservation_id: data.convertedToReservationId,
  notified_at: data.notifiedAt,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

export const mapWaitlistToBackend = (data: Partial<WaitlistEntry>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.customer_id !== undefined) mapped.customerId = data.customer_id;
  if (data.customer_name !== undefined) mapped.customerName = data.customer_name;
  if (data.customer_phone !== undefined) mapped.customerPhone = data.customer_phone;
  if (data.party_size !== undefined) mapped.partySize = data.party_size;
  if (data.desired_date !== undefined) mapped.desiredDate = data.desired_date;
  if (data.desired_time !== undefined) mapped.desiredTime = data.desired_time;
  if (data.flexible_time !== undefined) mapped.flexibleTime = data.flexible_time;
  if (data.status !== undefined) mapped.status = data.status;
  if (data.converted_to_reservation_id !== undefined) mapped.convertedToReservationId = data.converted_to_reservation_id;
  return mapped;
};

export const mapBlockToFrontend = (data: any): ReservationBlock => ({
  id: data.id,
  company_id: data.companyId,
  block_date: data.blockDate,
  start_time: data.startTime,
  end_time: data.endTime,
  all_day: data.allDay,
  reason: data.reason,
  created_at: data.createdAt,
});

export const mapBlockToBackend = (data: Partial<ReservationBlock>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.block_date !== undefined) mapped.blockDate = data.block_date;
  if (data.start_time !== undefined) mapped.startTime = data.start_time;
  if (data.end_time !== undefined) mapped.endTime = data.end_time;
  if (data.all_day !== undefined) mapped.allDay = data.all_day;
  if (data.reason !== undefined) mapped.reason = data.reason;
  return mapped;
};

// Hook para listar reservas
export function useReservations(dateRange?: { start: Date; end: Date }) {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const startDate = dateRange?.start || new Date();
  const endDate = dateRange?.end || addDays(new Date(), 30);

  const { data: reservations = [], isLoading, error } = useQuery({
    queryKey: ['reservations', company?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get(`/reservations`, {
        params: {
          companyId: company.id,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        }
      });
      
      return (response.data || []).map(mapReservationToFrontend);
    },
    enabled: !!company?.id,
    refetchInterval: 10000, // Polling every 10s
  });

  // Criar reserva
  const createReservation = useMutation({
    mutationFn: async (data: Omit<Reservation, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'table' | 'customer'>) => {
      if (!company?.id) throw new Error('No company');

      const confirmationToken = crypto.randomUUID().slice(0, 8).toUpperCase();
      const payload = mapReservationToBackend({
        ...data,
        company_id: company.id,
        confirmation_token: confirmationToken,
      } as any);

      const response = await api.post('/reservations', payload);
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating reservation:', error);
      toast.error('Erro ao criar reserva');
    },
  });

  // Atualizar reserva
  const updateReservation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Reservation> & { id: string }) => {
      const payload = mapReservationToBackend(data);
      const response = await api.patch(`/reservations/${id}`, payload);
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar reserva'),
  });

  // Confirmar reserva
  const confirmReservation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/reservations/${id}/confirm`);
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva confirmada!');
    },
    onError: () => toast.error('Erro ao confirmar reserva'),
  });
  
  // Cancelar reserva
  const cancelReservation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.patch(`/reservations/${id}/cancel`, { reason });
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva cancelada!');
    },
    onError: () => toast.error('Erro ao cancelar reserva'),
  });

  // Marcar como No-Show
  const markNoShow = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/reservations/${id}/no-show`);
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva marcada como no-show');
    },
    onError: () => toast.error('Erro ao marcar no-show'),
  });

  // Completar reserva
  const completeReservation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/reservations/${id}/complete`);
      return mapReservationToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva concluída!');
    },
    onError: () => toast.error('Erro ao completar reserva'),
  });

  // Deletar reserva
  const deleteReservation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Reserva excluída');
    },
    onError: () => toast.error('Erro ao excluir reserva'),
  });

  // Estatísticas do dia
  const todayReservations = reservations.filter(
    r => r.reservation_date === format(new Date(), 'yyyy-MM-dd')
  );

  const stats = {
    total: todayReservations.length,
    pending: todayReservations.filter(r => r.status === 'pending').length,
    confirmed: todayReservations.filter(r => r.status === 'confirmed').length,
    completed: todayReservations.filter(r => r.status === 'completed').length,
    noShow: todayReservations.filter(r => r.status === 'no_show').length,
    cancelled: todayReservations.filter(r => r.status === 'cancelled').length,
  };

  return {
    reservations,
    todayReservations,
    stats,
    isLoading,
    error,
    createReservation,
    updateReservation,
    confirmReservation,
    cancelReservation,
    markNoShow,
    completeReservation,
    deleteReservation,
  };
}

// Hook para configurações de reserva
export function useReservationSettings() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['reservation-settings', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;

      const response = await api.get('/reservations/settings', {
        params: { companyId: company.id }
      });

      if (!response.data) {
        return {
          company_id: company.id,
          ...defaultSettings,
          created_at: '',
          updated_at: '',
        } as ReservationSettings;
      }

      return mapSettingsToFrontend(response.data);
    },
    enabled: !!company?.id,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<ReservationSettings, 'company_id' | 'created_at' | 'updated_at'>>) => {
      if (!company?.id) throw new Error('No company');

      const payload = mapSettingsToBackend({
        ...updates,
        company_id: company.id,
      } as any);

      const response = await api.patch('/reservations/settings', payload, {
        params: { companyId: company.id }
      });
      
      return mapSettingsToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-settings'] });
      toast.success('Configurações salvas!');
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  });

  return {
    settings: settings || { company_id: company?.id || '', ...defaultSettings, created_at: '', updated_at: '' },
    isLoading,
    upsertSettings,
  };
}

// Hook para lista de espera
export function useWaitlist() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: waitlist = [], isLoading } = useQuery({
    queryKey: ['waitlist', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get('/reservations/waitlist', {
        params: { companyId: company.id }
      });

      return (response.data || []).map(mapWaitlistToFrontend);
    },
    enabled: !!company?.id,
  });

  const addToWaitlist = useMutation({
    mutationFn: async (data: Omit<WaitlistEntry, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'status' | 'converted_to_reservation_id' | 'notified_at'>) => {
      if (!company?.id) throw new Error('No company');

      const payload = mapWaitlistToBackend({
        ...data,
        company_id: company.id,
      } as any);

      const response = await api.post('/reservations/waitlist', payload);
      return mapWaitlistToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Adicionado à lista de espera!');
    },
    onError: () => toast.error('Erro ao adicionar à lista de espera'),
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reservations/waitlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Removido da lista de espera');
    },
    onError: () => toast.error('Erro ao remover da lista'),
  });

  const convertToReservation = useMutation({
    mutationFn: async ({ waitlistId, reservationId }: { waitlistId: string; reservationId: string }) => {
      await api.patch(`/reservations/waitlist/${waitlistId}/convert`, { reservationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Convertido para reserva!');
    },
    onError: () => toast.error('Erro ao converter'),
  });

  return {
    waitlist,
    isLoading,
    addToWaitlist,
    removeFromWaitlist,
    convertToReservation,
  };
}

// Hook para bloqueios de horários
export function useReservationBlocks() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['reservation-blocks', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const response = await api.get('/reservations/blocks', {
        params: { 
          companyId: company.id,
          startDate: format(new Date(), 'yyyy-MM-dd')
        }
      });

      return (response.data || []).map(mapBlockToFrontend);
    },
    enabled: !!company?.id,
  });

  const addBlock = useMutation({
    mutationFn: async (data: Omit<ReservationBlock, 'id' | 'company_id' | 'created_at'>) => {
      if (!company?.id) throw new Error('No company');

      const payload = mapBlockToBackend({
        ...data,
        company_id: company.id,
      } as any);

      const response = await api.post('/reservations/blocks', payload);
      return mapBlockToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-blocks'] });
      toast.success('Bloqueio adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar bloqueio'),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reservations/blocks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-blocks'] });
      toast.success('Bloqueio removido');
    },
    onError: () => toast.error('Erro ao remover bloqueio'),
  });

  return {
    blocks,
    isLoading,
    addBlock,
    removeBlock,
  };
}

// Hook para gerar horários disponíveis
export function useAvailableSlots(date: Date) {
  const { settings } = useReservationSettings();
  const { reservations } = useReservations({ start: date, end: date });
  const { blocks } = useReservationBlocks();

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayBlocks = blocks.filter(b => b.block_date === dateStr);
  const dayReservations = reservations.filter(r => r.reservation_date === dateStr && r.status !== 'cancelled');

  // Gerar slots baseado nos horários de funcionamento
  const slots: { time: string; available: boolean; reason?: string }[] = [];

  if (!settings) return { slots: [], isLoading: true };

  // Verificar se o dia está totalmente bloqueado
  const fullDayBlock = dayBlocks.find(b => b.all_day);
  if (fullDayBlock) {
    return { 
      slots: [], 
      isLoading: false, 
      blockedReason: fullDayBlock.reason || 'Dia bloqueado' 
    };
  }

  const [openHour, openMin] = settings.opening_time.split(':').map(Number);
  const [closeHour, closeMin] = settings.closing_time.split(':').map(Number);
  const interval = settings.slot_interval_minutes;
  const duration = settings.default_duration_minutes;

  let currentHour = openHour;
  let currentMin = openMin;

  while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

    // Verificar se está em horário bloqueado
    const isBlocked = dayBlocks.some(b => {
      if (b.all_day) return true;
      if (!b.start_time || !b.end_time) return false;
      return timeStr >= b.start_time && timeStr < b.end_time;
    });

    // Verificar conflitos com reservas existentes
    const hasConflict = dayReservations.some(r => {
      const resTime = r.reservation_time.slice(0, 5);
      const resDuration = r.duration_minutes;
      
      // Calcular fim da reserva existente
      const [resH, resM] = resTime.split(':').map(Number);
      const resEndMinutes = resH * 60 + resM + resDuration;
      
      // Calcular início e fim do slot atual
      const slotStartMinutes = currentHour * 60 + currentMin;
      const slotEndMinutes = slotStartMinutes + duration;

      // Verificar sobreposição
      return slotStartMinutes < resEndMinutes && slotEndMinutes > resH * 60 + resM;
    });

    slots.push({
      time: timeStr,
      available: !isBlocked && !hasConflict,
      reason: isBlocked ? 'Horário bloqueado' : hasConflict ? 'Já reservado' : undefined,
    });

    // Próximo slot
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  return { slots, isLoading: false };
}
