// ==========================================
// ERP FINANCEIRO - TIPOS
// ==========================================

// Filtros comuns
export interface ERPFilters {
  startDate: string;
  endDate: string;
  operatorId?: string;
  paymentMethod?: string;
  costCenterId?: string;
  categoryId?: string;
}

// ==========================================
// ERP FINANCEIRO - TIPOS
// ==========================================

export interface ERPReceivable {
  id: string;
  company_id: string;
  customer_id: string | null;
  order_id: string | null;
  description: string;
  amount_cents: number;
  paid_amount_cents: number;
  due_date: string;
  status: 'aberto' | 'parcial' | 'recebido' | 'cancelado';
  payment_method: string | null;
  origin: 'manual' | 'pedido' | 'fiado' | 'outro';
  category_id: string | null;
  cost_center_id: string | null;
  notes: string | null;
  received_at: string | null;
  received_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  category_name?: string;
  cost_center_name?: string;
}

export interface ERPPayableInstallment {
  id: string;
  company_id: string;
  parent_payable_id: string | null;
  description: string;
  amount_cents: number;
  due_date: string;
  installment_number: number;
  total_installments: number;
  status: 'aberto' | 'pago' | 'atrasado' | 'cancelado';
  paid_at: string | null;
  paid_by: string | null;
  payment_method: string | null;
  category_id: string | null;
  cost_center_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  cost_center_name?: string;
}

export interface CostCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ERPProductCost {
  id: string;
  company_id: string;
  product_id: string;
  unit_cost_cents: number;
  optional_cost_cents: number;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
}

export interface ERPPaymentHistory {
  id: string;
  company_id: string;
  reference_type: 'receivable' | 'payable' | 'installment' | 'fiado' | 'caixa';
  reference_id: string;
  action: 'criado' | 'pago' | 'recebido' | 'parcial' | 'estornado' | 'cancelado' | 'editado';
  amount_cents: number;
  previous_status: string | null;
  new_status: string | null;
  origin: 'manual' | 'caixa' | 'acerto_entregador' | 'fiado' | 'sistema' | 'outro';
  performed_by: string | null;
  performed_at: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined fields
  performer_name?: string;
}

// Tipos para relatórios
export interface SalesReportFilters {
  startDate: string;
  endDate: string;
  operatorId?: string;
  paymentMethod?: string;
}

export interface SalesReportData {
  date: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
  delivery_fees: number;
  discounts: number;
}

export interface SalesByOperator {
  operator_id: string | null;
  operator_name: string;
  total_orders: number;
  total_revenue: number;
  avg_ticket: number;
}

export interface SalesByPaymentMethod {
  payment_method: string;
  total_orders: number;
  total_revenue: number;
  percentage: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
  avg_price: number;
}

export interface DiscountAnalysis {
  date: string;
  total_discounts: number;
  coupon_discounts: number;
  manual_discounts: number;
  orders_with_discount: number;
  avg_discount_percent: number;
}

export interface DeliveryFeeAnalysis {
  date: string;
  total_delivery_fees: number;
  total_deliveries: number;
  avg_fee: number;
  fee_vs_revenue_percent: number;
}

// DRE
export interface DREData {
  period: string;
  receita_bruta: number;
  descontos: number;
  taxas_delivery: number;
  receita_liquida: number;
  cmv: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  resultado_final: number;
  margem_bruta_percent: number;
  margem_liquida_percent: number;
}

// CMV
export interface CMVData {
  period: string;
  total_cost: number;
  total_revenue: number;
  cmv_percent: number;
  products_without_cost: number;
}

export interface ProductMargin {
  product_id: string;
  product_name: string;
  unit_cost: number;
  avg_sale_price: number;
  margin_value: number;
  margin_percent: number;
  quantity_sold: number;
  has_cost: boolean;
}

// Fluxo de Caixa Projetado
export interface CashFlowProjection {
  date: string;
  receivables: number;
  payables: number;
  net_flow: number;
  cumulative_balance: number;
}

// Dashboard ERP
export interface ERPDashboardData {
  receita_hoje: number;
  receita_mes: number;
  lucro_mes: number;
  cmv_mes: number;
  contas_pagar_abertas: number;
  contas_receber_abertas: number;
  caixa_atual: number;
  fluxo_projetado_7d: number;
}

// Parcelamento
export interface InstallmentConfig {
  repeat_count: number;
  interval_days: number;
  start_date: string;
  amount_cents: number;
  description: string;
  category_id?: string;
  cost_center_id?: string;
}
