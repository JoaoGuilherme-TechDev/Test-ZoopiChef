// Types for Smart Purchasing Module

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';
export type SuggestionStatus = 'pending' | 'approved' | 'ordered' | 'dismissed';
export type SuggestionReason = 'low_stock' | 'forecast' | 'scheduled';

export interface PurchaseSuggestion {
  id: string;
  company_id: string;
  erp_item_id: string | null;
  suggested_qty: number;
  reason: SuggestionReason | null;
  priority: SuggestionPriority;
  best_supplier_id: string | null;
  best_price: number | null;
  avg_consumption_daily: number | null;
  days_until_stockout: number | null;
  status: SuggestionStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  expires_at: string | null;
  // Joins
  erp_item?: {
    id: string;
    name: string;
    sku: string | null;
    current_stock: number;
    min_stock: number;
    avg_cost: number;
  };
  best_supplier?: {
    id: string;
    name: string;
  };
}

export interface SupplierQuote {
  id: string;
  company_id: string;
  erp_item_id: string;
  supplier_id: string;
  unit_price: number;
  min_qty: number;
  lead_time_days: number;
  valid_until: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  erp_item?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
}

export interface SupplierPriceHistory {
  id: string;
  company_id: string;
  erp_item_id: string;
  supplier_id: string;
  unit_price: number;
  recorded_at: string;
}

export interface QuoteFormData {
  erp_item_id: string;
  supplier_id: string;
  unit_price: number;
  min_qty?: number;
  lead_time_days?: number;
  valid_until?: string;
  notes?: string;
}

export const PRIORITY_LABELS: Record<SuggestionPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  ordered: 'Pedido feito',
  dismissed: 'Descartada',
};

export const REASON_LABELS: Record<SuggestionReason, string> = {
  low_stock: 'Estoque baixo',
  forecast: 'Previsão de demanda',
  scheduled: 'Compra programada',
};
