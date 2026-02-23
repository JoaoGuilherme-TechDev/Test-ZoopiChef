import { useCompanyModules, CompanyModules } from '@/hooks/useCompanyModules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  LayoutGrid,
  ClipboardList,
  ShoppingCart,
  PlusCircle,
  Bell,
  MessageSquare,
  Tv,
  Megaphone,
  Brain,
  Wine,
  Loader2,
  Scale,
  MapPin,
  Tablet,
  Truck,
  BarChart3,
  HandCoins,
  Calendar,
  CloudSun,
  ScanLine,
} from 'lucide-react';

interface ModuleItem {
  key: keyof CompanyModules;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const MODULES: ModuleItem[] = [
  {
    key: 'module_tables',
    label: 'Mesas',
    description: 'Gerenciamento de mesas do estabelecimento',
    icon: <LayoutGrid className="w-5 h-5" />,
  },
  {
    key: 'module_comandas',
    label: 'Comandas',
    description: 'Controle de comandas para pedidos',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    key: 'module_new_order',
    label: 'Novo Pedido',
    description: 'Criar pedidos (Ligação, Balcão, Delivery)',
    icon: <PlusCircle className="w-5 h-5" />,
  },
  {
    key: 'module_orders',
    label: 'Pedidos',
    description: 'Gestão de pedidos (Kanban)',
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    key: 'module_calls',
    label: 'Chamados',
    description: 'Chamados de clientes e garçom',
    icon: <Bell className="w-5 h-5" />,
  },
  {
    key: 'module_messages',
    label: 'Mensagens',
    description: 'Mensagens internas entre setores',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    key: 'module_tv',
    label: 'Telas de TV',
    description: 'Exibição de cardápio e promoções em TVs',
    icon: <Tv className="w-5 h-5" />,
  },
  {
    key: 'module_marketing',
    label: 'Marketing',
    description: 'Campanhas e promoções automáticas',
    icon: <Megaphone className="w-5 h-5" />,
  },
  {
    key: 'module_ai',
    label: 'Inteligência Artificial',
    description: 'Sugestões e análises com IA',
    icon: <Brain className="w-5 h-5" />,
  },
  {
    key: 'module_sommelier',
    label: 'Enólogo Virtual',
    description: 'Recomendações de vinhos por IA',
    icon: <Wine className="w-5 h-5" />,
  },
  {
    key: 'module_scale',
    label: 'Balança Automática',
    description: 'Terminal de pesagem para self-service',
    icon: <Scale className="w-5 h-5" />,
  },
  {
    key: 'module_tracking',
    label: 'Rastreio GPS',
    description: 'Rastreamento de entregadores em tempo real',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    key: 'module_tablet',
    label: 'Tablet/Totem',
    description: 'Autoatendimento em tablet ou totem',
    icon: <Tablet className="w-5 h-5" />,
  },
  {
    key: 'module_self_checkout',
    label: 'Self Check-out',
    description: 'Terminal para pagamento de comandas pelo cliente',
    icon: <ShoppingCart className="w-5 h-5" />,
  },
  {
    key: 'module_expedition',
    label: 'Expedição',
    description: 'Terminal de expedição para entregadores',
    icon: <Truck className="w-5 h-5" />,
  },
  {
    key: 'module_performance',
    label: 'Performance',
    description: 'Dashboard de performance operacional em tempo real',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    key: 'module_bill_split',
    label: 'Divisão de Contas',
    description: 'Dividir contas e gerenciar gorjetas',
    icon: <HandCoins className="w-5 h-5" />,
  },
  {
    key: 'module_scheduled_orders',
    label: 'Agendamento de Pedidos',
    description: 'Pedidos programados para datas futuras',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    key: 'module_weather_menu',
    label: 'Cardápio por Clima',
    description: 'Sugestões de cardápio baseadas no clima',
    icon: <CloudSun className="w-5 h-5" />,
  },
  {
    key: 'module_comanda_validator',
    label: 'Validador de Comandas',
    description: 'Scanner para validação e auditoria de comandas',
    icon: <ScanLine className="w-5 h-5" />,
  },
];

export function ModulesConfig() {
  const { modules, isLoading, updateModules, isUpdating } = useCompanyModules();

  const handleToggle = async (key: keyof CompanyModules, enabled: boolean) => {
    try {
      await updateModules({ [key]: enabled });
      toast.success(enabled ? 'Módulo ativado' : 'Módulo desativado');
    } catch (error) {
      toast.error('Erro ao atualizar módulo');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <LayoutGrid className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-display">Módulos do Sistema</CardTitle>
            <CardDescription>
              Ative ou desative módulos para personalizar o Terminal PDV
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          Os módulos ativos aparecerão no <strong>Terminal Operador</strong> (PDV). 
          Desative os que não utiliza para simplificar a interface.
        </p>

        <div className="grid gap-4">
          {MODULES.map((module) => (
            <div 
              key={module.key}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {module.icon}
                </div>
                <div>
                  <Label className="font-medium">{module.label}</Label>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              </div>
              <Switch
                checked={modules[module.key]}
                onCheckedChange={(checked) => handleToggle(module.key, checked)}
                disabled={isUpdating}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
