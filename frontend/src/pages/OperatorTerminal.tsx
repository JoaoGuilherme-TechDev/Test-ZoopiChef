import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanyModules } from '@/hooks/useCompanyModules';
import { 
  useOperatorTerminalSettings, 
  useIncrementModuleUsage,
  DEFAULT_MODULE_COLORS 
} from '@/hooks/useOperatorTerminalSettings';
import { TerminalSettingsDialog } from '@/components/operator-terminal/TerminalSettingsDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Settings,
  UtensilsCrossed,
  Tags,
  ClipboardList,
  PlusCircle,
  Radio,
  MessageSquare,
  ChefHat,
  Clock,
  Palette
} from 'lucide-react';

// Module components - lazy loaded
const Tables = lazy(() => import('./Tables'));
const Comandas = lazy(() => import('./Comandas'));
const Orders = lazy(() => import('./Orders'));
const PhoneOrder = lazy(() => import('./PhoneOrder'));
const ServiceCallsMonitor = lazy(() => import('./ServiceCallsMonitor'));
const InternalMessages = lazy(() => import('./InternalMessages'));

interface TerminalModule {
  id: string;
  label: string;
  icon: any;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

const ALL_MODULES: TerminalModule[] = [
  {
    id: 'mesas',
    label: 'Mesas',
    icon: UtensilsCrossed,
    component: Tables,
  },
  {
    id: 'comandas',
    label: 'Comandas',
    icon: Tags,
    component: Comandas,
  },
  {
    id: 'novo_pedido',
    label: 'Novo Pedido',
    icon: PlusCircle,
    component: PhoneOrder,
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    icon: ClipboardList,
    component: Orders,
  },
  {
    id: 'chamados',
    label: 'Chamados',
    icon: Radio,
    component: ServiceCallsMonitor,
  },
  {
    id: 'mensagens',
    label: 'Mensagens',
    icon: MessageSquare,
    component: InternalMessages,
  },
];

// Helper function to get gradient from color class
const getGradientFromColor = (colorClass: string) => {
  const baseColor = colorClass.replace('bg-', '').replace('-600', '');
  return `from-${baseColor}-600 to-${baseColor}-700`;
};

// Size class mappings
const SIZE_CLASSES = {
  small: 'col-span-1 row-span-1 min-h-[160px]',
  medium: 'col-span-1 row-span-1 min-h-[200px]',
  large: 'col-span-2 row-span-1 min-h-[240px]',
} as const;

const ICON_SIZES = {
  small: 'w-10 h-10',
  medium: 'w-16 h-16',
  large: 'w-20 h-20',
} as const;

const ICON_CONTAINER_SIZES = {
  small: 'w-16 h-16',
  medium: 'w-20 h-20',
  large: 'w-24 h-24',
} as const;

const TEXT_SIZES = {
  small: 'text-base',
  medium: 'text-lg',
  large: 'text-xl',
} as const;

export default function OperatorTerminal() {
  const navigate = useNavigate();
  const { modules } = useCompanyModules();
  const { data: terminalSettings, isLoading: settingsLoading } = useOperatorTerminalSettings();
  const incrementUsage = useIncrementModuleUsage();
  
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Parse module_colors to separate bg and icon colors
  const { moduleBgColors, moduleIconColors } = useMemo(() => {
    const colors = terminalSettings?.module_colors || DEFAULT_MODULE_COLORS;
    const bgColors: Record<string, string> = {};
    const iconColors: Record<string, string> = {};
    
    Object.entries(colors).forEach(([key, value]) => {
      if (key.endsWith('_icon')) {
        iconColors[key.replace('_icon', '')] = value;
      } else {
        bgColors[key] = value;
      }
    });
    
    return { moduleBgColors: { ...DEFAULT_MODULE_COLORS, ...bgColors }, moduleIconColors: iconColors };
  }, [terminalSettings]);

  const moduleSizes = useMemo(() => {
    return terminalSettings?.module_sizes || {};
  }, [terminalSettings]);

  const backgroundColor = useMemo(() => {
    return terminalSettings?.background_color || 'bg-slate-950';
  }, [terminalSettings]);

  // Filter and order modules based on company settings AND user terminal settings
  const availableModules = useMemo(() => {
    // First filter by company module access
    let filtered = ALL_MODULES.filter(mod => {
      if (mod.id === 'mesas' && !modules.module_tables) return false;
      if (mod.id === 'comandas' && !modules.module_comandas) return false;
      if (mod.id === 'novo_pedido' && !modules.module_new_order) return false;
      if (mod.id === 'pedidos' && !modules.module_orders) return false;
      if (mod.id === 'chamados' && !modules.module_calls) return false;
      if (mod.id === 'mensagens' && !modules.module_messages) return false;
      return true;
    });

    // Filter by user's enabled modules if settings exist
    if (terminalSettings?.enabled_modules && terminalSettings.enabled_modules.length > 0) {
      filtered = filtered.filter(mod => terminalSettings.enabled_modules.includes(mod.id));
    }

    // Sort by module order if exists
    if (terminalSettings?.module_order && terminalSettings.module_order.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const indexA = terminalSettings.module_order.indexOf(a.id);
        const indexB = terminalSettings.module_order.indexOf(b.id);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return filtered;
  }, [modules, terminalSettings]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Track module usage when selecting
  const handleModuleSelect = (moduleId: string) => {
    setActiveModuleId(moduleId);
    incrementUsage.mutate(moduleId);
  };

  const activeModule = availableModules.find(m => m.id === activeModuleId);
  const ActiveComponent = activeModule?.component;

  // Get color for a module
  const getModuleBgColor = (moduleId: string) => {
    return moduleBgColors[moduleId] || DEFAULT_MODULE_COLORS[moduleId] || 'bg-blue-600';
  };

  const getModuleIconColor = (moduleId: string) => {
    return moduleIconColors[moduleId] || 'text-white';
  };

  const getModuleGradient = (moduleId: string) => {
    const color = getModuleBgColor(moduleId);
    return getGradientFromColor(color);
  };

  const getModuleSize = (moduleId: string): 'small' | 'medium' | 'large' => {
    return moduleSizes[moduleId] || 'medium';
  };

  return (
    <div className={cn("min-h-screen text-white flex flex-col", backgroundColor)}>
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => activeModuleId ? setActiveModuleId(null) : navigate('/')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {activeModuleId ? 'Menu' : 'Dashboard'}
          </Button>
          
          {activeModule && (
            <div className="flex items-center gap-2">
              <activeModule.icon className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">{activeModule.label}</h1>
            </div>
          )}
          
          {!activeModuleId && (
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Terminal Operador</h1>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">
              {currentTime.toLocaleTimeString('pt-BR')}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="text-slate-400 hover:text-white"
            title="Personalizar Terminal"
          >
            <Palette className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="text-slate-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-slate-400 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex">
        {activeModuleId && ActiveComponent ? (
          <>
            {/* Quick Navigation Sidebar */}
            <nav className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 gap-1 shrink-0">
              {availableModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = mod.id === activeModuleId;
                const bgColor = getModuleBgColor(mod.id);
                const iconColor = getModuleIconColor(mod.id);
                const bgGradient = getModuleGradient(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleModuleSelect(mod.id)}
                    title={mod.label}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                      isActive 
                        ? bgColor === 'bg-white' 
                          ? 'bg-white border border-gray-200 shadow-lg' 
                          : `bg-gradient-to-br ${bgGradient} shadow-lg`
                        : "bg-slate-800/50 hover:bg-slate-700/70 text-slate-400 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? iconColor : '')} />
                  </button>
                );
              })}
            </nav>
            
            {/* Module Content */}
            <div className="flex-1 overflow-auto">
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }>
                <TerminalModuleWrapper>
                  <ActiveComponent />
                </TerminalModuleWrapper>
              </Suspense>
            </div>
          </>
        ) : (
          /* Module Selection Grid */
          <div className="p-6 h-full flex flex-col w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Selecione o Módulo</h2>
              <p className="text-slate-400">Escolha uma área para operar</p>
            </div>
            
            {settingsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto w-full auto-rows-min">
                {availableModules.map((mod) => {
                  const Icon = mod.icon;
                  const bgColor = getModuleBgColor(mod.id);
                  const iconColor = getModuleIconColor(mod.id);
                  const bgGradient = getModuleGradient(mod.id);
                  const usageCount = terminalSettings?.module_usage_count?.[mod.id] || 0;
                  const size = getModuleSize(mod.id);
                  
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleModuleSelect(mod.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-4 p-6 rounded-3xl transition-all",
                        "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                        "border border-slate-700/50 hover:border-slate-500/70",
                        "group hover:scale-[1.02] active:scale-[0.98]",
                        "hover:shadow-xl hover:shadow-slate-900/50",
                        "relative",
                        SIZE_CLASSES[size]
                      )}
                    >
                      {/* Usage badge */}
                      {usageCount > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-3 right-3 text-xs bg-slate-700/80"
                        >
                          {usageCount}x
                        </Badge>
                      )}
                      
                      <div className={cn(
                        "rounded-2xl flex items-center justify-center transition-all",
                        "shadow-lg",
                        bgColor === 'bg-white' ? 'bg-white border border-gray-200' : `bg-gradient-to-br ${bgGradient}`,
                        "group-hover:scale-110 group-hover:rotate-3",
                        ICON_CONTAINER_SIZES[size]
                      )}>
                        <Icon className={cn(iconColor, ICON_SIZES[size])} />
                      </div>
                      <span className={cn("font-bold text-white", TEXT_SIZES[size])}>
                        {mod.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Quick Stats Footer */}
            <div className="mt-8 flex items-center justify-center gap-6 text-slate-400 text-sm">
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {availableModules.length} módulos disponíveis
              </Badge>
              <span>•</span>
              <span>Pressione ESC para sair da tela cheia</span>
            </div>
          </div>
        )}
      </main>

      {/* Settings Dialog */}
      <TerminalSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        allModules={ALL_MODULES.filter(mod => {
          if (mod.id === 'mesas' && !modules.module_tables) return false;
          if (mod.id === 'comandas' && !modules.module_comandas) return false;
          if (mod.id === 'novo_pedido' && !modules.module_new_order) return false;
          if (mod.id === 'pedidos' && !modules.module_orders) return false;
          if (mod.id === 'chamados' && !modules.module_calls) return false;
          if (mod.id === 'mensagens' && !modules.module_messages) return false;
          return true;
        })}
      />
    </div>
  );
}

// Wrapper component that adapts child components for terminal view
function TerminalModuleWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="terminal-wrapper h-full w-full">
      <style>{`
        /* Hide any sidebar component completely */
        .terminal-wrapper [data-sidebar="sidebar"],
        .terminal-wrapper [data-sidebar="rail"],
        .terminal-wrapper .peer[data-state],
        .terminal-wrapper .peer[data-state] > div,
        .terminal-wrapper [class*="SidebarProvider"],
        .terminal-wrapper aside[class*="sidebar"] {
          display: none !important;
          width: 0 !important;
          min-width: 0 !important;
          visibility: hidden !important;
          position: absolute !important;
          left: -9999px !important;
        }

        /* Remove any min-height constraints */
        .terminal-wrapper .min-h-screen,
        .terminal-wrapper .min-h-svh {
          min-height: auto !important;
        }

        /* Hide the dashboard header */
        .terminal-wrapper header.flex.h-16.shrink-0.items-center,
        .terminal-wrapper header[class*="border-b"][class*="px-4"] {
          display: none !important;
        }

        /* Adjust main content padding */
        .terminal-wrapper main.flex-1.p-6,
        .terminal-wrapper main.flex-1 {
          padding: 1rem !important;
          background: transparent !important;
          margin-left: 0 !important;
        }

        /* Make sidebar inset take full width */
        .terminal-wrapper [data-slot="inset"],
        .terminal-wrapper main {
          margin-left: 0 !important;
          width: 100% !important;
        }

        /* Remove background colors */
        .terminal-wrapper .bg-background {
          background: transparent !important;
        }
        
        .terminal-wrapper .bg-card {
          background: hsl(var(--card)) !important;
        }

        /* Ensure proper scrolling inside */
        .terminal-wrapper > div {
          height: 100%;
          overflow: auto;
        }

        /* Fix for flex containers */
        .terminal-wrapper .flex.w-full,
        .terminal-wrapper .flex.min-h-screen {
          width: 100% !important;
          min-height: auto !important;
        }
        
        /* Hide subscription banners and other top-level elements */
        .terminal-wrapper [class*="SubscriptionWarningBanner"],
        .terminal-wrapper [class*="SubscriptionExpiryNotice"],
        .terminal-wrapper [class*="OnboardingWizard"] {
          display: none !important;
        }
        
        /* Make images load properly */
        .terminal-wrapper img {
          max-width: 100%;
          height: auto;
        }
        
        /* Ensure scroll areas work */
        .terminal-wrapper [data-radix-scroll-area-viewport] {
          overflow: auto !important;
        }
      `}</style>
      {children}
    </div>
  );
}