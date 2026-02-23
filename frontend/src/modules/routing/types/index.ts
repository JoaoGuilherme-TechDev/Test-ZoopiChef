// Types for Route Optimization Module

export type RouteStatus = 'planning' | 'active' | 'completed';
export type StopStatus = 'pending' | 'arrived' | 'delivered' | 'failed';

export interface DeliveryRoute {
  id: string;
  company_id: string;
  deliverer_id: string | null;
  route_date: string;
  status: RouteStatus;
  total_distance_km: number | null;
  total_duration_minutes: number | null;
  optimized_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  deliverer?: {
    id: string;
    name: string;
  };
  stops?: DeliveryRouteStop[];
}

export interface DeliveryRouteStop {
  id: string;
  company_id: string;
  route_id: string;
  order_id: string | null;
  stop_order: number;
  address: string;
  latitude: number | null;
  longitude: number | null;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  distance_from_previous_km: number | null;
  duration_from_previous_minutes: number | null;
  status: StopStatus;
  notes: string | null;
  created_at: string;
  // Joins
  order?: {
    id: string;
    customer_name: string;
    total: number;
  };
}

export interface RouteFormData {
  deliverer_id?: string;
  route_date: string;
}

export interface StopFormData {
  route_id: string;
  order_id?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  planning: 'Planejando',
  active: 'Em andamento',
  completed: 'Concluída',
};

export const STOP_STATUS_LABELS: Record<StopStatus, string> = {
  pending: 'Pendente',
  arrived: 'Chegou',
  delivered: 'Entregue',
  failed: 'Falhou',
};
