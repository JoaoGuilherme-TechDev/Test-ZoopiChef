// Types for Fiscal Module (NF-e, NFC-e, NFS-e)
export * from './company-branch';

export type DocumentType = 'nfe' | 'nfce' | 'nfse';
export type DocumentStatus = 'draft' | 'processing' | 'authorized' | 'cancelled' | 'denied' | 'error';
export type FiscalEnvironment = 'production' | 'homologation';

// Tax Regime Types
export type TaxRegime = 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real';

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  mei: 'MEI',
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

// Origin of Goods (Tabela A - CST)
export type ProductOrigin = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export const PRODUCT_ORIGIN_LABELS: Record<ProductOrigin, string> = {
  '0': 'Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8',
  '1': 'Estrangeira - Importação direta',
  '2': 'Estrangeira - Adquirida no mercado interno',
  '3': 'Nacional, mercadoria ou bem com Conteúdo de Importação > 40%',
  '4': 'Nacional, cuja produção tenha sido feita em conformidade com PPB',
  '5': 'Nacional, mercadoria ou bem com Conteúdo de Importação <= 40%',
  '6': 'Estrangeira - Importação direta, sem similar nacional',
  '7': 'Estrangeira - Adquirida no mercado interno, sem similar nacional',
  '8': 'Nacional, mercadoria ou bem com Conteúdo de Importação > 70%',
};

// Tax Status for Products
export type TaxStatus = 'tributado' | 'nao_tributado' | 'servico' | 'isento';

export const TAX_STATUS_LABELS: Record<TaxStatus, string> = {
  tributado: 'Tributado',
  nao_tributado: 'Não Tributado',
  servico: 'Serviço',
  isento: 'Isento',
};

// CST ICMS
export const CST_ICMS_OPTIONS = [
  { value: '00', label: '00 - Tributada integralmente' },
  { value: '10', label: '10 - Tributada e com cobrança do ICMS por ST' },
  { value: '20', label: '20 - Com redução de base de cálculo' },
  { value: '30', label: '30 - Isenta/não tributada e com cobrança do ICMS por ST' },
  { value: '40', label: '40 - Isenta' },
  { value: '41', label: '41 - Não tributada' },
  { value: '50', label: '50 - Suspensão' },
  { value: '51', label: '51 - Diferimento' },
  { value: '60', label: '60 - ICMS cobrado anteriormente por ST' },
  { value: '70', label: '70 - Com redução de base de cálculo e cobrança do ICMS por ST' },
  { value: '90', label: '90 - Outras' },
] as const;

// CSOSN (Simples Nacional)
export const CSOSN_OPTIONS = [
  { value: '101', label: '101 - Tributada com permissão de crédito' },
  { value: '102', label: '102 - Tributada sem permissão de crédito' },
  { value: '103', label: '103 - Isenção do ICMS para faixa de receita bruta' },
  { value: '201', label: '201 - Tributada com permissão de crédito e com ST' },
  { value: '202', label: '202 - Tributada sem permissão de crédito e com ST' },
  { value: '203', label: '203 - Isenção do ICMS para faixa de receita bruta e com ST' },
  { value: '300', label: '300 - Imune' },
  { value: '400', label: '400 - Não tributada' },
  { value: '500', label: '500 - ICMS cobrado anteriormente por ST' },
  { value: '900', label: '900 - Outros' },
] as const;

// CST PIS/COFINS
export const CST_PIS_COFINS_OPTIONS = [
  { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
  { value: '02', label: '02 - Operação Tributável com Alíquota Diferenciada' },
  { value: '03', label: '03 - Operação Tributável com Alíquota por Unidade' },
  { value: '04', label: '04 - Operação Tributável Monofásica - Revenda à Alíquota Zero' },
  { value: '05', label: '05 - Operação Tributável por ST' },
  { value: '06', label: '06 - Operação Tributável à Alíquota Zero' },
  { value: '07', label: '07 - Operação Isenta da Contribuição' },
  { value: '08', label: '08 - Operação sem Incidência da Contribuição' },
  { value: '09', label: '09 - Operação com Suspensão da Contribuição' },
  { value: '49', label: '49 - Outras Operações de Saída' },
  { value: '99', label: '99 - Outras Operações' },
] as const;

// CST IPI
export const CST_IPI_OPTIONS = [
  { value: '00', label: '00 - Entrada com Recuperação de Crédito' },
  { value: '01', label: '01 - Entrada Tributável com Alíquota Zero' },
  { value: '02', label: '02 - Entrada Isenta' },
  { value: '03', label: '03 - Entrada Não-Tributada' },
  { value: '04', label: '04 - Entrada Imune' },
  { value: '05', label: '05 - Entrada com Suspensão' },
  { value: '49', label: '49 - Outras Entradas' },
  { value: '50', label: '50 - Saída Tributada' },
  { value: '51', label: '51 - Saída Tributável com Alíquota Zero' },
  { value: '52', label: '52 - Saída Isenta' },
  { value: '53', label: '53 - Saída Não-Tributada' },
  { value: '54', label: '54 - Saída Imune' },
  { value: '55', label: '55 - Saída com Suspensão' },
  { value: '99', label: '99 - Outras Saídas' },
] as const;

export interface FiscalConfig {
  id: string;
  company_id: string;
  environment: FiscalEnvironment;
  provider: 'focus_nfe' | 'nfe_io' | 'webmania';
  api_token: string | null;
  certificate_password: string | null;
  certificate_expires_at: string | null;
  nfe_series: number;
  nfce_series: number;
  nfse_series: number;
  next_nfe_number: number;
  next_nfce_number: number;
  next_nfse_number: number;
  csc_id: string | null;
  csc_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocument {
  id: string;
  company_id: string;
  order_id: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  number: number;
  series: number;
  access_key: string | null;
  protocol_number: string | null;
  authorization_date: string | null;
  xml_content: string | null;
  pdf_url: string | null;
  recipient_name: string;
  recipient_document: string;
  recipient_email: string | null;
  total_cents: number;
  icms_cents: number;
  ipi_cents: number;
  pis_cents: number;
  cofins_cents: number;
  error_message: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocumentItem {
  id: string;
  document_id: string;
  product_id: string | null;
  product_name: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  icms_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
}

export interface FiscalFormData {
  order_id?: string;
  document_type: DocumentType;
  recipient_name: string;
  recipient_document: string;
  recipient_email?: string;
  items: {
    product_id?: string;
    product_name: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unit_price_cents: number;
  }[];
}

// NCM Code Reference
export interface NCMCode {
  id: string;
  code: string;
  description: string;
  chapter: string | null;
  position: string | null;
  subposition: string | null;
  item: string | null;
  unit: string;
  ipi_rate: number;
  is_service: boolean;
  created_at: string;
  updated_at: string;
}

// CFOP Code Reference
export interface CFOPCode {
  id: string;
  code: string;
  description: string;
  operation_type: 'entrada' | 'saida';
  scope: 'estadual' | 'interestadual' | 'exterior';
  nature: string | null;
  generates_credit: boolean;
  highlights_icms: boolean;
  is_return: boolean;
  is_transfer: boolean;
  created_at: string;
}

// CEST Code Reference
export interface CESTCode {
  id: string;
  code: string;
  description: string;
  segment: string | null;
  ncm_codes: string[];
  created_at: string;
}

// State Tax Rules
export interface StateTaxRule {
  id: string;
  state_origin: string;
  state_destination: string;
  icms_internal_rate: number;
  icms_interstate_rate: number;
  difal_rate: number;
  fcp_rate: number;
  mva_rate: number;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
}

// Fiscal Rules per Company
export interface FiscalRule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  ncm_code: string | null;
  cfop_entrada: string | null;
  cfop_saida: string | null;
  cfop_devolucao: string | null;
  cst_icms: string | null;
  csosn: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  cst_ipi: string | null;
  icms_rate: number | null;
  icms_reduction: number | null;
  ipi_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  iss_rate: number | null;
  has_st: boolean;
  st_mva: number | null;
  st_icms_rate: number | null;
  is_exempt: boolean;
  exemption_reason: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// IBS/CBS Rules (Tax Reform)
export interface IBSCBSRule {
  id: string;
  company_id: string | null;
  ncm_code: string | null;
  description: string;
  ibs_rate: number;
  ibs_state_share: number;
  ibs_municipal_share: number;
  cbs_rate: number;
  is_reduced_rate: boolean;
  reduction_percent: number;
  is_exempt: boolean;
  exemption_type: string | null;
  specific_regime: string | null;
  transition_year: number | null;
  effective_from: string;
  effective_until: string | null;
  legal_basis: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Product Fiscal Data
export interface ProductFiscalData {
  id: string;
  product_id: string;
  company_id: string;
  ncm_code: string | null;
  cest_code: string | null;
  cfop_venda_estadual: string;
  cfop_venda_interestadual: string;
  cfop_venda_exterior: string;
  cfop_devolucao: string;
  origem: ProductOrigin;
  cst_icms: string;
  csosn: string;
  cst_pis: string;
  cst_cofins: string;
  cst_ipi: string;
  icms_rate: number | null;
  ipi_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  iss_rate: number | null;
  ibs_rate: number | null;
  cbs_rate: number | null;
  has_st: boolean;
  st_mva: number | null;
  st_icms_rate: number | null;
  has_benefit: boolean;
  benefit_code: string | null;
  benefit_description: string | null;
  fiscal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  nfe: 'NF-e',
  nfce: 'NFC-e',
  nfse: 'NFS-e',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Rascunho',
  processing: 'Processando',
  authorized: 'Autorizada',
  cancelled: 'Cancelada',
  denied: 'Denegada',
  error: 'Erro',
};

export const ENVIRONMENT_LABELS: Record<FiscalEnvironment, string> = {
  production: 'Produção',
  homologation: 'Homologação',
};

// Brazilian States
export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
] as const;
