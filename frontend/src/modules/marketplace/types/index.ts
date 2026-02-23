// Types for Marketplace Integrations (iFood, Rappi, Uber Eats)

export type MarketplaceProvider = 'ifood' | 'rappi' | 'ubereats' | 'aiqfome';
export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MarketplaceOrderStatus = 
  | 'placed' 
  | 'confirmed' 
  | 'integrated' 
  | 'preparation_started' 
  | 'ready_for_pickup' 
  | 'dispatched' 
  | 'delivered' 
  | 'cancelled';

export interface MarketplaceIntegration {
  id: string;
  company_id: string;
  provider: MarketplaceProvider;
  status: IntegrationStatus;
  merchant_id: string | null; // ID da loja no marketplace
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  webhook_url: string | null;
  auto_accept_orders: boolean;
  auto_print_orders: boolean;
  sync_menu: boolean;
  sync_stock: boolean;
  last_sync_at: string | null;
  error_message: string | null;
  // Dark Kitchen / Multi-store fields
  store_name: string | null;
  virtual_brand_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceOrder {
  id: string;
  company_id: string;
  integration_id: string;
  internal_order_id: string | null; // ID do pedido no nosso sistema
  external_order_id: string; // ID do pedido no marketplace
  display_id: string; // Número de exibição (ex: #1234)
  provider: MarketplaceProvider;
  status: MarketplaceOrderStatus;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_fee_cents: number;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_method: string;
  payment_prepaid: boolean;
  observations: string | null;
  items_json: any; // JSON com itens do pedido
  raw_payload: any; // Payload original do marketplace
  placed_at: string;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceCatalogSync {
  id: string;
  company_id: string;
  integration_id: string;
  product_id: string;
  external_product_id: string | null;
  sync_status: 'pending' | 'synced' | 'error';
  last_synced_at: string | null;
  error_message: string | null;
}

export const PROVIDER_LABELS: Record<MarketplaceProvider, string> = {
  ifood: 'iFood',
  rappi: 'Rappi',
  ubereats: 'Uber Eats',
  aiqfome: 'Aiqfome',
};

export const PROVIDER_COLORS: Record<MarketplaceProvider, string> = {
  ifood: '#EA1D2C',
  rappi: '#FF441F',
  ubereats: '#000000',
  aiqfome: '#7B2D8E',
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  disconnected: 'Desconectado',
  connecting: 'Conectando...',
  connected: 'Conectado',
  error: 'Erro',
};

export const ORDER_STATUS_LABELS: Record<MarketplaceOrderStatus, string> = {
  placed: 'Novo',
  confirmed: 'Confirmado',
  integrated: 'Integrado',
  preparation_started: 'Em Preparo',
  ready_for_pickup: 'Pronto',
  dispatched: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
