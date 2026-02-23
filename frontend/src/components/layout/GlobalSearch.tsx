/**
 * GlobalSearch - Busca global para qualquer módulo, função ou menu do sistema
 * 
 * Campo de pesquisa na barra superior que busca por caracteres parciais
 * em todos os itens do menu e funções do sistema.
 * 
 * Também busca em dados do banco: produtos, clientes, pedidos, etc.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGlobalSearchData, GlobalSearchResult } from '@/hooks/useGlobalSearchData';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Building2, Users, Home, Tags, Layers, Package, ClipboardList, UserCircle, Bike, Calculator,
  Image, Gift, Sparkles, Link2, Tv, Megaphone, Brain, Send, RefreshCw, Clock, Palette, Plug,
  Bot, Layout, Shield, ChefHat, Printer, ShoppingBag, Utensils, Calendar, CalendarClock,
  FlaskConical, MessageCircle, Phone, Truck, BarChart3, Star, Wallet, History, CheckSquare,
  Timer, Trophy, MessageSquare, Boxes, Ticket, TrendingUp, UtensilsCrossed, Warehouse,
  ShoppingCart, FileText, ArrowRightLeft, Radio, AlertTriangle, Volume2, UserPlus,
  FileSpreadsheet, Activity, Scale, Monitor, MapPin, UserCheck, Wrench, Route, ShoppingBasket,
  Receipt, Store, Network, Contact, DollarSign, CreditCard, Zap, Target, Settings
} from 'lucide-react';

// Alias para evitar conflito de nome
const SettingsIcon = Settings;

// Ícones para resultados de dados do banco
const DATA_TYPE_ICONS: Record<GlobalSearchResult['type'], any> = {
  product: Package,
  customer: UserCircle,
  order: ClipboardList,
  category: Tags,
  subcategory: Layers,
  combo: Layers,
  employee: Users,
  supplier: Truck
};

interface SearchableItem {
  title: string;
  path: string;
  icon: any;
  category: string;
  keywords?: string[];
}

// Todos os itens pesquisáveis do sistema
const ALL_SEARCHABLE_ITEMS: SearchableItem[] = [
  // Principal
  { title: 'Dashboard', path: '/', icon: Home, category: 'Principal', keywords: ['inicio', 'home', 'painel'] },
  { title: 'PDV Loja', path: '/pdv-loja', icon: Store, category: 'Principal', keywords: ['venda', 'caixa', 'ponto'] },
  { title: 'Terminal Operador', path: '/terminal', icon: Layout, category: 'Principal', keywords: ['operador', 'terminal'] },
  { title: 'Painel Desempenho', path: '/performance-panel', icon: TrendingUp, category: 'Principal' },
  { title: 'Performance Operacional', path: '/operations-performance', icon: Activity, category: 'Principal' },
  { title: 'Análise de Desempenho', path: '/staff-performance', icon: BarChart3, category: 'Principal' },
  { title: 'Pedidos', path: '/orders', icon: ClipboardList, category: 'Principal', keywords: ['order', 'ordens'] },
  { title: 'Pedido Ligação', path: '/phone-order', icon: Phone, category: 'Principal', keywords: ['telefone', 'ligar'] },
  { title: 'Mesas', path: '/tables', icon: UtensilsCrossed, category: 'Principal', keywords: ['mesa', 'table'] },
  { title: 'Comandas', path: '/comandas', icon: Tags, category: 'Principal', keywords: ['comanda', 'ficha'] },
  { title: 'Self Check-out', path: '/self-checkout', icon: Receipt, category: 'Principal' },
  { title: 'Reservas', path: '/reservations', icon: CalendarClock, category: 'Principal', keywords: ['reservation', 'agendar'] },
  { title: 'Chamados Salão', path: '/service-calls', icon: Radio, category: 'Principal' },
  { title: 'KDS Cozinha', path: '/kds', icon: ChefHat, category: 'Principal', keywords: ['kitchen', 'cozinha'] },
  { title: 'WhatsApp', path: '/whatsapp', icon: MessageCircle, category: 'Principal', keywords: ['zap', 'mensagem'] },
  { title: 'Chat Online', path: '/chat-monitor', icon: MessageCircle, category: 'Principal' },
  { title: 'Clientes', path: '/customers', icon: UserCircle, category: 'Principal', keywords: ['cliente', 'customer'] },
  { title: 'Avaliações', path: '/reviews', icon: MessageSquare, category: 'Principal' },
  { title: 'Entregadores', path: '/deliverers', icon: Bike, category: 'Principal', keywords: ['motoboy', 'delivery'] },
  { title: 'Painel GPS', path: '/deliverer-tracking', icon: MapPin, category: 'Principal', keywords: ['rastreio', 'mapa'] },
  { title: 'Expedição', path: '/delivery-expedition', icon: Truck, category: 'Principal' },
  { title: 'Crachá Entregador', path: '/deliverer-badge', icon: UserCheck, category: 'Principal' },
  { title: 'Ranking Entregas', path: '/deliverer-rankings', icon: Trophy, category: 'Principal' },
  { title: 'Acerto', path: '/deliverer-settlement', icon: Calculator, category: 'Principal' },
  { title: 'Relatórios', path: '/reports', icon: BarChart3, category: 'Principal' },
  { title: 'Hub Relatórios', path: '/reports-hub', icon: FileText, category: 'Principal' },
  { title: 'Projeção Vendas', path: '/sales-projection', icon: Target, category: 'Principal' },
  { title: 'BI Avançado', path: '/bi-advanced', icon: TrendingUp, category: 'Principal' },
  { title: 'Dashboard Tempos', path: '/timer-dashboard', icon: Timer, category: 'Principal' },
  { title: 'Fidelidade', path: '/loyalty', icon: Star, category: 'Principal', keywords: ['pontos', 'fidelizar'] },
  { title: 'Mensagens', path: '/internal-messages', icon: Radio, category: 'Principal' },
  { title: 'Auditoria', path: '/audit-logs', icon: Activity, category: 'Principal', keywords: ['log', 'historico'] },

  // Financeiro
  { title: 'Financeiro', path: '/finance', icon: Calculator, category: 'Financeiro' },
  { title: 'Controle de Caixa', path: '/cash-register', icon: Calculator, category: 'Financeiro', keywords: ['caixa', 'sangria'] },
  { title: 'Histórico Caixas', path: '/cash-history', icon: History, category: 'Financeiro' },
  { title: 'Formas Pagamento', path: '/payment-methods', icon: Wallet, category: 'Financeiro', keywords: ['pagamento', 'payment'] },
  { title: 'Contas Bancárias', path: '/bank-accounts', icon: Building2, category: 'Financeiro', keywords: ['banco', 'bank'] },
  { title: 'Contas a Pagar', path: '/accounts-payable', icon: ClipboardList, category: 'Financeiro', keywords: ['pagar', 'despesa'] },
  { title: 'Plano de Contas', path: '/chart-of-accounts', icon: Layers, category: 'Financeiro' },
  { title: 'Fiado', path: '/customer-credits', icon: UserCircle, category: 'Financeiro', keywords: ['credito', 'devendo'] },
  { title: 'Relatório Fiado', path: '/reports/fiado', icon: FileText, category: 'Financeiro' },
  { title: 'Estoque', path: '/inventory', icon: Boxes, category: 'Financeiro', keywords: ['stock', 'inventario'] },
  { title: 'ERP Financeiro', path: '/finance-erp', icon: BarChart3, category: 'Financeiro' },

  // ERP/Estoque
  { title: 'Dashboard ERP', path: '/erp', icon: BarChart3, category: 'ERP Estoque' },
  { title: 'Itens ERP', path: '/erp/items', icon: Package, category: 'ERP Estoque' },
  { title: 'Fornecedores', path: '/erp/suppliers', icon: Truck, category: 'ERP Estoque', keywords: ['supplier', 'fornecedor'] },
  { title: 'Compras', path: '/erp/purchases', icon: ShoppingCart, category: 'ERP Estoque', keywords: ['compra', 'purchase'] },
  { title: 'Fichas Técnicas', path: '/erp/recipes', icon: FileText, category: 'ERP Estoque', keywords: ['receita', 'recipe'] },
  { title: 'Estoque ERP', path: '/erp/stock', icon: Warehouse, category: 'ERP Estoque' },
  { title: 'Movimentações', path: '/erp/movements', icon: ArrowRightLeft, category: 'ERP Estoque' },
  { title: 'Inventário', path: '/erp/inventory-count', icon: ClipboardList, category: 'ERP Estoque' },
  { title: 'CMV', path: '/erp/cmv', icon: BarChart3, category: 'ERP Estoque', keywords: ['custo', 'mercadoria'] },
  { title: 'Precificação', path: '/erp/pricing', icon: Calculator, category: 'ERP Estoque', keywords: ['preco', 'price'] },
  { title: 'Lucro', path: '/erp/profit', icon: TrendingUp, category: 'ERP Estoque', keywords: ['profit', 'margem'] },

  // Cardápio
  { title: 'Categorias', path: '/categories', icon: Tags, category: 'Cardápio', keywords: ['categoria', 'category'] },
  { title: 'Subcategorias', path: '/subcategories', icon: Layers, category: 'Cardápio' },
  { title: 'Produtos', path: '/products', icon: Package, category: 'Cardápio', keywords: ['produto', 'item'] },
  { title: 'Combos', path: '/combos', icon: Layers, category: 'Cardápio', keywords: ['combo', 'promocao'] },
  { title: 'Rodízio', path: '/rodizio-config', icon: UtensilsCrossed, category: 'Cardápio' },
  { title: 'Consumo Rodízio', path: '/rodizio-consumption', icon: FileSpreadsheet, category: 'Cardápio' },
  { title: 'Importar com IA', path: '/ai-product-import', icon: Sparkles, category: 'Cardápio' },
  { title: 'Sabores', path: '/flavors', icon: Utensils, category: 'Cardápio', keywords: ['sabor', 'flavor'] },
  { title: 'Grupos Opcionais', path: '/optional-groups', icon: Layers, category: 'Cardápio', keywords: ['opcional', 'adicional'] },
  { title: 'Cardápio Avançado', path: '/advanced-menu', icon: Utensils, category: 'Cardápio' },
  { title: 'Destaques Sabor', path: '/flavor-highlight-groups', icon: Tags, category: 'Cardápio' },
  { title: 'Ações em Lote', path: '/batch-actions', icon: CheckSquare, category: 'Cardápio' },
  { title: 'Alterações em Lote', path: '/batch-operations', icon: ArrowRightLeft, category: 'Cardápio' },
  { title: 'Importar/Exportar', path: '/import-export', icon: FileSpreadsheet, category: 'Cardápio' },

  // Gestão
  { title: 'Funcionários', path: '/employees', icon: UserCheck, category: 'Gestão', keywords: ['funcionario', 'employee'] },
  { title: 'Escalas', path: '/employees/schedules', icon: Calendar, category: 'Gestão', keywords: ['escala', 'horario'] },
  { title: 'Comissões', path: '/employees/commissions', icon: DollarSign, category: 'Gestão', keywords: ['comissao', 'bonus'] },
  { title: 'Ativos', path: '/assets', icon: Boxes, category: 'Gestão', keywords: ['ativo', 'equipamento'] },
  { title: 'Manutenções', path: '/assets/maintenance', icon: Wrench, category: 'Gestão' },

  // Logística
  { title: 'Rotas de Entrega', path: '/delivery-routes', icon: Route, category: 'Logística' },
  { title: 'Sugestões Compra', path: '/purchase-suggestions', icon: ShoppingBasket, category: 'Logística' },
  { title: 'Cotações', path: '/supplier-quotes', icon: FileText, category: 'Logística', keywords: ['cotacao', 'fornecedor'] },

  // Fiscal
  { title: 'Documentos Fiscais', path: '/fiscal', icon: Receipt, category: 'Fiscal', keywords: ['nf', 'nota'] },
  { title: 'Config. Fiscal', path: '/fiscal/settings', icon: FileText, category: 'Fiscal' },
  { title: 'IA de Tributos', path: '/tax-ai-advisor', icon: Brain, category: 'Fiscal', keywords: ['imposto', 'tributo'] },

  // Multi-Lojas
  { title: 'Multi-Lojas', path: '/multi-store', icon: Store, category: 'Multi-Lojas', keywords: ['filial', 'loja'] },

  // Integrações
  { title: 'Hub Integrações', path: '/integrations', icon: Network, category: 'Integrações' },
  { title: 'WhatsApp Center', path: '/integrations/whatsapp', icon: MessageCircle, category: 'Integrações' },
  { title: 'Pagamentos', path: '/integrations/payments', icon: DollarSign, category: 'Integrações' },
  { title: 'Marketplace', path: '/marketplace', icon: Store, category: 'Integrações', keywords: ['ifood', 'rappi'] },
  { title: 'Pedidos Marketplace', path: '/marketplace/orders', icon: ShoppingCart, category: 'Integrações' },

  // CRM
  { title: 'CRM Dashboard', path: '/crm', icon: Contact, category: 'CRM' },
  { title: 'Leads', path: '/crm/leads', icon: UserPlus, category: 'CRM', keywords: ['lead', 'prospecto'] },
  { title: 'Pipeline', path: '/crm/pipeline', icon: TrendingUp, category: 'CRM' },
  { title: 'Clientes CRM', path: '/crm/customers', icon: UserCircle, category: 'CRM' },
  { title: 'Atividades', path: '/crm/activities', icon: Activity, category: 'CRM' },
  { title: 'Automações CRM', path: '/crm/automations', icon: Zap, category: 'CRM' },

  // TV
  { title: 'Telas de TV', path: '/tv-screens', icon: Tv, category: 'TV' },
  { title: 'Banners TV', path: '/banners', icon: Image, category: 'TV', keywords: ['banner', 'propaganda'] },

  // Marketing
  { title: 'Hub Marketing', path: '/marketing-hub', icon: Megaphone, category: 'Marketing' },
  { title: 'Promoções', path: '/promotions', icon: Target, category: 'Marketing', keywords: ['promocao', 'desconto'] },
  { title: 'Campanhas Mkt', path: '/marketing-hub/campaigns', icon: Send, category: 'Marketing' },
  { title: 'Automações', path: '/marketing-hub/automations', icon: Bot, category: 'Marketing' },
  { title: 'Campanhas', path: '/campaigns', icon: Send, category: 'Marketing' },
  { title: 'Recompra', path: '/repurchase', icon: RefreshCw, category: 'Marketing' },
  { title: 'Programa Indicação', path: '/referral-program', icon: UserPlus, category: 'Marketing' },
  { title: 'Gamificação', path: '/gamification', icon: Trophy, category: 'Marketing' },
  { title: 'Destaque Horário', path: '/time-highlights', icon: Clock, category: 'Marketing' },
  { title: 'Marketing', path: '/marketing', icon: Megaphone, category: 'Marketing' },
  { title: 'Roleta Prêmios', path: '/prizes', icon: Gift, category: 'Marketing', keywords: ['roleta', 'premio'] },
  { title: 'Cupons', path: '/coupons', icon: Ticket, category: 'Marketing', keywords: ['cupom', 'desconto', 'voucher', 'promocao', 'gerencial', 'codigo', 'code', 'coupon'] },

  // IA
  { title: 'Central de IA', path: '/ai-central', icon: Sparkles, category: 'IA' },
  { title: 'Análise Comportamento', path: '/ai-behavior', icon: Brain, category: 'IA' },
  { title: 'Marketing AI Posts', path: '/ai-marketing-posts', icon: Megaphone, category: 'IA' },
  { title: 'Previsão de Churn', path: '/ai-churn', icon: TrendingUp, category: 'IA' },
  { title: 'Chatbot WhatsApp', path: '/chatbot-settings', icon: Bot, category: 'IA' },
  { title: 'Cardápio Criativo', path: '/ai-menu-creative', icon: Utensils, category: 'IA' },
  { title: 'Agenda TV', path: '/ai-tv-scheduler', icon: Calendar, category: 'IA' },
  { title: 'Previsão Demanda', path: '/demand-forecast', icon: TrendingUp, category: 'IA' },
  { title: 'Precificação Dinâmica', path: '/dynamic-pricing', icon: TrendingUp, category: 'IA' },
  { title: 'Smart KDS', path: '/smart-kds', icon: ChefHat, category: 'IA' },
  { title: 'Autoatendimento IA', path: '/selfservice-advanced', icon: Sparkles, category: 'IA' },
  { title: 'Voice AI Atendente', path: '/ai-voice', icon: Phone, category: 'IA' },
  { title: 'Fila Inteligente', path: '/smart-waitlist', icon: Users, category: 'IA' },
  { title: 'AI Concierge', path: '/ai-concierge', icon: MessageSquare, category: 'IA' },
  { title: 'Upselling Preditivo', path: '/predictive-upselling', icon: TrendingUp, category: 'IA' },
  { title: 'QA Testes', path: '/qa', icon: FlaskConical, category: 'IA' },

  // Configurações
  { title: 'Empresa', path: '/company', icon: Building2, category: 'Configurações', keywords: ['empresa', 'company'] },
  { title: 'Config. Clientes', path: '/settings/customers', icon: UserCircle, category: 'Configurações' },
  { title: 'Config. Caixa', path: '/settings/cash', icon: Calculator, category: 'Configurações' },
  { title: 'Config. Pedidos', path: '/settings/orders', icon: ClipboardList, category: 'Configurações' },
  { title: 'Config. Mesas', path: '/settings/table', icon: UtensilsCrossed, category: 'Configurações' },
  { title: 'Config. Reservas', path: '/settings/reservations', icon: CalendarClock, category: 'Configurações' },
  { title: 'Tablet Autoatendimento', path: '/settings/tablet-autoatendimento', icon: ShoppingCart, category: 'Configurações' },
  { title: 'Totem Autoatendimento', path: '/settings/kiosk', icon: Monitor, category: 'Configurações', keywords: ['totem', 'kiosk'] },
  { title: 'TV Display', path: '/settings/tv-display', icon: Tv, category: 'Configurações' },
  { title: 'Pedido Online', path: '/settings/pedido-online', icon: ShoppingBag, category: 'Configurações' },
  { title: 'Taxas de Entrega', path: '/settings/delivery', icon: Truck, category: 'Configurações', keywords: ['taxa', 'frete'] },
  { title: 'Rastreio GPS', path: '/settings/deliverer-tracking', icon: MapPin, category: 'Configurações' },
  { title: 'Config. Pizza', path: '/settings/pizza', icon: Utensils, category: 'Configurações' },
  { title: 'Enólogo Virtual', path: '/settings/sommelier', icon: Utensils, category: 'Configurações', keywords: ['sommelier', 'vinho'] },
  { title: 'Branding', path: '/settings/branding', icon: Palette, category: 'Configurações', keywords: ['marca', 'logo'] },
  { title: 'Integrações', path: '/settings/integrations', icon: Plug, category: 'Configurações' },
  { title: 'TEF / Maquininhas', path: '/settings/tef', icon: CreditCard, category: 'Configurações', keywords: ['tef', 'maquininha'] },
  { title: 'Impressão', path: '/settings/printing', icon: Printer, category: 'Configurações', keywords: ['impressora', 'print'] },
  { title: 'Balança', path: '/settings/scale', icon: Scale, category: 'Configurações' },
  { title: 'Roleta', path: '/settings/wheel', icon: Gift, category: 'Configurações' },
  { title: 'Config. IA', path: '/settings/ai', icon: Bot, category: 'Configurações' },
  { title: 'Layout Cardápio', path: '/settings/layout', icon: Layout, category: 'Configurações' },
  { title: 'Pânico', path: '/settings/panic', icon: AlertTriangle, category: 'Configurações' },
  { title: 'Sons', path: '/settings/sounds', icon: Volume2, category: 'Configurações' },
  { title: 'Usuários', path: '/users', icon: Users, category: 'Configurações', keywords: ['usuario', 'user'] },
  { title: 'Perfis de Acesso', path: '/profiles', icon: Shield, category: 'Configurações', keywords: ['permissao', 'acesso'] },
  { title: 'Meus Links', path: '/my-links', icon: Link2, category: 'Configurações', keywords: ['link', 'url', 'qrcode'] },
  { title: 'Minha Assinatura', path: '/my-subscription', icon: CreditCard, category: 'Configurações', keywords: ['plano', 'assinatura', 'subscription'] },
  { title: 'Config Assinatura', path: '/settings/subscription', icon: CreditCard, category: 'Configurações', keywords: ['assinatura', 'plano', 'fatura'] },
  { title: 'Editor Cupom Impressão', path: '/admin/receipt-editor', icon: Receipt, category: 'Configurações', keywords: ['cupom', 'ticket', 'recibo', 'impressao', 'layout', 'visual', 'comprovante'] },
  { title: 'Editor Ticket Cozinha', path: '/admin/kitchen-ticket-editor', icon: Receipt, category: 'Configurações', keywords: ['cozinha', 'ticket', 'kds', 'impressao'] },
  { title: 'SmartPOS', path: '/settings/smartpos', icon: Monitor, category: 'Configurações', keywords: ['pos', 'smartpos', 'terminal'] },
  { title: 'Permissões Operador', path: '/settings/operator-permissions', icon: Shield, category: 'Configurações', keywords: ['operador', 'permissao', 'acesso'] },
  { title: 'Agente Proativo', path: '/settings/proactive-agent', icon: Bot, category: 'Configurações', keywords: ['ia', 'agente', 'proativo', 'automatico'] },
  { title: 'Fiserv TEF', path: '/settings/fiserv', icon: CreditCard, category: 'Configurações', keywords: ['fiserv', 'tef', 'maquininha'] },
  { title: 'Configurações Geral', path: '/settings', icon: SettingsIcon, category: 'Configurações', keywords: ['config', 'geral', 'perfil'] },
];

// Normaliza texto para busca (remove acentos e lowercase)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce da query para busca no banco
  const debouncedQuery = useDebounce(query, 300);
  
  // Busca em dados do banco (produtos, clientes, pedidos, etc.)
  const { data: dataResults = [], isLoading: isLoadingData } = useGlobalSearchData(debouncedQuery);

  // Filtra resultados de menus baseado na query
  const menuResults = useMemo(() => {
    if (!query.trim()) return [];

    const normalizedQuery = normalizeText(query);

    return ALL_SEARCHABLE_ITEMS.filter(item => {
      const normalizedTitle = normalizeText(item.title);
      const normalizedCategory = normalizeText(item.category);
      const normalizedKeywords = (item.keywords || []).map(normalizeText);

      // Busca parcial em título, categoria e keywords
      return (
        normalizedTitle.includes(normalizedQuery) ||
        normalizedCategory.includes(normalizedQuery) ||
        normalizedKeywords.some(kw => kw.includes(normalizedQuery))
      );
    }).slice(0, 8); // Limita a 8 resultados de menu
  }, [query]);

  // Combina resultados de menus + dados do banco
  const allResults = useMemo(() => {
    return [...menuResults.slice(0, 5), ...dataResults.slice(0, 10)];
  }, [menuResults, dataResults]);

  // Reset selected index quando resultados mudam
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navegação por teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || allResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allResults.length) % allResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleSelectResult(selectedIndex);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  }, [isOpen, allResults, selectedIndex]);

  const handleSelectResult = (index: number) => {
    const menuCount = Math.min(menuResults.length, 5);
    
    if (index < menuCount) {
      // É um resultado de menu
      const item = menuResults[index];
      navigate(item.path);
    } else {
      // É um resultado de dados
      const dataIndex = index - menuCount;
      const item = dataResults[dataIndex];
      if (item) {
        navigate(item.path);
      }
    }
    
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (query.trim()) {
      setIsOpen(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length > 0);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const menuCount = Math.min(menuResults.length, 5);

  return (
    <div className="relative w-72">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar no sistema..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 bg-muted/50 border-border/50"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
            onClick={handleClear}
          >
            {isLoadingData ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && allResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Resultados de Menus */}
          {menuResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border/50">
                Módulos
              </div>
              {menuResults.slice(0, 5).map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`menu-${item.path}`}
                    onClick={() => handleSelectResult(index)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.category}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Resultados de Dados do Banco */}
          {dataResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border/50">
                Dados do Sistema
              </div>
              {dataResults.slice(0, 10).map((item, index) => {
                const Icon = DATA_TYPE_ICONS[item.type] || Package;
                const resultIndex = menuCount + index;
                return (
                  <button
                    key={`data-${item.type}-${item.id}`}
                    onClick={() => handleSelectResult(resultIndex)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      resultIndex === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary/70 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {isOpen && query.trim() && isLoadingData && allResults.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 p-4"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando...
          </div>
        </div>
      )}

      {/* Mensagem quando não encontra */}
      {isOpen && query.trim() && !isLoadingData && allResults.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 p-4"
        >
          <p className="text-sm text-muted-foreground text-center">
            Nenhum resultado para "{query}"
          </p>
        </div>
      )}
    </div>
  );
}
