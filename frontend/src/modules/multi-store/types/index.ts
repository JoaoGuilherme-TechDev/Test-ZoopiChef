// Types for Multi-Store Management

export type StoreStatus = 'active' | 'inactive' | 'maintenance';
export type StoreType = 'flagship' | 'branch' | 'franchise' | 'kiosk' | 'dark_kitchen';

export interface Store {
  id: string;
  company_id: string; // Parent company
  name: string;
  code: string; // Unique store code (e.g., "LOJA-001")
  type: StoreType;
  status: StoreStatus;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  manager_id: string | null;
  timezone: string;
  opening_hours: any; // JSON with operating hours
  delivery_radius_km: number | null;
  delivery_fee_cents: number | null;
  min_order_cents: number | null;
  is_accepting_orders: boolean;
  is_accepting_delivery: boolean;
  is_accepting_pickup: boolean;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  // New fields
  is_dark_kitchen: boolean;
  menu_slug: string | null;
  menu_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  manager?: {
    id: string;
    name: string;
  };
}

export interface StoreMenu {
  id: string;
  store_id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  show_prices: boolean;
  allow_orders: boolean;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  category_filter: string[];
  product_filter: string[];
  schedule: any | null;
  theme_config: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface StoreMenuProduct {
  id: string;
  store_menu_id: string;
  product_id: string;
  is_available: boolean;
  custom_price_cents: number | null;
  display_order: number;
  created_at: string;
}

export interface StoreInventory {
  id: string;
  store_id: string;
  product_id: string;
  erp_item_id: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  is_available: boolean;
  last_count_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreTransfer {
  id: string;
  company_id: string;
  from_store_id: string;
  to_store_id: string;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  requested_by: string;
  approved_by: string | null;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  dispatched_at: string | null;
  received_at: string | null;
}

export interface StoreTransferItem {
  id: string;
  transfer_id: string;
  product_id: string | null;
  erp_item_id: string | null;
  product_name: string;
  quantity_requested: number;
  quantity_sent: number | null;
  quantity_received: number | null;
}

export interface StoreFormData {
  name: string;
  code: string;
  type: StoreType;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  manager_id?: string;
  timezone?: string;
  delivery_radius_km?: number;
  delivery_fee_cents?: number;
  min_order_cents?: number;
  is_dark_kitchen?: boolean;
  menu_slug?: string;
  menu_enabled?: boolean;
}

export interface StoreMenuFormData {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  show_prices?: boolean;
  allow_orders?: boolean;
  delivery_enabled?: boolean;
  pickup_enabled?: boolean;
}

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  flagship: 'Loja Principal',
  branch: 'Filial',
  franchise: 'Franquia',
  kiosk: 'Quiosque',
  dark_kitchen: 'Dark Kitchen',
};

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  maintenance: 'Em Manutenção',
};

export const TRANSFER_STATUS_LABELS = {
  pending: 'Pendente',
  in_transit: 'Em Trânsito',
  received: 'Recebida',
  cancelled: 'Cancelada',
};
