// Types para o módulo de Alterações em Lote

export interface BatchProductUpdate {
  ncm_code?: string;
  cfop_code?: string;
  cest_code?: string;
  is_weighted?: boolean;
  production_location?: string;
  tax_status?: string;
  origem?: string;
  aparece_ifood?: boolean;
  aparece_delivery?: boolean;
  loyalty_points?: number;
}

export interface BatchPriceChange {
  productId: string;
  productName: string;
  currentPrice: number;
  newPrice: number;
  currentSalePrice?: number | null;
  newSalePrice?: number | null;
}

export interface BatchNeighborhoodUpdate {
  neighborhoodId: string;
  neighborhood: string;
  city: string;
  currentFee: number;
  newFee: number;
}

export interface BatchChangeLog {
  id: string;
  timestamp: Date;
  action: 'product_update' | 'price_change' | 'neighborhood_update' | 'move_subcategory';
  entityType: 'product' | 'neighborhood' | 'subcategory';
  totalAffected: number;
  changes: BatchChangeDetail[];
  userId?: string;
}

export interface BatchChangeDetail {
  entityId: string;
  entityName: string;
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

export interface ProductForBatch {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  ncm_code?: string | null;
  cfop_code?: string | null;
  cest_code?: string | null;
  is_weighted?: boolean | null;
  production_location?: string | null;
  tax_status?: string | null;
  origem?: string | null;
  aparece_ifood?: boolean | null;
  aparece_delivery?: boolean | null;
  subcategory_id?: string;
  subcategory?: {
    id: string;
    name: string;
    category_id: string;
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface NeighborhoodForBatch {
  id: string;
  neighborhood: string;
  city: string;
  fee: number;
  estimated_minutes?: number | null;
  active: boolean;
}

export interface BatchFieldConfig {
  key: keyof BatchProductUpdate;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export const BATCH_PRODUCT_FIELDS: BatchFieldConfig[] = [
  { key: 'loyalty_points', label: 'Pontos de Fidelidade', type: 'number', placeholder: 'Ex: 10' },
  { key: 'ncm_code', label: 'NCM', type: 'text', placeholder: 'Ex: 21069090' },
  { key: 'cfop_code', label: 'CFOP', type: 'text', placeholder: 'Ex: 5102' },
  { key: 'cest_code', label: 'CEST', type: 'text', placeholder: 'Ex: 0300100' },
  { key: 'is_weighted', label: 'Produto Pesado', type: 'boolean' },
  { 
    key: 'tax_status', 
    label: 'Situação Tributária', 
    type: 'select',
    options: [
      { value: 'tributado', label: 'Tributado' },
      { value: 'isento', label: 'Isento' },
      { value: 'nao_tributado', label: 'Não Tributado' },
      { value: 'substituicao', label: 'Substituição Tributária' },
    ]
  },
  { 
    key: 'origem', 
    label: 'Origem', 
    type: 'select',
    options: [
      { value: '0', label: '0 - Nacional' },
      { value: '1', label: '1 - Estrangeira - Importação direta' },
      { value: '2', label: '2 - Estrangeira - Mercado interno' },
      { value: '3', label: '3 - Nacional - Conteúdo importação > 40%' },
      { value: '4', label: '4 - Nacional - PPB' },
      { value: '5', label: '5 - Nacional - Conteúdo importação < 40%' },
      { value: '6', label: '6 - Estrangeira - Sem similar nacional' },
      { value: '7', label: '7 - Nacional - Conteúdo importação > 70%' },
    ]
  },
  { key: 'aparece_ifood', label: 'Aparece no iFood', type: 'boolean' },
  { key: 'aparece_delivery', label: 'Aparece no Delivery', type: 'boolean' },
  { key: 'production_location', label: 'Local de Produção', type: 'text', placeholder: 'Ex: Cozinha, Bar' },
];
