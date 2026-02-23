// =====================================================
// NF-e IMPORT TYPES
// =====================================================

export interface NFeParsedItem {
  nItem: number;
  cProd: string; // Código do produto no fornecedor
  cEAN: string; // Código de barras
  xProd: string; // Descrição do produto
  NCM: string;
  CFOP: string;
  uCom: string; // Unidade
  qCom: number; // Quantidade
  vUnCom: number; // Valor unitário
  vProd: number; // Valor total
  // Linked data
  linked_erp_item_id?: string;
  linked_erp_item_name?: string;
  link_source?: 'history' | 'ai' | 'manual' | 'none';
  ai_confidence?: number;
  ai_suggestion_reason?: string;
}

export interface NFeParseResult {
  success: boolean;
  import_id: string;
  supplier: {
    cnpj: string;
    name: string;
    existing_id?: string;
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
  items: NFeParsedItem[];
  summary: {
    total_items: number;
    linked_from_history: number;
    ai_suggested: number;
    needs_linking: number;
  };
}

export interface NFeImport {
  id: string;
  company_id: string;
  access_key: string;
  supplier_id: string | null;
  supplier_cnpj: string;
  supplier_name: string;
  invoice_number: string;
  invoice_series: string;
  issue_date: string;
  total_value: number;
  freight_value: number;
  discount_value: number;
  other_costs: number;
  status: 'pending' | 'reviewed' | 'imported' | 'cancelled';
  xml_content: string;
  items_json: NFeParsedItem[];
  purchase_entry_id: string | null;
  imported_by: string | null;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierProductLink {
  id: string;
  company_id: string;
  supplier_id: string | null;
  supplier_cnpj: string;
  supplier_product_code: string;
  supplier_product_name: string | null;
  supplier_ean: string | null;
  erp_item_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  erp_item?: {
    id: string;
    name: string;
  };
}

export const NFE_IMPORT_STATUS_LABELS: Record<NFeImport['status'], string> = {
  pending: 'Pendente',
  reviewed: 'Revisado',
  imported: 'Importado',
  cancelled: 'Cancelado',
};
