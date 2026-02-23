// =====================================================
// ERP INVENTORY TYPES - 100% NEW MODULE
// =====================================================

export type ERPItemType = 'sale' | 'raw' | 'consumable' | 'service' | 'cleaning' | 'fixed_asset' | 'packaging' | 'resale';
export type ERPCostMethod = 'weighted_avg';
export type ERPEntryStatus = 'draft' | 'posted';
export type ERPMovementType = 'purchase_in' | 'sale_out' | 'adjust_in' | 'adjust_out' | 'waste_out' | 'transfer';

export interface ERPUnit {
  id: string;
  company_id: string;
  name: string;
  symbol: string;
  unit_type: string;
  created_at: string;
  updated_at: string;
}

export interface ERPUnitConversion {
  id: string;
  company_id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
  created_at: string;
}

export interface ERPItem {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  item_type: ERPItemType;
  base_unit_id: string | null;
  track_stock: boolean;
  active: boolean;
  min_stock: number;
  current_stock: number;
  cost_method: ERPCostMethod;
  avg_cost: number;
  last_cost: number;
  created_at: string;
  updated_at: string;
  // Joined
  base_unit?: ERPUnit;
}

export interface ERPProductMap {
  id: string;
  company_id: string;
  product_id: string;
  erp_item_id: string;
  created_at: string;
  // Joined
  product?: {
    id: string;
    name: string;
    price: number;
  };
  erp_item?: ERPItem;
}

export interface ERPSupplier {
  id: string;
  company_id: string;
  name: string;
  doc: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ERPPurchaseEntry {
  id: string;
  company_id: string;
  supplier_id: string | null;
  entry_date: string;
  invoice_number: string | null;
  freight: number;
  taxes: number;
  status: ERPEntryStatus;
  notes: string | null;
  created_by: string | null;
  posted_at: string | null;
  posted_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: ERPSupplier;
  items?: ERPPurchaseEntryItem[];
}

export interface ERPPurchaseEntryItem {
  id: string;
  company_id: string;
  entry_id: string;
  erp_item_id: string;
  qty: number;
  unit_id: string | null;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  // Joined
  erp_item?: ERPItem;
  unit?: ERPUnit;
}

export interface ERPStockMovement {
  id: string;
  company_id: string;
  erp_item_id: string;
  movement_type: ERPMovementType;
  qty: number;
  unit_id: string | null;
  unit_cost_snapshot: number | null;
  balance_after: number | null;
  source_table: string | null;
  source_id: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  erp_item?: ERPItem;
  unit?: ERPUnit;
}

export interface ERPRecipe {
  id: string;
  company_id: string;
  sale_item_id: string;
  version: number;
  active: boolean;
  yield_qty: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  sale_item?: ERPItem;
  lines?: ERPRecipeLine[];
}

export interface ERPRecipeLine {
  id: string;
  company_id: string;
  recipe_id: string;
  component_item_id: string;
  qty: number;
  unit_id: string | null;
  waste_percent: number;
  created_at: string;
  // Joined
  component_item?: ERPItem;
  unit?: ERPUnit;
}

export interface ERPOrderCogs {
  id: string;
  company_id: string;
  order_id: string;
  cogs_total: number;
  computed_at: string;
  compute_source: string;
  details_json: any;
}

export interface ERPPricing {
  id: string;
  company_id: string;
  sale_item_id: string;
  target_markup_percent: number | null;
  target_margin_percent: number | null;
  suggested_price: number | null;
  current_cost: number | null;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  sale_item?: ERPItem;
}

// =====================================================
// FORM TYPES
// =====================================================

export interface ERPItemFormData {
  name: string;
  sku?: string;
  item_type: ERPItemType;
  base_unit_id?: string;
  track_stock: boolean;
  min_stock: number;
}

export interface ERPSupplierFormData {
  name: string;
  doc?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface ERPPurchaseEntryFormData {
  supplier_id?: string;
  entry_date: string;
  invoice_number?: string;
  freight: number;
  taxes: number;
  notes?: string;
  items: {
    erp_item_id: string;
    qty: number;
    unit_id?: string;
    unit_cost: number;
  }[];
}

export interface ERPRecipeFormData {
  sale_item_id: string;
  yield_qty: number;
  notes?: string;
  lines: {
    component_item_id: string;
    qty: number;
    unit_id?: string;
    waste_percent: number;
  }[];
}

export interface ERPStockAdjustFormData {
  erp_item_id: string;
  adjustment_type: 'adjust_in' | 'adjust_out' | 'waste_out';
  qty: number;
  reason: string;
}

// =====================================================
// COMPUTED TYPES
// =====================================================

export interface ERPRecipeCost {
  recipe_id: string;
  sale_item_id: string;
  sale_item_name: string;
  total_cost: number;
  lines: {
    component_item_id: string;
    component_name: string;
    qty: number;
    waste_percent: number;
    unit_cost: number;
    line_cost: number;
  }[];
}

export interface ERPCMVReport {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_cogs: number;
  gross_margin: number;
  gross_margin_percent: number;
  by_product: {
    product_id: string;
    product_name: string;
    qty_sold: number;
    revenue: number;
    cogs: number;
    margin: number;
    margin_percent: number;
  }[];
}

export interface ERPPricingAnalysis {
  sale_item_id: string;
  sale_item_name: string;
  current_cost: number;
  current_price: number;
  current_markup_percent: number;
  current_margin_percent: number;
  target_markup_percent: number | null;
  target_margin_percent: number | null;
  suggested_price_by_markup: number | null;
  suggested_price_by_margin: number | null;
  is_below_cost: boolean;
  margin_alert: boolean;
}

export const ITEM_TYPE_LABELS: Record<ERPItemType, string> = {
  sale: 'Produto de Venda Direta',
  resale: 'Revenda (compra/venda)',
  raw: 'Matéria-Prima',
  consumable: 'Material de Consumo',
  service: 'Serviço',
  cleaning: 'Material de Limpeza',
  fixed_asset: 'Imobilizado',
  packaging: 'Embalagem',
};

export const MOVEMENT_TYPE_LABELS: Record<ERPMovementType, string> = {
  purchase_in: 'Entrada (Compra)',
  sale_out: 'Saída (Venda)',
  adjust_in: 'Ajuste (+)',
  adjust_out: 'Ajuste (-)',
  waste_out: 'Perda/Desperdício',
  transfer: 'Transferência',
};

export const ENTRY_STATUS_LABELS: Record<ERPEntryStatus, string> = {
  draft: 'Rascunho',
  posted: 'Lançado',
};
