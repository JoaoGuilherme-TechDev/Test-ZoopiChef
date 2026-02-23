import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProfile, useUserRole } from '@/hooks/useProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useCompany } from '@/hooks/useCompany';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package,
  LayoutGrid,
  Calculator,
  Tv,
  Sparkles,
  Building2,
  Clock,
  Timer,
  Monitor,
  RefreshCw,
  Wifi,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { useEffect } from 'react';
import { RealtimeOrdersWidget } from '@/components/dashboard/RealtimeOrdersWidget';
import { RealtimeTablesWidget } from '@/components/dashboard/RealtimeTablesWidget';
import { RealtimeCashWidget } from '@/components/dashboard/RealtimeCashWidget';
import { RealtimeFinancialsWidget } from '@/components/dashboard/RealtimeFinancialsWidget';
import { RealtimeInventoryWidget } from '@/components/dashboard/RealtimeInventoryWidget';
import { RealtimeMetricsWidget } from '@/components/dashboard/RealtimeMetricsWidget';
import { DailyGoalWidget } from '@/components/dashboard/DailyGoalWidget';
import { KitchenLoadWidget } from '@/components/dashboard/KitchenLoadWidget';
import { AIInsightsWidget } from '@/components/dashboard/AIInsightsWidget';
import { NextActionsWidget } from '@/components/dashboard/NextActionsWidget';
import { GamifiedProgress } from '@/modules/help-center';
import { DashboardChartsSection } from '@/components/dashboard/DashboardChartsSection';
export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: userRole } = useUserRole();
  const { data: company } = useCompany();
  const { data: realtimeData, isLoading: realtimeLoading, refetch } = useDashboardRealtime();

  const { isSuperAdmin } = useUserRoles();
  const isAdmin = isSuperAdmin || userRole?.role === 'admin';

  // Prefetch dados críticos ao carregar o dashboard
  useEffect(() => {
    if (!company?.id) return;

    queryClient.prefetchQuery({
      queryKey: ['orders', company.id],
      staleTime: 1000 * 30,
    });

    queryClient.prefetchQuery({
      queryKey: ['products', company.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, active')
          .eq('company_id', company.id)
          .eq('active', true)
          .limit(100);
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });

    queryClient.prefetchQuery({
      queryKey: ['deliverers', company.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('deliverers')
          .select('id, name, active')
          .eq('company_id', company.id)
          .eq('active', true);
        return data || [];
      },
      staleTime: 1000 * 60 * 5,
    });
  }, [company?.id, queryClient]);

  const quickActions = [
    { label: 'Terminal', icon: Monitor, path: '/terminal', color: 'bg-muted text-foreground' },
    { label: 'Produtos', icon: Package, path: '/products', color: 'bg-primary/10 text-primary' },
    { label: 'Pedidos', icon: LayoutGrid, path: '/orders', color: 'bg-info/10 text-info' },
    { label: 'Caixa', icon: Calculator, path: '/cashier', color: 'bg-success/10 text-success' },
    { label: 'Entregas', icon: Truck, path: '/deliverers', color: 'bg-warning/10 text-warning' },
    { label: 'Tempos', icon: Timer, path: '/timer-dashboard', color: 'bg-accent/10 text-accent-foreground' },
    { label: 'TV', icon: Tv, path: '/banners', color: 'bg-secondary text-secondary-foreground' },
    { label: 'IA Gestora', icon: Sparkles, path: '/ai-recommendations', color: 'bg-primary/20 text-primary' },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header with Realtime Indicator */}
        <div className="gradient-primary rounded-xl p-6 text-primary-foreground shadow-large">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">
                Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
              </h2>
              <p className="opacity-90">
                {company 
                  ? `${company.name} • Painel de Controle` 
                  : 'Configure sua empresa para começar'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm opacity-80">
                <Clock className="w-4 h-4" />
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 animate-pulse" />
                  Tempo Real
                </Badge>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => refetch()}
                  disabled={realtimeLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${realtimeLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Realtime Dashboard Grid */}
        {realtimeData ? (
          <>
            {/* Row 1: Pedidos + Caixa */}
            <div className="grid gap-4 lg:grid-cols-2">
              <RealtimeOrdersWidget data={realtimeData.orders} />
              <RealtimeCashWidget 
                cashRegister={realtimeData.cashRegister} 
                deletions={realtimeData.deletions}
              />
            </div>

            {/* Row 2: Mesas e Comandas */}
            <RealtimeTablesWidget 
              tables={realtimeData.tables} 
              comandas={realtimeData.comandas}
            />

            {/* Row 3: Métricas de Performance */}
            <RealtimeMetricsWidget data={realtimeData.metrics} />

            {/* Row 4: Financeiro + Estoque */}
            <div className="grid gap-4 lg:grid-cols-2">
              <RealtimeFinancialsWidget data={realtimeData.financials} />
              <RealtimeInventoryWidget data={realtimeData.inventory} />
            </div>

            {/* Row 5: GRÁFICOS VISUAIS */}
            <DashboardChartsSection data={realtimeData} />

            {/* Row 6: Performance Widgets */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DailyGoalWidget goalMinutes={35} />
              <KitchenLoadWidget />
              <AIInsightsWidget />
              <NextActionsWidget />
            </div>
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-40 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-display font-semibold mb-4 text-foreground">
            Acesso Rápido
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="h-auto py-4 flex-col gap-2 border-border/50 hover:border-primary/50 hover:shadow-medium transition-all group"
                onClick={() => navigate(action.path)}
              >
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Gamified Onboarding Progress */}
        <GamifiedProgress compact />

        {/* Company Warning */}
        {!company && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Building2 className="w-5 h-5 text-warning" />
                Empresa não configurada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Configure sua empresa para desbloquear todas as funcionalidades do sistema.
              </p>
              <Button onClick={() => navigate('/company')}>
                Configurar Empresa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
