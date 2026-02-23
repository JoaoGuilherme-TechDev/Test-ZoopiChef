/**
 * Kiosk Device & Session Management Hook
 * 
 * Provides access to kiosk configuration and session management.
 * Designed for anonymous (unauthenticated) kiosk access via device token.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import type { Json } from '@/integrations/supabase/types';

// Types
export type KioskState = 'ATTRACT' | 'IDENTIFY' | 'MENU' | 'CART' | 'DINE_MODE' | 'CUSTOMER_INFO' | 'PAYMENT' | 'SUCCESS' | 'COMANDA';
export type KioskOrientation = 'portrait' | 'landscape';
export type DineMode = 'eat_here' | 'takeaway';

export interface PlaylistItem {
  type: 'image' | 'video';
  url: string;
  seconds: number;
}

export interface KioskUIConfig {
  headerPromoCarousel?: boolean;
  categorySidebar?: boolean;
  showPrices?: boolean;
  primaryColor?: string;
  accentColor?: string;
}

export interface KioskDevice {
  id: string;
  company_id: string;
  device_code: string;
  name: string;
  is_active: boolean;
  orientation: KioskOrientation;
  idle_timeout_seconds: number;
  idle_playlist: PlaylistItem[];
  ui_config: KioskUIConfig;
  require_dine_mode: boolean;
  require_customer_info: boolean;
  enabled_payment_methods: string[];
  print_customer_receipt: boolean;
  print_sector_ids: string[];
  default_printer: string | null;
  customer_printer_host: string | null;
  customer_printer_port: number | null;
  upsell_enabled: boolean;
  upsell_max_offers: number;
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface KioskCartItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  notes?: string;
  selected_options?: Json;
  image_url?: string;
}

export interface KioskSession {
  id: string;
  kiosk_device_id: string;
  company_id: string;
  state: KioskState;
  customer_name: string | null;
  customer_phone: string | null;
  dine_mode: DineMode | null;
  cart_items: KioskCartItem[];
  cart_total_cents: number;
  declined_offer_ids: string[];
  offers_shown_count: number;
  order_id: string | null;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  created_at: string;
}

/**
 * Fetch kiosk device by token
 */
export function useKioskByToken(token: string | null) {
  return useQuery({
    queryKey: ['kiosk-device', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('access_token', token)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('[useKiosk] Error fetching device:', error);
        return null;
      }

      // Parse JSONB fields
      const playlist = Array.isArray(data.idle_playlist) 
        ? (data.idle_playlist as unknown as PlaylistItem[]) 
        : [];
      const uiConfig = data.ui_config && typeof data.ui_config === 'object' && !Array.isArray(data.ui_config)
        ? (data.ui_config as unknown as KioskUIConfig)
        : {};

      return {
        ...data,
        idle_playlist: playlist,
        ui_config: uiConfig,
      } as KioskDevice;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch first active kiosk device by company ID
 * Used for slug-only access when there's a single device
 */
export function useKioskByCompanyId(companyId: string | null) {
  return useQuery({
    queryKey: ['kiosk-device-by-company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useKiosk] Error fetching device by company:', error);
        return null;
      }
      
      if (!data) return null;

      // Parse JSONB fields
      const playlist = Array.isArray(data.idle_playlist) 
        ? (data.idle_playlist as unknown as PlaylistItem[]) 
        : [];
      const uiConfig = data.ui_config && typeof data.ui_config === 'object' && !Array.isArray(data.ui_config)
        ? (data.ui_config as unknown as KioskUIConfig)
        : {};

      return {
        ...data,
        idle_playlist: playlist,
        ui_config: uiConfig,
      } as KioskDevice;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch kiosk device by ID
 */
export function useKioskDevice(deviceId: string | null) {
  return useQuery({
    queryKey: ['kiosk-device-id', deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('id', deviceId)
        .single();

      if (error) {
        console.error('[useKiosk] Error fetching device:', error);
        return null;
      }

      const playlist = Array.isArray(data.idle_playlist) 
        ? (data.idle_playlist as unknown as PlaylistItem[]) 
        : [];
      const uiConfig = data.ui_config && typeof data.ui_config === 'object' && !Array.isArray(data.ui_config)
        ? (data.ui_config as unknown as KioskUIConfig)
        : {};

      return {
        ...data,
        idle_playlist: playlist,
        ui_config: uiConfig,
      } as KioskDevice;
    },
    enabled: !!deviceId,
  });
}

/**
 * Fetch all kiosk devices for company (admin view)
 */
export function useKioskDevices(companyId: string | null) {
  return useQuery({
    queryKey: ['kiosk-devices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('kiosk_devices')
        .select('*')
        .eq('company_id', companyId)
        .order('device_code');

      if (error) {
        console.error('[useKiosk] Error fetching devices:', error);
        return [];
      }

      return data.map(d => {
        const playlist = Array.isArray(d.idle_playlist) 
          ? (d.idle_playlist as unknown as PlaylistItem[]) 
          : [];
        const uiConfig = d.ui_config && typeof d.ui_config === 'object' && !Array.isArray(d.ui_config)
          ? (d.ui_config as unknown as KioskUIConfig)
          : {};

        return {
          ...d,
          idle_playlist: playlist,
          ui_config: uiConfig,
        };
      }) as KioskDevice[];
    },
    enabled: !!companyId,
  });
}

/**
 * Create or get active session for a kiosk
 */
export function useKioskSession(deviceId: string | null, companyId: string | null) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['kiosk-session', deviceId],
    queryFn: async () => {
      if (!deviceId || !companyId) return null;

      // Try to find active session
      const { data: existing, error: fetchError } = await supabase
        .from('kiosk_sessions')
        .select('*')
        .eq('kiosk_device_id', deviceId)
        .is('completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing && !fetchError) {
        return {
          ...existing,
          cart_items: (existing.cart_items as unknown as KioskCartItem[]) || [],
        } as KioskSession;
      }

      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('kiosk_sessions')
        .insert([{
          kiosk_device_id: deviceId,
          company_id: companyId,
          state: 'ATTRACT',
          cart_items: [],
          cart_total_cents: 0,
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[useKiosk] Error creating session:', insertError);
        return null;
      }

      return {
        ...newSession,
        cart_items: [],
      } as KioskSession;
    },
    enabled: !!deviceId && !!companyId,
    staleTime: 0, // Always refetch
  });

  // Update session mutation
  const updateSession = useMutation({
    mutationFn: async (updates: Partial<KioskSession>) => {
      if (!sessionQuery.data?.id) throw new Error('No session');

      const updatePayload: Record<string, unknown> = {
        ...updates,
        last_activity_at: new Date().toISOString(),
      };

      // Convert cart_items to JSON-compatible format
      if (updates.cart_items) {
        updatePayload.cart_items = JSON.parse(JSON.stringify(updates.cart_items));
      }

      const { data, error } = await supabase
        .from('kiosk_sessions')
        .update(updatePayload)
        .eq('id', sessionQuery.data.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-session', deviceId] });
    },
  });

  // Reset session (clear cart, go to ATTRACT)
  const resetSession = useMutation({
    mutationFn: async () => {
      if (!sessionQuery.data?.id) throw new Error('No session');

      // Mark current session as completed
      await supabase
        .from('kiosk_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionQuery.data.id);

      // Create new session
      const { data: newSession, error } = await supabase
        .from('kiosk_sessions')
        .insert([{
          kiosk_device_id: deviceId,
          company_id: companyId,
          state: 'ATTRACT',
          cart_items: [],
          cart_total_cents: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return newSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-session', deviceId] });
    },
  });

  return {
    session: sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    updateSession,
    resetSession,
    refetch: sessionQuery.refetch,
  };
}

/**
 * CRUD mutations for kiosk devices (admin)
 */
export function useKioskDeviceMutations() {
  const queryClient = useQueryClient();

  const createDevice = useMutation({
    mutationFn: async (device: Partial<KioskDevice> & { company_id: string; device_code: string; name: string }) => {
      // Convert to DB-compatible format
      const dbDevice = {
        ...device,
        idle_playlist: device.idle_playlist ? JSON.parse(JSON.stringify(device.idle_playlist)) : [],
        ui_config: device.ui_config ? JSON.parse(JSON.stringify(device.ui_config)) : {},
      };

      const { data, error } = await supabase
        .from('kiosk_devices')
        .insert([dbDevice])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-devices', variables.company_id] });
    },
  });

  const updateDevice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KioskDevice> & { id: string }) => {
      // Convert to DB-compatible format
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.idle_playlist) {
        dbUpdates.idle_playlist = JSON.parse(JSON.stringify(updates.idle_playlist));
      }
      if (updates.ui_config) {
        dbUpdates.ui_config = JSON.parse(JSON.stringify(updates.ui_config));
      }

      const { data, error } = await supabase
        .from('kiosk_devices')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-devices'] });
      queryClient.invalidateQueries({ queryKey: ['kiosk-device'] });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kiosk_devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosk-devices'] });
    },
  });

  return { createDevice, updateDevice, deleteDevice };
}
