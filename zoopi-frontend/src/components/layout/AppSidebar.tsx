 

import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, ClipboardList, Store,
  Layout, DollarSign, Warehouse,
  BarChart3, Zap, Utensils, ChevronDown,
  Megaphone, Target, Settings, Building,
  Users, Monitor, Shield, MessageCircle,
  BoxIcon, Boxes, UtensilsCrossed, CheckSquare,
  ArrowRightLeft, LayoutDashboard, UserPlus,
  ShieldCheck, Globe, CreditCard, Activity,
  Key, Database, FileText, Smartphone, Receipt,
  Tag as TagIcon, TruckIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CompanySwitcher } from './CompanySwitcher';
import { Badge } from '../ui/badge';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface SubItem { title: string; icon: React.ElementType; path: string; }
interface MenuItem { title: string; icon: React.ElementType; path: string; subItems?: SubItem[]; }
interface MenuGroup { label: string; roles: string[]; items: MenuItem[]; }

// ─────────────────────────────────────────────────────────────────────────────
// Menu Data
// ─────────────────────────────────────────────────────────────────────────────
const menuGroupsConfig: MenuGroup[] = [
  {
    label: 'Menus Operacionais',
    roles: ['user', 'manager', 'admin', 'super_admin'],
    items: [
      { title: 'Dashboard', icon: Home, path: '/' },
      {
        title: 'Principal', icon: Layout, path: '#',
        subItems: [
          { title: 'Salão & Pedidos', icon: UtensilsCrossed, path: '/principal/salao-pedidos' },
          { title: 'Meus Links', icon: Link, path: '/principal/links' },
          { title: 'Comunicação', icon: MessageCircle, path: '/principal/comunicacao-clientes' },
          { title: 'Entregas', icon: TruckIcon, path: '/principal/entregas-logistica' },
          { title: 'Vendas', icon: Store, path: '/principal/vendas-atendimento' },
        ],
      },
      {
        title: 'Cardápio', icon: Utensils, path: '#',
        subItems: [
          { title: 'Produtos', icon: BoxIcon, path: '/menu/products' },
          { title: 'Ações em Lote', icon: CheckSquare, path: '/menu/batch-actions' },
        ],
      },
      { title: 'Financeiro', icon: DollarSign, path: '/finance/hub' },
      { title: 'Estoque', icon: Warehouse, path: '/erp/hub' },
      {
        title: 'Configurações', icon: Settings, path: '#',
        subItems: [
          { title: 'Geral', icon: Building, path: '/configuracoes/geral' },
          { title: 'Canais & Dispositivos', icon: Monitor, path: '/configuracoes/canais-dispositivos' },
          { title: 'Segurança & Conta', icon: Shield, path: '/settings/profile' },
        ],
      },
    ],
  },
  {
    label: 'Gestão SaaS',
    roles: ['admin', 'super_admin'],
    items: [
      { title: 'Empresas Ativas', icon: Building, path: '/saas/companies' },
      { title: 'Planos & Faturas', icon: CreditCard, path: '/saas/plans' },
    ],
  },
  {
    label: 'Dev & Engenharia',
    roles: ['super_admin'],
    items: [
      { title: 'Status Infra', icon: Database, path: '/admin/server' },
      { title: 'Logs de Erro', icon: FileText, path: '/admin/logs' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE CAMADAS DE PROFUNDIDADE — Liquid Water 3D
// (mesmo sistema do DashboardHeader, adaptado para superfície vertical)
//
//  Camada 0 | Sidebar blade  → placa de vidro espessa, luz de cima-esquerda
//  Camada 1 | Nav items ativos / grupos → bolhas dentro do vidro (convexas)
//  Camada 2 | Hover de item  → gota se inflando
// ─────────────────────────────────────────────────────────────────────────────

// CAMADA 0 — O blade principal da sidebar (superfície vertical)
// A luz em superfície vertical bate mais nas bordas superior e esquerda
const SIDEBAR_GLASS = {
  background: `linear-gradient(
    175deg,
    rgba(255,255,255,0.11) 0%,
    rgba(255,255,255,0.04) 45%,
    rgba(255,255,255,0.08) 100%
  )`,
  border: "1px solid rgba(255,255,255,0.20)",
  boxShadow: [
    // INSET — highlight borda superior (quina mais exposta à luz)
    "inset 0 1.5px 0 0 rgba(255,255,255,0.50)",
    // INSET — borda inferior quase invisível
    "inset 0 -1px 0 0 rgba(255,255,255,0.06)",
    // INSET — lateral esquerda (fonte de luz principal)
    "inset 1.5px 0 0 0 rgba(255,255,255,0.28)",
    // INSET — lateral direita (quina oposta, reflexo difuso)
    "inset -1px 0 0 0 rgba(255,255,255,0.07)",
    // INSET — gradiente de profundidade (espessura do vidro, eixo vertical)
    "inset 4px 0 18px 0 rgba(255,255,255,0.07)",
    "inset -5px 0 18px 0 rgba(0,0,0,0.08)",
    // INSET — vinheta central (não é flat — vidro tem curvatura sutil)
    "inset 0 0 32px 8px rgba(0,0,0,0.04)",
    // EXTERNA — micro-linha de luz na borda esquerda (Apple highlight)
    "-0.5px 0 0 0.5px rgba(255,255,255,0.28)",
    // EXTERNA — sombra de elevação lateral (a sidebar flutua)
    "2px 0 6px rgba(0,0,0,0.08)",
    "6px 0 24px rgba(0,0,0,0.12)",
    "20px 0 56px rgba(0,0,0,0.08)",
    // EXTERNA — distorção de luz nas bordas top/bottom (líquido curva a luz)
    "0 -3px 12px -2px rgba(255,255,255,0.06)",
    "0 3px 12px -2px rgba(255,255,255,0.03)",
    // EXTERNA — glow de cor da marca
    "0 0 0 0.5px rgba(120,40,220,0.10)",
    "4px 0 32px rgba(120,40,220,0.05)",
  ].join(", "),
} as const;

// CAMADA 1 — Item ativo / group pill (bolha convexa dentro do vidro)
const ACTIVE_PILL = {
  background: `linear-gradient(
    185deg,
    rgba(120,40,220,0.14) 0%,
    rgba(120,40,220,0.07) 50%,
    rgba(120,40,220,0.12) 100%
  )`,
  boxShadow: [
    "inset 0 2px 4px 0 rgba(0,0,0,0.12)",
    "inset 0 -1.5px 0 0 rgba(255,255,255,0.22)",
    "inset 0 -3px 6px 0 rgba(255,255,255,0.06)",
    "inset 1px 0 3px 0 rgba(255,255,255,0.10)",
    "inset -1px 0 2px 0 rgba(255,255,255,0.04)",
    "0 1px 4px rgba(0,0,0,0.10)",
    "0 2px 8px rgba(120,40,220,0.10)",
  ].join(", "),
} as const;

// CAMADA 1 — Hover de item (bolha prestes a inflar)
const HOVER_PILL = {
  background: `linear-gradient(
    185deg,
    rgba(0,0,0,0.06) 0%,
    rgba(0,0,0,0.02) 50%,
    rgba(255,255,255,0.04) 100%
  )`,
  boxShadow: [
    "inset 0 1.5px 3px 0 rgba(0,0,0,0.10)",
    "inset 0 -1.5px 0 0 rgba(255,255,255,0.28)",
    "inset 0 -2px 5px 0 rgba(255,255,255,0.07)",
    "inset 1px 0 3px rgba(255,255,255,0.10)",
    "inset -1px 0 2px rgba(255,255,255,0.05)",
    "0 1px 3px rgba(0,0,0,0.08)",
  ].join(", "),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip wrapper
// ─────────────────────────────────────────────────────────────────────────────
function NavTooltip({ label, children, show }: { label: string; children: React.ReactNode; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right" sideOffset={14}
            className="z-50 px-3 py-1.5 text-xs font-semibold rounded-lg bg-popover text-popover-foreground border border-border/60 shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            {label}
            <Tooltip.Arrow className="fill-border/60" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavItem — Camada 2 (gota individual)
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({
  item, isExpanded, onNavigate, activePath,
}: {
  item: MenuItem; isExpanded: boolean; onNavigate: (path: string) => void; activePath: string;
}) {
  const hasChildren = Boolean(item.subItems?.length);
  const isActive = !hasChildren && activePath === item.path;
  const childActive = hasChildren && item.subItems!.some(s => activePath === s.path);
  const [open, setOpen] = useState(childActive);
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  const highlight = isActive || childActive;

  return (
    <div>
      <NavTooltip label={item.title} show={!isExpanded}>
        <motion.button
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileTap={{ scale: 0.96 }}
          onClick={() => hasChildren ? (!isExpanded ? undefined : setOpen(!open)) : onNavigate(item.path)}
          className={cn(
            'group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 relative overflow-hidden',
            !isExpanded && 'justify-center px-0 w-10 mx-auto',
            highlight ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
          style={highlight ? ACTIVE_PILL : hovered ? HOVER_PILL : { background: 'transparent', boxShadow: 'none' }}
        >
          {/* Barra indicador ativo (lateral esquerda) */}
          <motion.span
            animate={{ height: highlight ? '60%' : '0%', opacity: highlight ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary"
          />

          {/* Reflexo especular da gota no hover */}
          <AnimatePresence>
            {hovered && !highlight && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  inset: '8% 15% auto 15%',
                  height: '28%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.00) 100%)',
                  filter: 'blur(3px)',
                }}
              />
            )}
          </AnimatePresence>

          <Icon className="flex-none w-[18px] h-[18px]" />

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap"
              >
                <span className="text-sm font-bold">{item.title}</span>
                {hasChildren && (
                  <motion.span
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3.5 h-3.5 flex-none" />
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </NavTooltip>

      {/* Sub-items */}
      <AnimatePresence>
        {hasChildren && open && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden ml-6 mt-1 space-y-0.5"
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {item.subItems!.map((sub, i) => (
              <motion.button
                key={sub.path}
                initial={{ x: -8, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => onNavigate(sub.path)}
                className={cn(
                  'w-full text-left px-4 py-2 text-xs font-medium transition-all rounded-r-lg relative overflow-hidden',
                  activePath === sub.path
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={activePath === sub.path ? {
                  background: 'rgba(120,40,220,0.08)',
                  boxShadow: [
                    'inset 0 1px 3px rgba(0,0,0,0.08)',
                    'inset 0 -1px 0 rgba(255,255,255,0.12)',
                  ].join(', '),
                } : undefined}
              >
                {sub.title}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar — componente principal
// ─────────────────────────────────────────────────────────────────────────────
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  // ── Estado de expansão controlado por hover ──────────────────────────────
  // Padrão: FECHADO. Abre suavemente ao passar o mouse, fecha com delay para
  // evitar flicker ao mover o cursor entre itens.
  const [isExpanded, setIsExpanded] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Delay antes de fechar — evita flickering quando o cursor sai por 1 pixel
    closeTimer.current = setTimeout(() => setIsExpanded(false), 180);
  }, []);

  // ── Filtragem de menu por role ────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const role = (user?.global_role || 'user').toLowerCase();
    return menuGroupsConfig.filter(group =>
      group.roles.map(r => r.toLowerCase()).includes(role)
    );
  }, [user]);

  const userRole = (user?.global_role || 'user').toLowerCase();
  const isSaaSManager = userRole === 'admin' || userRole === 'super_admin';

  // ── Largura animada da sidebar ─────────────────────────────────────────────
  const COLLAPSED_W = 64;   // px — apenas ícones
  const EXPANDED_W  = 256;  // px — ícones + labels

  return (
    <motion.aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={{ width: isExpanded ? EXPANDED_W : COLLAPSED_W }}
      transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.8 }}
      className="relative h-[calc(100vh-2rem)] my-4 ml-4 flex-shrink-0 z-40"
      style={{ willChange: 'width' }}
    >
      {/* ── CAMADA 0: O blade de vidro líquido ───────────────────────────── */}
      <div
        className="h-full flex flex-col rounded-[2rem] overflow-hidden backdrop-blur-2xl backdrop-saturate-[185%] backdrop-brightness-[1.06]"
        style={SIDEBAR_GLASS}
      >

        {/* ── Header: Logo / CompanySwitcher ──────────────────────────────── */}
        <div className={cn(
          'p-3 transition-all duration-300 flex-shrink-0',
          isExpanded ? 'items-start' : 'items-center',
        )}>
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="expanded-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full"
              >
                {isSaaSManager ? (
                  <CompanySwitcher />
                ) : (
                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ boxShadow: '0 0 16px rgba(120,40,220,0.5)' }}>
                      <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-black text-foreground truncate">{company?.name || 'Zoopi'}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Unidade Ativa</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex justify-center w-full py-1"
              >
                <div
                  className="h-10 w-10 flex items-center justify-center bg-primary rounded-xl"
                  style={{ boxShadow: '0 0 16px rgba(120,40,220,0.5)' }}
                >
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divisor */}
        <div className="mx-3 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* ── Content: Nav groups ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 sidebar-scroll">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <AnimatePresence>
                {isExpanded && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 whitespace-nowrap overflow-hidden"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.title}
                    item={item as MenuItem}
                    isExpanded={isExpanded}
                    onNavigate={navigate}
                    activePath={location.pathname}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Divisor */}
        <div className="mx-4 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* ── Footer: Status ───────────────────────────────────────────────── */}
        <div className="p-5 flex-shrink-0">
          <AnimatePresence>
            {isExpanded && (
            <Badge variant="outline" className="text-[15px] opacity-50 flex-shrink-0">
                  {user?.global_role}
            </Badge>
              
            )}
          </AnimatePresence>

          {/* Indicador compacto quando collapsed */}
          {!isExpanded && (
            <div className="flex justify-center">
              <div
                className="h-2 w-2 rounded-full bg-emerald-500"
                style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }}
              />
            </div>
          )}
        </div>

      </div>
    </motion.aside>
  );
}