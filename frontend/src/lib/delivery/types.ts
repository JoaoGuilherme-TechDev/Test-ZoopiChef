/**
 * Unified Delivery Provider Interface
 * 
 * Defines a standard contract for all delivery providers (Machine, OpenDelivery, etc.)
 * Each provider implements this interface through adapter functions.
 */

// ─── Unified Status ──────────────────────────────
export type DeliveryStatus =
  | 'pending'
  | 'distributing'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'in_progress'
  | 'finished'
  | 'cancelled'
  | 'error';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendente',
  distributing: 'Distribuindo',
  accepted: 'Aceita',
  preparing: 'Preparando',
  ready_for_pickup: 'Pronto para Coleta',
  picked_up: 'Coletado',
  in_progress: 'Em Andamento',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
  error: 'Erro',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  distributing: 'bg-blue-500/10 text-blue-500',
  accepted: 'bg-amber-500/10 text-amber-500',
  preparing: 'bg-orange-500/10 text-orange-500',
  ready_for_pickup: 'bg-cyan-500/10 text-cyan-500',
  picked_up: 'bg-indigo-500/10 text-indigo-500',
  in_progress: 'bg-purple-500/10 text-purple-500',
  finished: 'bg-emerald-500/10 text-emerald-500',
  cancelled: 'bg-destructive/10 text-destructive',
  error: 'bg-destructive/10 text-destructive',
};

// ─── Provider Identification ─────────────────────
export type DeliveryProviderType = 'machine' | 'opendelivery';

export interface DeliveryProviderInfo {
  type: DeliveryProviderType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
}

export const DELIVERY_PROVIDERS: Record<DeliveryProviderType, DeliveryProviderInfo> = {
  machine: {
    type: 'machine',
    label: 'Machine Global',
    description: 'Corridas e delivery via Machine',
    icon: 'Truck',
    color: 'text-violet-500',
  },
  opendelivery: {
    type: 'opendelivery',
    label: 'OpenDelivery',
    description: 'Padrão aberto de integração com provedores logísticos',
    icon: 'Globe',
    color: 'text-teal-500',
  },
};

// ─── Address ─────────────────────────────────────
export interface DeliveryAddress {
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  lat: number;
  lng: number;
  complement?: string;
  reference?: string;
}

// ─── Delivery Order (unified) ────────────────────
export interface DeliveryOrder {
  id: string;
  provider: DeliveryProviderType;
  orderId?: string;
  externalId?: string;
  providerOrderId?: string;

  status: DeliveryStatus;
  providerEventType?: string;

  pickup: DeliveryAddress;
  destination: DeliveryAddress;

  driver?: {
    name?: string;
    phone?: string;
    vehicle?: string;
    plate?: string;
    lat?: number;
    lng?: number;
  };

  trackingUrl?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: string;

  providerResponseJson?: any;
  lastPolledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Create Delivery Request ─────────────────────
export interface CreateDeliveryRequest {
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  pickup: DeliveryAddress;
  destination: DeliveryAddress;
  items?: DeliveryItem[];
  paymentType?: string;
  instructions?: string;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  externalCode?: string;
}

// ─── Estimate ────────────────────────────────────
export interface DeliveryEstimate {
  provider: DeliveryProviderType;
  available: boolean;
  fee?: number;
  estimatedMinutes?: number;
  distance?: number;
  currency?: string;
  raw?: any;
}

// ─── Provider Config Base ────────────────────────
export interface DeliveryProviderConfig {
  id: string;
  companyId: string;
  provider: DeliveryProviderType;
  isEnabled: boolean;
  environment: 'production' | 'sandbox';
}
