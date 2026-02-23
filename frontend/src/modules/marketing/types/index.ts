// Tipos do Módulo de Marketing

export interface MarketingCampaign {
  id: string;
  company_id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'sms' | 'push';
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  audience_rule: string;
  audience_count: number;
  message_template: string;
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Métricas
  sent_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
  converted_count?: number;
}

export interface MarketingAutomation {
  id: string;
  company_id: string;
  name: string;
  trigger_type: 'new_customer' | 'abandoned_cart' | 'birthday' | 'inactive' | 'post_purchase';
  trigger_config: Record<string, unknown>;
  action_type: 'send_whatsapp' | 'send_email' | 'send_sms' | 'apply_coupon';
  action_config: Record<string, unknown>;
  is_active: boolean;
  executions_count: number;
  last_executed_at?: string;
  created_at: string;
}

export interface MarketingMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalReach: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgConversionRate: number;
  revenueGenerated: number;
  roiPercent: number;
}

export interface CampaignPerformance {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  criteria: Record<string, unknown>;
}
