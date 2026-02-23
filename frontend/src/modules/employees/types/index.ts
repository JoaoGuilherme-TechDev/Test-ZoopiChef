// Types for Employee Management Module

export type EmployeeRole = 'attendant' | 'cook' | 'manager' | 'deliverer' | 'cashier';
export type EmployeeDepartment = 'kitchen' | 'delivery' | 'cashier' | 'management' | 'service';
export type CommissionType = 'none' | 'fixed' | 'percent_sales' | 'percent_orders';
export type CommissionStatus = 'pending' | 'approved' | 'paid';

export interface Employee {
  id: string;
  company_id: string;
  profile_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  role: EmployeeRole;
  department: EmployeeDepartment | null;
  hire_date: string | null;
  termination_date: string | null;
  salary_cents: number;
  commission_percent: number;
  commission_type: CommissionType;
  fixed_commission_cents: number;
  is_active: boolean;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  company_id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  employee?: Employee;
}

export interface EmployeeCommission {
  id: string;
  company_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_sales_cents: number;
  total_orders: number;
  commission_cents: number;
  status: CommissionStatus;
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface EmployeeSale {
  id: string;
  company_id: string;
  employee_id: string;
  order_id: string | null;
  sale_date: string;
  sale_amount_cents: number;
  commission_cents: number;
  created_at: string;
  employee?: Employee;
}

export interface EmployeeFormData {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  role: EmployeeRole;
  department?: EmployeeDepartment;
  hire_date?: string;
  salary_cents?: number;
  commission_type: CommissionType;
  commission_percent?: number;
  fixed_commission_cents?: number;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  pix_key?: string;
  notes?: string;
}

export interface ScheduleFormData {
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  attendant: 'Atendente',
  cook: 'Cozinheiro',
  manager: 'Gerente',
  deliverer: 'Entregador',
  cashier: 'Caixa',
};

export const DEPARTMENT_LABELS: Record<EmployeeDepartment, string> = {
  kitchen: 'Cozinha',
  delivery: 'Entregas',
  cashier: 'Caixa',
  management: 'Gerência',
  service: 'Atendimento',
};

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  none: 'Sem comissão',
  fixed: 'Valor fixo por pedido',
  percent_sales: '% sobre vendas',
  percent_orders: '% por pedido',
};

export const DAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

// Options for Select components
export const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: 'attendant', label: 'Atendente' },
  { value: 'cook', label: 'Cozinheiro' },
  { value: 'manager', label: 'Gerente' },
  { value: 'deliverer', label: 'Entregador' },
  { value: 'cashier', label: 'Caixa' },
];

export const DEPARTMENT_OPTIONS: { value: EmployeeDepartment; label: string }[] = [
  { value: 'kitchen', label: 'Cozinha' },
  { value: 'delivery', label: 'Entregas' },
  { value: 'cashier', label: 'Caixa' },
  { value: 'management', label: 'Gerência' },
  { value: 'service', label: 'Atendimento' },
];

export const COMMISSION_TYPE_OPTIONS: { value: CommissionType; label: string }[] = [
  { value: 'none', label: 'Sem comissão' },
  { value: 'fixed', label: 'Valor fixo por pedido' },
  { value: 'percent_sales', label: '% sobre vendas' },
  { value: 'percent_orders', label: '% por pedido' },
];
