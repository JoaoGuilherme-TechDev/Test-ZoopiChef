// ==========================================
// CRM MODULE - TYPES
// ==========================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadSource = 'website' | 'whatsapp' | 'instagram' | 'facebook' | 'referral' | 'other';
export type ActivityType = 'call' | 'email' | 'meeting' | 'whatsapp' | 'note' | 'task';

export interface CRMLead {
  id: string;
  company_id: string;
  customer_id?: string;
  name: string;
  email?: string;
  phone?: string;
  status: LeadStatus;
  source: LeadSource;
  estimated_value?: number;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  tags?: string[];
  lost_reason?: string;
  won_at?: string;
  lost_at?: string;
  created_at: string;
  updated_at: string;
  // Pipeline fields
  pipeline_stage_id?: string;
  score?: number;
  // Joined
  customer_name?: string;
  assigned_to_name?: string;
}

export interface CRMActivity {
  id: string;
  company_id: string;
  lead_id?: string;
  customer_id?: string;
  type: ActivityType;
  subject: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  // Joined
  lead_name?: string;
  customer_name?: string;
  created_by_name?: string;
}

export interface CRMPipelineStage {
  status: LeadStatus;
  label: string;
  color: string;
  leads: CRMLead[];
  totalValue: number;
}

export interface Customer360 {
  customer: {
    id: string;
    name: string;
    email?: string;
    whatsapp?: string;
    created_at: string;
  };
  stats: {
    total_orders: number;
    total_spent: number;
    avg_ticket: number;
    last_order_date?: string;
    days_since_last_order?: number;
  };
  orders: Array<{
    id: string;
    order_number: number;
    total: number;
    status: string;
    created_at: string;
  }>;
  activities: CRMActivity[];
  segment?: {
    type: string;
    is_vip: boolean;
    is_frequent: boolean;
    churn_risk?: number;
  };
}

export interface CRMDashboardData {
  total_leads: number;
  leads_by_status: Record<LeadStatus, number>;
  pipeline_value: number;
  conversion_rate: number;
  avg_deal_size: number;
  activities_today: number;
  overdue_activities: number;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-500' },
  contacted: { label: 'Contatado', color: 'bg-yellow-500' },
  qualified: { label: 'Qualificado', color: 'bg-purple-500' },
  proposal: { label: 'Proposta', color: 'bg-orange-500' },
  negotiation: { label: 'Negociação', color: 'bg-indigo-500' },
  won: { label: 'Ganho', color: 'bg-green-500' },
  lost: { label: 'Perdido', color: 'bg-red-500' },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string; icon: string }> = {
  website: { label: 'Website', icon: '🌐' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  instagram: { label: 'Instagram', icon: '📷' },
  facebook: { label: 'Facebook', icon: '👤' },
  referral: { label: 'Indicação', icon: '🤝' },
  other: { label: 'Outro', icon: '📌' },
};

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: string }> = {
  call: { label: 'Ligação', icon: '📞' },
  email: { label: 'Email', icon: '📧' },
  meeting: { label: 'Reunião', icon: '🤝' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  note: { label: 'Nota', icon: '📝' },
  task: { label: 'Tarefa', icon: '✅' },
};
