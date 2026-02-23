import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface SmartWaitlistSettings {
  company_id: string;
  enabled: boolean;
  avg_turnover_minutes: number;
  notify_before_minutes: number;
  allow_remote_checkin: boolean;
  show_estimated_wait: boolean;
  priority_vip_customers: boolean;
  auto_remove_no_show_minutes: number;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
}

export interface WaitlistEntry {
  id: string;
  company_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  requested_at: string;
  estimated_wait_minutes: number | null;
  predicted_seat_time: string | null;
  actual_seat_time: string | null;
  status: string;
  priority_score: number;
  special_requests: string | null;
  table_preference: string | null;
  notified_at: string | null;
  no_show: boolean;
  tracking_token: string | null;
  assigned_table_id: string | null;
  assigned_table_number: number | null;
  comanda_id: string | null;
  table_notified_at: string | null;
  table_notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export const mapSmartWaitlistSettingsToFrontend = (data: any): SmartWaitlistSettings => ({
  company_id: data.companyId,
  enabled: data.enabled,
  avg_turnover_minutes: data.avgTurnoverMinutes,
  notify_before_minutes: data.notifyBeforeMinutes,
  allow_remote_checkin: data.allowRemoteCheckin,
  show_estimated_wait: data.showEstimatedWait,
  priority_vip_customers: data.priorityVipCustomers,
  auto_remove_no_show_minutes: data.autoRemoveNoShowMinutes,
  sms_notifications: data.smsNotifications,
  whatsapp_notifications: data.whatsappNotifications,
});

export const mapSmartWaitlistSettingsToBackend = (data: Partial<SmartWaitlistSettings>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.enabled !== undefined) mapped.enabled = data.enabled;
  if (data.avg_turnover_minutes !== undefined) mapped.avgTurnoverMinutes = data.avg_turnover_minutes;
  if (data.notify_before_minutes !== undefined) mapped.notifyBeforeMinutes = data.notify_before_minutes;
  if (data.allow_remote_checkin !== undefined) mapped.allowRemoteCheckin = data.allow_remote_checkin;
  if (data.show_estimated_wait !== undefined) mapped.showEstimatedWait = data.show_estimated_wait;
  if (data.priority_vip_customers !== undefined) mapped.priorityVipCustomers = data.priority_vip_customers;
  if (data.auto_remove_no_show_minutes !== undefined) mapped.autoRemoveNoShowMinutes = data.auto_remove_no_show_minutes;
  if (data.sms_notifications !== undefined) mapped.smsNotifications = data.sms_notifications;
  if (data.whatsapp_notifications !== undefined) mapped.whatsappNotifications = data.whatsapp_notifications;
  return mapped;
};

export const mapSmartWaitlistEntryToFrontend = (data: any): WaitlistEntry => ({
  id: data.id,
  company_id: data.companyId,
  customer_id: data.customerId,
  customer_name: data.customerName,
  customer_phone: data.customerPhone,
  party_size: data.partySize,
  requested_at: data.requestedAt,
  estimated_wait_minutes: data.estimatedWaitMinutes,
  predicted_seat_time: data.predictedSeatTime,
  actual_seat_time: data.actualSeatTime,
  status: data.status,
  priority_score: data.priorityScore,
  special_requests: data.specialRequests,
  table_preference: data.tablePreference,
  notified_at: data.notifiedAt,
  no_show: data.noShow,
  tracking_token: data.trackingToken,
  assigned_table_id: data.assignedTableId,
  assigned_table_number: data.assignedTableNumber,
  comanda_id: data.comandaId,
  table_notified_at: data.tableNotifiedAt,
  table_notification_sent: data.tableNotificationSent,
  created_at: data.createdAt,
  updated_at: data.updatedAt,
});

export const mapSmartWaitlistEntryToBackend = (data: Partial<WaitlistEntry>): any => {
  const mapped: any = {};
  if (data.company_id !== undefined) mapped.companyId = data.company_id;
  if (data.customer_id !== undefined) mapped.customerId = data.customer_id;
  if (data.customer_name !== undefined) mapped.customerName = data.customer_name;
  if (data.customer_phone !== undefined) mapped.customerPhone = data.customer_phone;
  if (data.party_size !== undefined) mapped.partySize = data.party_size;
  if (data.requested_at !== undefined) mapped.requestedAt = data.requested_at;
  if (data.estimated_wait_minutes !== undefined) mapped.estimatedWaitMinutes = data.estimated_wait_minutes;
  if (data.predicted_seat_time !== undefined) mapped.predictedSeatTime = data.predicted_seat_time;
  if (data.actual_seat_time !== undefined) mapped.actualSeatTime = data.actual_seat_time;
  if (data.status !== undefined) mapped.status = data.status;
  if (data.priority_score !== undefined) mapped.priorityScore = data.priority_score;
  if (data.special_requests !== undefined) mapped.specialRequests = data.special_requests;
  if (data.table_preference !== undefined) mapped.tablePreference = data.table_preference;
  if (data.notified_at !== undefined) mapped.notifiedAt = data.notified_at;
  if (data.no_show !== undefined) mapped.noShow = data.no_show;
  if (data.tracking_token !== undefined) mapped.trackingToken = data.tracking_token;
  if (data.assigned_table_id !== undefined) mapped.assignedTableId = data.assigned_table_id;
  if (data.assigned_table_number !== undefined) mapped.assignedTableNumber = data.assigned_table_number;
  if (data.comanda_id !== undefined) mapped.comandaId = data.comanda_id;
  if (data.table_notified_at !== undefined) mapped.tableNotifiedAt = data.table_notified_at;
  if (data.table_notification_sent !== undefined) mapped.tableNotificationSent = data.table_notification_sent;
  return mapped;
};

export function useSmartWaitlistSettings() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['smart-waitlist-settings', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const response = await api.get('/reservations/smart-waitlist/settings', {
        params: { companyId: profile.company_id }
      });
      
      return mapSmartWaitlistSettingsToFrontend(response.data);
    },
    enabled: !!profile?.company_id
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<SmartWaitlistSettings>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const payload = mapSmartWaitlistSettingsToBackend({
        ...updates,
        company_id: profile.company_id,
      });

      await api.patch('/reservations/smart-waitlist/settings', payload, {
        params: { companyId: profile.company_id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-waitlist-settings'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Erro ao salvar')
  });

  return { settings, isLoading, updateSettings };
}

export function useWaitlist() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['smart-waitlist', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const response = await api.get('/reservations/smart-waitlist', {
        params: { companyId: profile.company_id }
      });
      
      // Filter by status if needed, but backend already returns sorted list
      // Frontend might need to filter status locally if backend returns all
      // The original query filtered: .in('status', ['waiting', 'notified', 'ready'])
      
      const allEntries = (response.data || []).map(mapSmartWaitlistEntryToFrontend);
      return allEntries.filter((e: WaitlistEntry) => ['waiting', 'notified', 'ready'].includes(e.status));
    },
    enabled: !!profile?.company_id,
    refetchInterval: 15000,
  });

  const addToWaitlist = useMutation({
    mutationFn: async (data: Partial<WaitlistEntry>) => {
      if (!profile?.company_id) throw new Error('No company');
      
      const payload = mapSmartWaitlistEntryToBackend({
        ...data,
        company_id: profile.company_id,
        status: 'waiting',
      });

      const response = await api.post('/reservations/smart-waitlist', payload);
      return mapSmartWaitlistEntryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-waitlist'] });
      toast.success('Adicionado à lista de espera');
    },
    onError: () => toast.error('Erro ao adicionar')
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaitlistEntry> & { id: string }) => {
      const payload = mapSmartWaitlistEntryToBackend(updates);
      const response = await api.patch(`/reservations/smart-waitlist/${id}`, payload);
      return mapSmartWaitlistEntryToFrontend(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-waitlist'] });
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/reservations/smart-waitlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-waitlist'] });
      toast.success('Removido da lista');
    },
    onError: () => toast.error('Erro ao remover')
  });

  return {
    entries,
    isLoading,
    addToWaitlist,
    updateEntry,
    removeFromWaitlist
  };
}
