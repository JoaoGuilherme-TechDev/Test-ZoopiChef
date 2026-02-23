// Types for Assets/Maintenance Module

export type AssetCategory = 'kitchen' | 'refrigeration' | 'furniture' | 'electronics' | 'vehicle' | 'other';
export type AssetStatus = 'operational' | 'maintenance' | 'broken' | 'disposed';
export type MaintenanceType = 'preventive' | 'corrective' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'canceled';
export type AlertType = 'warranty_expiring' | 'maintenance_due' | 'maintenance_overdue';

export interface Asset {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  category: AssetCategory | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_value_cents: number | null;
  warranty_expires_at: string | null;
  location: string | null;
  status: AssetStatus;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetMaintenance {
  id: string;
  company_id: string;
  asset_id: string;
  maintenance_type: MaintenanceType;
  description: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  cost_cents: number | null;
  provider_name: string | null;
  provider_phone: string | null;
  status: MaintenanceStatus;
  recurrence_days: number | null;
  next_maintenance_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export interface AssetAlert {
  id: string;
  company_id: string;
  asset_id: string;
  alert_type: AlertType;
  message: string;
  due_date: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  asset?: Asset;
}

export interface AssetFormData {
  name: string;
  code?: string;
  category?: AssetCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_value_cents?: number;
  warranty_expires_at?: string;
  location?: string;
  notes?: string;
}

export interface MaintenanceFormData {
  asset_id: string;
  maintenance_type: MaintenanceType;
  description?: string;
  scheduled_date?: string;
  cost_cents?: number;
  provider_name?: string;
  provider_phone?: string;
  recurrence_days?: number;
  notes?: string;
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  kitchen: 'Cozinha',
  refrigeration: 'Refrigeração',
  furniture: 'Móveis',
  electronics: 'Eletrônicos',
  vehicle: 'Veículo',
  other: 'Outros',
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  operational: 'Operacional',
  maintenance: 'Em manutenção',
  broken: 'Quebrado',
  disposed: 'Baixado',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  inspection: 'Inspeção',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  canceled: 'Cancelada',
};
