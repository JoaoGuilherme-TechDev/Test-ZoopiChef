// Types for Multi-CNPJ / Company Branches (Fiscal Identities)

export type RegimeTributario = 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';

export type FiscalAmbiente = 'homologation' | 'production';

export const REGIME_TRIBUTARIO_LABELS: Record<RegimeTributario, string> = {
  mei: 'MEI',
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
};

export const CRT_OPTIONS = [
  { value: 1, label: '1 - Simples Nacional' },
  { value: 2, label: '2 - Simples Nacional - Excesso de Sublimite' },
  { value: 3, label: '3 - Regime Normal' },
] as const;

export interface CompanyBranch {
  id: string;
  company_id: string;
  
  // Identificação Legal
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  
  // Endereço
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_ibge: string;
  telefone: string | null;
  
  // Configuração Tributária
  regime_tributario: RegimeTributario;
  crt: number;
  natureza_operacao: string;
  
  // NFE
  nfe_serie: number;
  nfe_proximo_numero: number;
  nfe_ambiente: FiscalAmbiente;
  
  // NFCE
  nfce_serie: number;
  nfce_proximo_numero: number;
  nfce_ambiente: FiscalAmbiente;
  
  // CSC
  csc_id: string | null;
  csc_token: string | null;
  
  // Certificado
  certificado_base64: string | null;
  certificado_senha: string | null;
  certificado_validade: string | null;
  
  // Provedor
  fiscal_provider: string | null;
  fiscal_api_token: string | null;
  
  // Status
  is_active: boolean;
  
  // Auditoria
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CompanyBranchFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_ibge: string;
  telefone?: string;
  
  regime_tributario: RegimeTributario;
  crt: number;
  natureza_operacao: string;
  
  nfe_serie: number;
  nfe_proximo_numero: number;
  nfe_ambiente: FiscalAmbiente;
  
  nfce_serie: number;
  nfce_proximo_numero: number;
  nfce_ambiente: FiscalAmbiente;
  
  csc_id?: string;
  csc_token?: string;
  
  fiscal_provider?: string;
  fiscal_api_token?: string;
}

export interface PDVFiscalValidation {
  out_branch_id: string | null;
  out_cnpj: string | null;
  out_razao_social: string | null;
  out_inscricao_estadual: string | null;
  out_nfe_serie: number | null;
  out_nfe_proximo_numero: number | null;
  out_nfce_serie: number | null;
  out_nfce_proximo_numero: number | null;
  out_csc_id: string | null;
  out_csc_token: string | null;
  out_certificado_valido: boolean;
  out_ambiente: string | null;
  out_natureza_operacao: string | null;
  out_is_valid: boolean;
  out_validation_error: string | null;
}
