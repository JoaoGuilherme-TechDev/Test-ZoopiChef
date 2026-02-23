// Backup Module Types

export interface BackupConfig {
  id: string;
  company_id: string;
  is_enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  frequency_value: number;
  scheduled_time: string;
  scheduled_day_of_week: number;
  scheduled_day_of_month: number;
  retention_days: number;
  
  // Modules
  include_products: boolean;
  include_categories: boolean;
  include_customers: boolean;
  include_orders: boolean;
  include_financial: boolean;
  include_inventory: boolean;
  include_settings: boolean;
  include_reports: boolean;
  include_users: boolean;
  
  // Destinations
  save_to_google_drive: boolean;
  google_drive_folder_id: string | null;
  google_drive_tokens: GoogleDriveTokens | null;
  
  save_to_local: boolean;
  local_path: string | null;
  
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_size_bytes: number | null;
  
  created_at: string;
  updated_at: string;
}

export interface BackupLog {
  id: string;
  company_id: string;
  backup_type: 'company' | 'saas';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  file_url: string | null;
  storage_location: 'local' | 'google_drive' | 'supabase_storage';
  modules_included: string[] | null;
  error_message: string | null;
  triggered_by: 'scheduled' | 'manual' | 'agent';
  triggered_by_user_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface SaasBackupConfig {
  id: string;
  is_enabled: boolean;
  frequency: string;
  scheduled_time: string;
  retention_days: number;
  save_to_google_drive: boolean;
  google_drive_folder_id: string | null;
  google_drive_tokens: GoogleDriveTokens | null;
  include_all_companies: boolean;
  include_saas_tables: boolean;
  last_backup_at: string | null;
  last_backup_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupQueue {
  id: string;
  company_id: string;
  backup_log_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  download_url: string | null;
  local_path: string | null;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface GoogleDriveTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export interface BackupModule {
  id: string;
  name: string;
  description: string;
  tables: string[];
  icon: string;
}

export const BACKUP_MODULES: BackupModule[] = [
  {
    id: 'products',
    name: 'Produtos',
    description: 'Produtos, categorias, subcategorias, opcionais',
    tables: ['products', 'categories', 'subcategories', 'optionals', 'optional_items'],
    icon: 'Package',
  },
  {
    id: 'categories',
    name: 'Categorias',
    description: 'Categorias e subcategorias',
    tables: ['categories', 'subcategories'],
    icon: 'FolderTree',
  },
  {
    id: 'customers',
    name: 'Clientes',
    description: 'Clientes e endereços',
    tables: ['customers', 'customer_addresses'],
    icon: 'Users',
  },
  {
    id: 'orders',
    name: 'Pedidos',
    description: 'Pedidos e itens',
    tables: ['orders', 'order_items'],
    icon: 'ShoppingBag',
  },
  {
    id: 'financial',
    name: 'Financeiro',
    description: 'Contas, sessões de caixa, transações',
    tables: ['accounts_payable', 'accounts_receivable', 'cash_sessions', 'cash_movements', 'bank_accounts', 'bank_transactions'],
    icon: 'DollarSign',
  },
  {
    id: 'inventory',
    name: 'Estoque',
    description: 'Itens de estoque e movimentações',
    tables: ['erp_items', 'erp_movements', 'erp_suppliers'],
    icon: 'Warehouse',
  },
  {
    id: 'settings',
    name: 'Configurações',
    description: 'Configurações da empresa',
    tables: ['companies', 'delivery_areas', 'payment_methods', 'printers', 'tv_screens'],
    icon: 'Settings',
  },
  {
    id: 'reports',
    name: 'Relatórios',
    description: 'Dados de relatórios e dashboards',
    tables: ['cash_closings', 'order_reviews'],
    icon: 'BarChart3',
  },
  {
    id: 'users',
    name: 'Usuários',
    description: 'Perfis e permissões',
    tables: ['profiles', 'user_roles'],
    icon: 'UserCog',
  },
];

export const FREQUENCY_OPTIONS = [
  { value: 'hourly', label: 'A cada X horas' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];
