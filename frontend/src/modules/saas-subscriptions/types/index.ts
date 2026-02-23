// Types for SaaS Subscriptions Module

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'canceled';
export type BillingPeriod = 'monthly' | 'yearly';

export interface SaaSPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  billing_period: BillingPeriod;
  features: string[];
  max_orders_month: number | null;
  max_products: number | null;
  max_users: number | null;
  has_ai_features: boolean;
  has_whatsapp: boolean;
  has_delivery_tracking: boolean;
  has_multi_store: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SaaSSubscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  plan?: SaaSPlan;
}

export interface SaaSInvoice {
  id: string;
  company_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount_cents: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  invoice_url: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  canceled: 'Cancelada',
  trialing: 'Período de teste',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  failed: 'Falhou',
  canceled: 'Cancelado',
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
};
