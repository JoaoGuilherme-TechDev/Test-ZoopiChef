/* eslint-disable @typescript-eslint/no-explicit-any */
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  RefreshCw,
  ArrowUpRight,
  Clock,
  Zap,
  BarChart3
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading, isRefetching, refetch } = useDashboardStats();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const StatCard = ({ title, value, icon: Icon, trend, description, colorClass }: any) => (
    <Card className="card-neon border-none overflow-hidden group transition-all duration-300 hover:scale-[1.02] h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-xl transition-colors", colorClass)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="text-3xl xl:text-4xl font-black tracking-tight">
          {isLoading ? "..." : value}
        </div>
        <div className="flex items-center mt-2 min-h-[1.5rem]">
          {trend && (
            <span className="text-xs font-bold text-green-500 flex items-center mr-2 bg-green-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3 mr-1" />
              {trend}
            </span>
          )}
          <p className="text-xs text-muted-foreground font-medium">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="Painel de Controle">
      <div className="space-y-8 animate-fade-in">
        
        {/* BANNER DE BOAS-VINDAS */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-shift p-8 text-white shadow-glow">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-black font-display tracking-tight">
                Olá, {user?.full_name?.split(' ')[0] || 'Operador'}! 👋
              </h2>
              <p className="text-blue-100 text-lg opacity-90 max-w-md">
                Aqui está o resumo da sua operação nos últimos <span className="font-bold underline decoration-green-400">7 dias</span>.
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="bg-white/10 border-white/20 hover:bg-white/30 text-white backdrop-blur-md rounded-xl font-bold"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw className={cn("h-5 w-5 mr-2", (isLoading || isRefetching) && "animate-spin")} />
              Atualizar Dados
            </Button>
          </div>
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/20 blur-[80px]" />
        </div>

        {/* MÉTRICAS PRINCIPAIS */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:gap-8">
          <StatCard 
            title="Vendas Hoje"
            value={formatCurrency(stats?.vendas_hoje || 0)}
            icon={DollarSign}
            trend={stats?.vendas_tendencia !== "+0%" ? stats?.vendas_tendencia : null}
            description="Faturamento bruto total"
            colorClass="bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
          />
          <StatCard 
            title="Pedidos"
            value={stats?.pedidos_hoje || 0}
            icon={ShoppingCart}
            description={`${stats?.pedidos_ativos || 0} em produção agora`}
            colorClass="bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]"
          />
          <StatCard 
            title="Ticket Médio"
            value={formatCurrency(stats?.ticket_medio || 0)}
            icon={Zap}
            description="Média por pedido"
            colorClass="bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
          />
          <StatCard 
            title="Novos Clientes"
            value={stats?.clientes_novos || 0}
            icon={Users}
            description="Clientes únicos hoje"
            colorClass="bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
          />
        </div>

        {/* GRÁFICO E PERFORMANCE */}
        <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">
          
          <Card className="lg:col-span-2 xl:col-span-3 glass-card border-none overflow-hidden relative">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Volume de Vendas Semanal
                </CardTitle>
                
              </div>
            </CardHeader>
            <CardContent className="pt-8 pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.chartData || []}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      hide={true} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#4ade80' }}
                      formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Eficiência Operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-tighter">Tempo em Preparo</span>
                  <Badge variant="outline" className="border-green-500/50 text-green-500 font-black">OTIMIZADO</Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black">18</span>
                  <span className="text-muted-foreground font-bold">min</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full w-[45%] rounded-full shadow-[0_0_15px_hsl(var(--primary))]" />
                </div>
              </div>

              
                

              <Button 
                className="w-full btn-neon h-14 rounded-2xl group text-base font-bold" 
                onClick={() => window.location.href='/orders'}
              >
                Gerenciar Produção
                <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;