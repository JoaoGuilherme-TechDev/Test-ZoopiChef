// =====================================================
// NF-e WIZARD TYPES - Fluxo completo de entrada
// =====================================================

import type { NFeParsedItem, NFeParseResult } from './nfe';

export type WizardStep = 'manifest' | 'items' | 'financial' | 'complete';

export type ManifestStatus = 'none' | 'ciencia' | 'confirmacao' | 'desconhecimento' | 'nao_realizada';

export type MarginLevel = 'excellent' | 'good' | 'warning' | 'critical';

export interface NFeWizardItem extends NFeParsedItem {
  // Extended fields for item entry
  sale_price?: number;
  margin_percent?: number;
  margin_level?: MarginLevel;
  category_id?: string;
  subcategory_id?: string;
  ean_code?: string;
  internal_code?: string;
  product_name_override?: string;
  conversion_factor?: number;
  conversion_unit_from?: string;
  conversion_unit_to?: string;
  cfop_entry?: string;
  is_new_item?: boolean;
  needs_creation?: boolean;
}

export interface NFeWizardData {
  import_id: string;
  // Step 1: Manifest
  manifest_status: ManifestStatus;
  manifest_date?: string;
  // Invoice data
  supplier: {
    id?: string;
    cnpj: string;
    name: string;
  };
  invoice: {
    number: string;
    series: string;
    date: string;
    access_key: string;
  };
  totals: {
    products: number;
    freight: number;
    discount: number;
    other: number;
    total: number;
  };
  // Step 2: Items
  items: NFeWizardItem[];
  default_cfop_entry: string;
  // Step 3: Financial
  category_id?: string;
  cost_center_id?: string;
  payment_conditions?: {
    installments: number;
    first_due_date: string;
    interval_days: number;
  };
  notes?: string;
}

export interface NFeFinalizationResult {
  success: boolean;
  purchase_entry_id?: string;
  payable_id?: string;
  stock_movements_count?: number;
  updated_recipes_count?: number;
  errors?: string[];
}

export const MANIFEST_STATUS_LABELS: Record<ManifestStatus, string> = {
  none: 'Não manifestada',
  ciencia: 'Ciência da Operação',
  confirmacao: 'Confirmação da Operação',
  desconhecimento: 'Desconhecimento da Operação',
  nao_realizada: 'Operação não Realizada',
};

export const MARGIN_LEVEL_CONFIG: Record<MarginLevel, { color: string; bgColor: string; label: string }> = {
  excellent: { color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', label: 'Ótima margem' },
  good: { color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', label: 'Boa margem' },
  warning: { color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200', label: 'Margem baixa' },
  critical: { color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', label: 'Sem margem' },
};

export function calculateMarginLevel(costPrice: number, salePrice: number): MarginLevel {
  if (salePrice <= 0 || costPrice <= 0) return 'critical';
  
  const marginPercent = ((salePrice - costPrice) / salePrice) * 100;
  
  if (marginPercent >= 50) return 'excellent';
  if (marginPercent >= 30) return 'good';
  if (marginPercent >= 10) return 'warning';
  return 'critical';
}

export function calculateMarginPercent(costPrice: number, salePrice: number): number {
  if (salePrice <= 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}

// AI suggestion types for auto-filling fields
export interface AIFieldSuggestion {
  field: string;
  value: string | number;
  confidence: number;
  reason?: string;
}

export interface AIItemSuggestions {
  category_suggestion?: { id: string; name: string; confidence: number };
  subcategory_suggestion?: { id: string; name: string; confidence: number };
  sale_price_suggestion?: { value: number; confidence: number; based_on?: string };
  name_suggestion?: { value: string; confidence: number };
  cfop_suggestion?: { value: string; confidence: number };
}
