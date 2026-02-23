import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Users, LogOut, Home, Tags, Layers, Package, ClipboardList, UserCircle, Bike, Calculator, Image, Gift, Sparkles, Link2, Tv, Megaphone, Brain, Send, RefreshCw, Clock, Palette, Plug, Bot, Layout, Shield, ChefHat, Printer, ShoppingBag, Utensils, Calendar, CalendarClock, FlaskConical, MessageCircle, Phone, Truck, BarChart3, Star, Wallet, GripVertical, History, CheckSquare, Timer, Trophy, MessageSquare, Boxes, Ticket, TrendingUp, UtensilsCrossed, Warehouse, ShoppingCart, FileText, ArrowRightLeft, Radio, AlertTriangle, Volume2, UserPlus, FileSpreadsheet, Activity, Scale, Monitor, MapPin, UserCheck, Wrench, Route, ShoppingBasket, Receipt, Store, Network, Contact, DollarSign, CreditCard, Zap, Target, Handshake, Server } from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useIsSaasAdmin } from '@/hooks/useSaasAdmin';
import { useIsSaasUser, useCanAccessAllCompanies } from '@/hooks/useSaasUsers';
import { useMenuOrder } from '@/hooks/useMenuOrder';
import { useCompanyModules } from '@/hooks/useCompanyModules';
import { CompanySelector } from '@/components/saas/CompanySelector';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SystemVersion } from '@/components/layout/SystemVersion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  icon: any;
  path: string;
}

const mainMenuItems: MenuItem[] = [
  { title: 'Dashboard', icon: Home, path: '/' },
  { title: 'PDV Loja', icon: Store, path: '/pdv-loja' },
  { title: 'Terminal Operador', icon: Layout, path: '/terminal' },
  { title: 'Painel Desempenho', icon: TrendingUp, path: '/performance-panel' },
  { title: 'Performance Operacional', icon: Activity, path: '/operations-performance' },
  { title: 'Análise de Desempenho', icon: BarChart3, path: '/staff-performance' },
  { title: 'Pedidos', icon: ClipboardList, path: '/orders' },
  { title: 'Agendamentos', icon: CalendarClock, path: '/agendamentos' },
  { title: 'Pedido Ligação', icon: Phone, path: '/phone-order' },
  { title: 'Mesas', icon: UtensilsCrossed, path: '/tables' },
  { title: 'Comandas', icon: Tags, path: '/comandas' },
  { title: 'Self Check-out', icon: Receipt, path: '/self-checkout' },
  { title: 'Reservas', icon: CalendarClock, path: '/reservations' },
  { title: 'Chamados Salão', icon: Radio, path: '/service-calls' },
  { title: 'KDS Cozinha', icon: ChefHat, path: '/kds' },
  { title: 'WhatsApp', icon: MessageCircle, path: '/whatsapp' },
  { title: 'Chat Online', icon: MessageCircle, path: '/chat-monitor' },
  { title: 'Clientes', icon: UserCircle, path: '/customers' },
  { title: 'Avaliações', icon: MessageSquare, path: '/reviews' },
  { title: 'Entregadores', icon: Bike, path: '/deliverers' },
  { title: 'Painel GPS', icon: MapPin, path: '/deliverer-tracking' },
  { title: 'Expedição', icon: Truck, path: '/delivery-expedition' },
  { title: 'Crachá Entregador', icon: UserCheck, path: '/deliverer-badge' },
  { title: 'Ranking Entregas', icon: Trophy, path: '/deliverer-rankings' },
  { title: 'Acerto', icon: Calculator, path: '/deliverer-settlement' },
  { title: 'Relatórios', icon: BarChart3, path: '/reports' },
  { title: 'Hub Relatórios', icon: FileText, path: '/reports-hub' },
  { title: 'Projeção Vendas', icon: Target, path: '/sales-projection' },
  { title: 'BI Avançado', icon: TrendingUp, path: '/bi-advanced' },
  { title: 'Dashboard Tempos', icon: Timer, path: '/timer-dashboard' },
  { title: 'Fidelidade', icon: Star, path: '/loyalty' },
  { title: 'Mensagens', icon: Radio, path: '/internal-messages' },
  { title: 'Auditoria', icon: Activity, path: '/audit-logs' },
];

const financeItems: MenuItem[] = [
  { title: 'Financeiro', icon: Calculator, path: '/finance' },
  { title: 'Controle de Caixa', icon: Calculator, path: '/cash-register' },
  { title: 'Histórico Caixas', icon: History, path: '/cash-history' },
  { title: 'Formas Pagamento', icon: Wallet, path: '/payment-methods' },
  { title: 'Contas Bancárias', icon: Building2, path: '/bank-accounts' },
  { title: 'Contas a Pagar', icon: ClipboardList, path: '/accounts-payable' },
  { title: 'Plano de Contas', icon: Layers, path: '/chart-of-accounts' },
  { title: 'Fiado', icon: UserCircle, path: '/customer-credits' },
  { title: 'Relatório Fiado', icon: FileText, path: '/reports/fiado' },
  { title: 'Estoque', icon: Boxes, path: '/inventory' },
  { title: 'ERP Financeiro', icon: BarChart3, path: '/finance-erp' },
];

const erpInventoryItems: MenuItem[] = [
  { title: 'Dashboard ERP', icon: BarChart3, path: '/erp' },
  { title: 'Itens ERP', icon: Package, path: '/erp/items' },
  { title: 'Fornecedores', icon: Truck, path: '/erp/suppliers' },
  { title: 'Compras', icon: ShoppingCart, path: '/erp/purchases' },
  { title: 'Fichas Técnicas', icon: FileText, path: '/erp/recipes' },
  { title: 'Estoque ERP', icon: Warehouse, path: '/erp/stock' },
  { title: 'Movimentações', icon: ArrowRightLeft, path: '/erp/movements' },
  { title: 'Inventário', icon: ClipboardList, path: '/erp/inventory-count' },
  { title: 'CMV', icon: BarChart3, path: '/erp/cmv' },
  { title: 'Precificação', icon: Calculator, path: '/erp/pricing' },
  { title: 'Lucro', icon: TrendingUp, path: '/erp/profit' },
];

const menuItems: MenuItem[] = [
  { title: 'Categorias', icon: Tags, path: '/categories' },
  { title: 'Subcategorias', icon: Layers, path: '/subcategories' },
  { title: 'Produtos', icon: Package, path: '/products' },
  { title: 'Combos', icon: Layers, path: '/combos' },
  { title: 'Rodízio', icon: UtensilsCrossed, path: '/rodizio-config' },
  { title: 'Consumo Rodízio', icon: FileSpreadsheet, path: '/rodizio-consumption' },
  { title: 'Importar com IA', icon: Sparkles, path: '/ai-product-import' },
  { title: 'Sabores', icon: Utensils, path: '/flavors' },
  { title: 'Grupos Opcionais', icon: Layers, path: '/optional-groups' },
  { title: 'Cardápio Avançado', icon: Utensils, path: '/advanced-menu' },
  { title: 'Destaques Sabor', icon: Tags, path: '/flavor-highlight-groups' },
  { title: 'Ações em Lote', icon: CheckSquare, path: '/batch-actions' },
  { title: 'Alterações em Lote', icon: ArrowRightLeft, path: '/batch-operations' },
  { title: 'Importar/Exportar', icon: FileSpreadsheet, path: '/import-export' },
];

// Gestão de Pessoas e Ativos
const managementItems: MenuItem[] = [
  { title: 'Funcionários', icon: UserCheck, path: '/employees' },
  { title: 'Garçons', icon: Users, path: '/settings/waiters' },
  { title: 'Escalas', icon: Calendar, path: '/employees/schedules' },
  { title: 'Comissões', icon: DollarSign, path: '/employees/commissions' },
  { title: 'Ativos', icon: Boxes, path: '/assets' },
  { title: 'Manutenções', icon: Wrench, path: '/assets/maintenance' },
];

// Logística e Compras Inteligentes
const logisticsItems: MenuItem[] = [
  { title: 'Rotas de Entrega', icon: Route, path: '/delivery-routes' },
  { title: 'Sugestões Compra', icon: ShoppingBasket, path: '/purchase-suggestions' },
  { title: 'Cotações', icon: FileText, path: '/supplier-quotes' },
];

// Fiscal e Multi-Lojas
const fiscalItems: MenuItem[] = [
  { title: 'Documentos Fiscais', icon: Receipt, path: '/fiscal' },
  { title: 'Config. Fiscal', icon: FileText, path: '/fiscal/settings' },
  { title: 'IA de Tributos', icon: Brain, path: '/tax-ai-advisor' },
];

const multiStoreItems: MenuItem[] = [
  { title: 'Multi-Lojas', icon: Store, path: '/multi-store' },
];

// Integrações e Marketplace
const integrationItems: MenuItem[] = [
  { title: 'Hub Integrações', icon: Network, path: '/integrations' },
  { title: 'Config. Integrações', icon: Plug, path: '/settings/integration-hub' },
  { title: 'WhatsApp Center', icon: MessageCircle, path: '/integrations/whatsapp' },
  { title: 'Pagamentos', icon: DollarSign, path: '/integrations/payments' },
  { title: 'Marketplace', icon: Store, path: '/marketplace' },
  { title: 'Pedidos Marketplace', icon: ShoppingCart, path: '/marketplace/orders' },
];

// CRM
const crmItems: MenuItem[] = [
  { title: 'CRM Dashboard', icon: Contact, path: '/crm' },
  { title: 'Leads', icon: UserPlus, path: '/crm/leads' },
  { title: 'Clientes CRM', icon: UserCircle, path: '/crm/customers' },
  { title: 'Automações CRM', icon: Zap, path: '/crm/automations' },
];

const tvItems: MenuItem[] = [
  { title: 'Telas de TV', icon: Tv, path: '/tv-screens' },
  { title: 'Banners TV', icon: Image, path: '/banners' },
];

const marketingItems: MenuItem[] = [
  { title: 'Hub Marketing', icon: Megaphone, path: '/marketing-hub' },
  { title: 'Promoções', icon: Target, path: '/promotions' },
  { title: 'Campanhas Mkt', icon: Send, path: '/marketing-hub/campaigns' },
  { title: 'Automações', icon: Bot, path: '/marketing-hub/automations' },
  { title: 'Campanhas', icon: Send, path: '/campaigns' },
  { title: 'Recompra', icon: RefreshCw, path: '/repurchase' },
  { title: 'Programa Indicação', icon: UserPlus, path: '/referral-program' },
  { title: 'Gamificação', icon: Trophy, path: '/gamification' },
  { title: 'Marketing', icon: Megaphone, path: '/marketing' },
  { title: 'Roleta Prêmios', icon: Gift, path: '/prizes' },
  { title: 'Cupons', icon: Ticket, path: '/coupons' },
];

const aiItems: MenuItem[] = [
  { title: 'Central de IA', icon: Sparkles, path: '/ai-central' },
  { title: 'Configuração IA', icon: Server, path: '/settings/ai' },
  { title: 'Análise Comportamento', icon: Brain, path: '/ai-behavior' },
  { title: 'Marketing AI Posts', icon: Megaphone, path: '/ai-marketing-posts' },
  { title: 'Previsão de Churn', icon: TrendingUp, path: '/ai-churn' },
  { title: 'Chatbot WhatsApp', icon: Bot, path: '/chatbot-settings' },
  { title: 'Cardápio Criativo', icon: Utensils, path: '/ai-menu-creative' },
  { title: 'Fila Inteligente', icon: Users, path: '/smart-waitlist' },
  { title: 'QA Testes', icon: FlaskConical, path: '/qa' },
];

const settingsItems: MenuItem[] = [
  { title: 'Empresa', icon: Building2, path: '/company' },
  { title: 'Clientes', icon: UserCircle, path: '/settings/customers' },
  { title: 'Caixa', icon: Calculator, path: '/settings/cash' },
  { title: 'Pedidos', icon: ClipboardList, path: '/settings/orders' },
  { title: 'Mesas', icon: UtensilsCrossed, path: '/settings/table' },
  { title: 'Reservas', icon: CalendarClock, path: '/settings/reservations' },
  { title: 'Tablet Autoatendimento', icon: ShoppingCart, path: '/settings/tablet-autoatendimento' },
  { title: 'Totem Autoatendimento', icon: Monitor, path: '/settings/kiosk' },
  { title: 'TV Display', icon: Tv, path: '/settings/tv-display' },
  { title: 'Pedido Online', icon: ShoppingBag, path: '/settings/pedido-online' },
  { title: 'Taxas de Entrega', icon: Truck, path: '/settings/delivery' },
  { title: 'Rastreio GPS', icon: MapPin, path: '/settings/deliverer-tracking' },
  { title: 'Pizza', icon: Utensils, path: '/settings/pizza' },
  { title: 'Enólogo Virtual', icon: Utensils, path: '/settings/sommelier' },
  { title: 'Branding', icon: Palette, path: '/settings/branding' },
  { title: 'Integrações', icon: Plug, path: '/settings/integrations' },
  { title: 'TEF / Maquininhas', icon: CreditCard, path: '/settings/tef' },
  { title: 'Impressão', icon: Printer, path: '/settings/printing' },
  { title: 'Unidades de Medida', icon: Scale, path: '/settings/units' },
  { title: 'Balança', icon: Scale, path: '/settings/scale' },
  { title: 'Roleta', icon: Gift, path: '/settings/wheel' },
  { title: 'IA', icon: Bot, path: '/settings/ai' },
  { title: 'Layout Cardápio', icon: Layout, path: '/settings/layout' },
  { title: 'Pânico', icon: AlertTriangle, path: '/settings/panic' },
  { title: 'Sons', icon: Volume2, path: '/settings/sounds' },
  { title: 'Usuários', icon: Users, path: '/users' },
  { title: 'Perfis de Acesso', icon: Shield, path: '/profiles' },
  { title: 'Meus Links', icon: Link2, path: '/my-links' },
  { title: 'Minha Assinatura', icon: CreditCard, path: '/my-subscription' },
];

// Group colors mapping
const groupColors: Record<string, string> = {
  principal: 'bg-primary',
  financeiro: 'bg-emerald-500',
  'erp-estoque': 'bg-amber-500',
  cardapio: 'bg-success',
  gestao: 'bg-cyan-500',
  logistica: 'bg-orange-500',
  fiscal: 'bg-violet-500',
  'multi-store': 'bg-rose-500',
  integracoes: 'bg-teal-500',
  crm: 'bg-sky-500',
  tv: 'bg-destructive',
  marketing: 'bg-warning',
  ai: 'bg-info',
  configuracoes: 'bg-muted-foreground',
};

// Framer Motion variants
const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

const groupVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: userRole } = useUserRole();
  const { company, isSaasAdminMode } = useCompanyContext();
  const { data: isSaasAdmin } = useIsSaasAdmin();
  const { data: isSaasUser } = useIsSaasUser();
  const { data: canAccessAllCompanies } = useCanAccessAllCompanies();
  const { getSortedItems, updateOrder } = useMenuOrder();
  const { modules } = useCompanyModules();
  const { isRevendedor, isSuperAdmin } = useUserRoles();

  const contentRef = useRef<HTMLDivElement>(null);
  const [draggedItem, setDraggedItem] = useState<{ item: MenuItem; groupKey: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ path: string; groupKey: string } | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isAdmin = isSuperAdmin || userRole?.role === 'admin' || isSaasAdmin;

  // Filter main menu items based on modules
  const filteredMainItems = useMemo(() => {
    return mainMenuItems.filter(item => {
      if (item.path === '/tables' && !modules.module_tables) return false;
      if (item.path === '/comandas' && !modules.module_comandas) return false;
      if (item.path === '/reservations' && !modules.module_tables) return false;
      if (item.path === '/self-checkout' && !modules.module_self_checkout) return false;
      if (item.path === '/delivery-expedition' && !modules.module_expedition) return false;
      if (item.path === '/deliverer-badge' && !modules.module_expedition) return false;
      if (item.path === '/operations-performance' && !modules.module_performance) return false;
      if (item.path === '/staff-performance' && !modules.module_performance) return false;
      return true;
    });
  }, [modules]);

  // Filter settings items based on modules
  const filteredSettingsItems = useMemo(() => {
    return settingsItems.filter(item => {
      if (item.path === '/settings/table' && !modules.module_tables) return false;
      if (item.path === '/settings/reservations' && !modules.module_tables) return false;
      return true;
    });
  }, [modules]);

  const isActivePath = (path: string) => {
    const current = location.pathname;
    return current === path || current.startsWith(`${path}/`);
  };

  // Keep sidebar scroll position + active item visible after navigation
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const savedScrollTop = sessionStorage.getItem('appSidebarScrollTop');
    if (savedScrollTop) {
      el.scrollTop = Number(savedScrollTop) || 0;
    }

    const active = el.querySelector<HTMLElement>('[data-sidebar="menu-button"][data-active="true"]');
    active?.scrollIntoView({ block: 'center' });

    const handleScroll = () => {
      sessionStorage.setItem('appSidebarScrollTop', String(el.scrollTop));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Drag and drop handlers for admins
  const handleDragStart = useCallback((e: React.DragEvent, item: MenuItem, groupKey: string) => {
    if (!isAdmin) return;
    setDraggedItem({ item, groupKey });
    e.dataTransfer.effectAllowed = 'move';
  }, [isAdmin]);

  const handleDragOver = useCallback((e: React.DragEvent, path: string, groupKey: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    setDragOverItem({ path, groupKey });
  }, [draggedItem]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetItem: MenuItem, targetGroupKey: string, allItems: MenuItem[]) => {
    e.preventDefault();
    if (!draggedItem) return;

    const sourceGroupKey = draggedItem.groupKey;
    
    if (sourceGroupKey === targetGroupKey) {
      const draggedIndex = allItems.findIndex(i => i.path === draggedItem.item.path);
      const targetIndex = allItems.findIndex(i => i.path === targetItem.path);

      if (draggedIndex === targetIndex) {
        handleDragEnd();
        return;
      }

      const newItems = [...allItems];
      newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem.item);

      const orderUpdates = newItems.map((item, index) => ({
        item_key: item.path,
        group_key: targetGroupKey,
        display_order: index,
      }));

      updateOrder.mutate(orderUpdates, {
        onSuccess: () => toast.success('Menu reorganizado!'),
        onError: () => toast.error('Erro ao salvar ordem'),
      });
    } else {
      const targetIndex = allItems.findIndex(i => i.path === targetItem.path);
      
      const orderUpdates = [
        {
          item_key: draggedItem.item.path,
          group_key: targetGroupKey,
          display_order: targetIndex,
        }
      ];

      allItems.forEach((item, index) => {
        if (item.path !== draggedItem.item.path) {
          orderUpdates.push({
            item_key: item.path,
            group_key: targetGroupKey,
            display_order: index >= targetIndex ? index + 1 : index,
          });
        }
      });

      updateOrder.mutate(orderUpdates, {
        onSuccess: () => toast.success('Item movido para outro grupo!'),
        onError: () => toast.error('Erro ao mover item'),
      });
    }

    handleDragEnd();
  }, [draggedItem, updateOrder, handleDragEnd]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get sorted items for each group
  const sortedMainItems = getSortedItems(filteredMainItems, 'principal');
  const sortedFinanceItems = getSortedItems(financeItems, 'financeiro');
  const sortedErpInventoryItems = getSortedItems(erpInventoryItems, 'erp-estoque');
  const sortedMenuItems = getSortedItems(menuItems, 'cardapio');
  const sortedManagementItems = getSortedItems(managementItems, 'gestao');
  const sortedLogisticsItems = getSortedItems(logisticsItems, 'logistica');
  const sortedFiscalItems = getSortedItems(fiscalItems, 'fiscal');
  const sortedMultiStoreItems = getSortedItems(multiStoreItems, 'multi-store');
  const sortedIntegrationItems = getSortedItems(integrationItems, 'integracoes');
  const sortedCrmItems = getSortedItems(crmItems, 'crm');
  const sortedTvItems = modules.module_tv ? getSortedItems(tvItems, 'tv') : [];
  const sortedMarketingItems = modules.module_marketing ? getSortedItems(marketingItems, 'marketing') : [];
  const sortedAiItems = modules.module_ai ? getSortedItems(aiItems, 'ai') : [];
  const sortedSettingsItems = getSortedItems(filteredSettingsItems, 'configuracoes');

  // Render futuristic menu items
  const renderMenuItems = (items: MenuItem[], groupKey: string, allItems: MenuItem[]) => (
    <SidebarMenu
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (draggedItem && items.length > 0) {
          const lastItem = items[items.length - 1];
          handleDrop(e, lastItem, groupKey, allItems);
        }
      }}
    >
      <motion.div
        variants={groupVariants}
        initial={hasMounted ? false : "hidden"}
        animate="visible"
      >
        {items.map((item, index) => {
          const isActive = isActivePath(item.path);
          const Icon = item.icon;
          
          return (
            <motion.div
              key={item.path}
              variants={itemVariants}
            >
              <SidebarMenuItem 
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, item, groupKey)}
                onDragOver={(e) => handleDragOver(e, item.path, groupKey)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, item, groupKey, allItems)}
                className={cn(
                  "sidebar-item-futuristic",
                  isAdmin && "cursor-grab active:cursor-grabbing",
                  dragOverItem?.path === item.path && "bg-primary/20 border-primary border rounded",
                  isActive && "active"
                )}
              >
                <SidebarMenuButton
                  onClick={() => navigate(item.path)}
                  isActive={isActive}
                  className={cn(
                    "transition-all duration-300 group/item",
                    isActive && "text-primary font-medium"
                  )}
                >
                  {isAdmin && (
                    <GripVertical className="w-3 h-3 mr-1 text-muted-foreground opacity-40 group-hover/item:opacity-70 transition-opacity" />
                  )}
                  <Icon className={cn(
                    "w-4 h-4 sidebar-icon-futuristic transition-all duration-300",
                    isActive && "text-primary"
                  )} />
                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </motion.div>
          );
        })}
      </motion.div>
    </SidebarMenu>
  );

  // Render group label with futuristic styling
  const renderGroupLabel = (label: string, colorKey: string) => (
    <SidebarGroupLabel className="sidebar-group-label-futuristic">
      <span className="inline-flex items-center gap-2">
        <motion.span 
          className={cn("sidebar-group-indicator", groupColors[colorKey])}
          animate={{ 
            boxShadow: [
              `0 0 5px hsl(var(--${colorKey === 'principal' ? 'primary' : colorKey}) / 0.5)`,
              `0 0 15px hsl(var(--${colorKey === 'principal' ? 'primary' : colorKey}) / 0.8)`,
              `0 0 5px hsl(var(--${colorKey === 'principal' ? 'primary' : colorKey}) / 0.5)`,
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {label}
      </span>
    </SidebarGroupLabel>
  );

  return (
    <Sidebar className="border-r border-sidebar-border sidebar-futuristic">
      {/* Header with holographic effect */}
      <SidebarHeader className="p-4 border-b border-sidebar-border sidebar-header-futuristic">
        {/* Company Selector */}
        {canAccessAllCompanies && (
          <motion.div 
            className="mb-4 company-selector-futuristic p-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CompanySelector />
          </motion.div>
        )}
        
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {/* Logo with glow effect - Increased size */}
          <motion.div 
            className="sidebar-logo-container w-14 h-14 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name || 'Logo'} 
                className="w-12 h-12 object-contain rounded-lg" 
              />
            ) : (
              <img src="/zoopi-logo.png" alt="Zoopi" className="w-10 h-10 object-contain" />
            )}
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-sidebar-foreground truncate text-sm">
              {company?.name || 'SaaS Platform'}
            </h2>
          </div>
        </motion.div>
      </SidebarHeader>

      {/* Content with animated groups */}
      <SidebarContent ref={contentRef} className="overflow-y-auto px-2">
        {/* Principal */}
        <SidebarGroup>
          {renderGroupLabel('Principal', 'principal')}
          <SidebarGroupContent>
            {renderMenuItems(sortedMainItems, 'principal', sortedMainItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Financeiro */}
        <SidebarGroup>
          {renderGroupLabel('Financeiro', 'financeiro')}
          <SidebarGroupContent>
            {renderMenuItems(sortedFinanceItems, 'financeiro', sortedFinanceItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ERP Estoque */}
        <SidebarGroup>
          {renderGroupLabel('ERP / Estoque', 'erp-estoque')}
          <SidebarGroupContent>
            {renderMenuItems(sortedErpInventoryItems, 'erp-estoque', sortedErpInventoryItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cardápio */}
        <SidebarGroup>
          {renderGroupLabel('Cardápio', 'cardapio')}
          <SidebarGroupContent>
            {renderMenuItems(sortedMenuItems, 'cardapio', sortedMenuItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestão de Pessoas e Ativos */}
        <SidebarGroup>
          {renderGroupLabel('Gestão RH/Ativos', 'gestao')}
          <SidebarGroupContent>
            {renderMenuItems(sortedManagementItems, 'gestao', sortedManagementItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logística e Compras */}
        <SidebarGroup>
          {renderGroupLabel('Logística/Compras', 'logistica')}
          <SidebarGroupContent>
            {renderMenuItems(sortedLogisticsItems, 'logistica', sortedLogisticsItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Fiscal */}
        <SidebarGroup>
          {renderGroupLabel('Fiscal', 'fiscal')}
          <SidebarGroupContent>
            {renderMenuItems(sortedFiscalItems, 'fiscal', sortedFiscalItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Multi-Store */}
        <SidebarGroup>
          {renderGroupLabel('Multi-Lojas', 'multi-store')}
          <SidebarGroupContent>
            {renderMenuItems(sortedMultiStoreItems, 'multi-store', sortedMultiStoreItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrações e Marketplace */}
        <SidebarGroup>
          {renderGroupLabel('Integrações', 'integracoes')}
          <SidebarGroupContent>
            {renderMenuItems(sortedIntegrationItems, 'integracoes', sortedIntegrationItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CRM */}
        <SidebarGroup>
          {renderGroupLabel('CRM', 'crm')}
          <SidebarGroupContent>
            {renderMenuItems(sortedCrmItems, 'crm', sortedCrmItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* TV - Only show if module is active */}
        {modules.module_tv && (
          <SidebarGroup>
            {renderGroupLabel('TV Display', 'tv')}
            <SidebarGroupContent>
              {renderMenuItems(sortedTvItems, 'tv', sortedTvItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Marketing - Only show if module is active */}
        {modules.module_marketing && (
          <SidebarGroup>
            {renderGroupLabel('Marketing', 'marketing')}
            <SidebarGroupContent>
              {renderMenuItems(sortedMarketingItems, 'marketing', sortedMarketingItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* IA - Only show if module is active */}
        {modules.module_ai && (
          <SidebarGroup>
            {renderGroupLabel('Inteligência Artificial', 'ai')}
            <SidebarGroupContent>
              {renderMenuItems(sortedAiItems, 'ai', sortedAiItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configurações */}
        <SidebarGroup>
          {renderGroupLabel('Configurações', 'configuracoes')}
          <SidebarGroupContent>
            {renderMenuItems(sortedSettingsItems, 'configuracoes', sortedSettingsItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reseller Menu - Only visible for resellers (not super_admin) */}
        {isRevendedor && !isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="sidebar-group-label-futuristic">
              <span className="inline-flex items-center gap-2">
                <span className="sidebar-group-indicator bg-amber-500" />
                Revendedor
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="sidebar-item-futuristic">
                  <SidebarMenuButton
                    onClick={() => navigate('/reseller/dashboard')}
                    isActive={isActivePath('/reseller/dashboard')}
                    className="transition-all duration-300"
                  >
                    <BarChart3 className="w-4 h-4 sidebar-icon-futuristic" />
                    <span>Painel Revendedor</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className="sidebar-item-futuristic">
                  <SidebarMenuButton
                    onClick={() => navigate('/reseller/branding')}
                    isActive={isActivePath('/reseller/branding')}
                    className="transition-all duration-300"
                  >
                    <Palette className="w-4 h-4 sidebar-icon-futuristic" />
                    <span>Meu Branding</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Super Admin - Manage Resellers (only for super_admin) */}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="sidebar-group-label-futuristic">
              <span className="inline-flex items-center gap-2">
                <span className="sidebar-group-indicator bg-rose-500" />
                Gestão Revendedores
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="sidebar-item-futuristic">
                  <SidebarMenuButton
                    onClick={() => navigate('/saas/resellers')}
                    isActive={isActivePath('/saas/resellers')}
                    className="transition-all duration-300"
                  >
                    <Handshake className="w-4 h-4 sidebar-icon-futuristic" />
                    <span>Revendedores</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SaaS Admin - Only visible for SaaS admins */}
        {isSaasAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="sidebar-group-label-futuristic">
              <span className="inline-flex items-center gap-2">
                <span className="sidebar-group-indicator bg-destructive" />
                Admin SaaS
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="sidebar-item-futuristic">
                  <SidebarMenuButton
                    onClick={() => navigate('/saas')}
                    isActive={isActivePath('/saas')}
                    className="transition-all duration-300"
                  >
                    <Shield className="w-4 h-4 sidebar-icon-futuristic" />
                    <span>Painel SaaS</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with futuristic styling */}
      <SidebarFooter className="p-4 sidebar-footer-futuristic">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Avatar with neon ring */}
          <div className="sidebar-avatar-futuristic">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-background text-primary text-sm font-medium">
                {profile?.full_name ? getInitials(profile.full_name) : '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
          
          {/* Logout button with hover glow */}
          <motion.button
            onClick={handleSignOut}
            className="sidebar-logout-futuristic text-muted-foreground"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <LogOut className="w-4 h-4 transition-all duration-300" />
          </motion.button>
        </motion.div>
        
        {/* System version */}
        <div className="mt-3 flex justify-center">
          <SystemVersion />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
