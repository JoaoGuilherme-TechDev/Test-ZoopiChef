import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, UtensilsCrossed, Users, Clock, Radio, Truck } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSalonOverview, useRecentActiveOrders, useWaiterCallsCount } from "@/hooks/useSalonOverview";

export default function PrincipalSalaoPedidosPage() {
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();
  const { data: salon } = useSalonOverview();
  const { data: recentOrders = [] } = useRecentActiveOrders(5);
  const { data: callsCount = 0 } = useWaiterCallsCount();

  return (
    <DashboardLayout title="Salão & Pedidos">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/30">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground">
                Salão & Pedidos
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Visão operacional unificada de mesas, comandas, produção e chamados do salão.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest"
              onClick={() => navigate("/principal/salao-pedidos/tables")}
            >
              Mesas
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest"
              onClick={() => navigate("/principal/salao-pedidos/comandas")}
            >
              Comandas
            </Button>
            <Button
              size="sm"
              className="h-9 text-[10px] font-black uppercase tracking-widest"
              onClick={() => navigate("/principal/salao-pedidos/gestao-pedidos")}
            >
              Ir para fila de pedidos
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card border border-white/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Mesas ocupadas
                </p>
                <p className="text-2xl font-black text-foreground">
                  {salon?.ocupadas ?? 0}
                  <span className="text-sm font-semibold text-muted-foreground">
                    {typeof salon?.total === "number" ? `/${salon?.total}` : ""}
                  </span>
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                Fluxo saudável
              </Badge>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Pedidos ativos
                </p>
                <p className="text-2xl font-black text-foreground">
                  {stats?.pedidos_ativos ?? 0}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Média 14 min</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Chamados de salão
                </p>
                <p className="text-2xl font-black text-foreground">
                  {callsCount}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[10px] font-black uppercase tracking-widest"
                onClick={() => navigate("/chamados")}
              >
                Ver chamados
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr,1.4fr]">
          <Card className="glass-card border border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Visão do Salão
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                Resumo
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { status: "Ocupadas", value: salon?.ocupadas ?? 0, total: salon?.total ?? undefined, color: "text-emerald-400" },
                  { status: "Reservadas", value: salon?.reservadas ?? 0, total: salon?.total ?? undefined, color: "text-amber-400" },
                  { status: "Aguardando pagamento", value: salon?.aguardando ?? 0, total: salon?.total ?? undefined, color: "text-red-400" },
                ].map((item) => (
                  <div
                    key={item.status}
                    className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {item.status}
                      </span>
                      <Users className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                    <p className={`text-xl font-black ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {typeof item.total === "number" ? `De ${item.total} mesas configuradas` : "Resumo de mesas"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Rotatividade dentro da meta.</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => navigate("/principal/salao-pedidos/mesas")}
                >
                  Abrir visão de mesas
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Fila rápida de pedidos
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span>{recentOrders.length} na fila</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        {order.id}
                      </span>
                      <span className="text-sm text-foreground">
                        {order.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{order.time}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {order.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-[10px] font-black uppercase tracking-widest"
                onClick={() => navigate("/principal/salao-pedidos/gestao-pedidos")}
              >
                Abrir gestão de pedidos
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-card border border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Atalhos operacionais
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                Salão
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start h-10 text-xs font-bold uppercase tracking-widest"
                onClick={() => navigate("/tables")}
              >
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Mesas
              </Button>
              <Button
                variant="outline"
                className="justify-start h-10 text-xs font-bold uppercase tracking-widest"
                onClick={() => navigate("/principal/salao-pedidos/comandas")}
              >
                <Users className="h-4 w-4 mr-2" />
                Comandas
              </Button>
              <Button
                variant="outline"
                className="justify-start h-10 text-xs font-bold uppercase tracking-widest"
                onClick={() => navigate("/principal/salao-pedidos/kds-cozinha")}
              >
                <Truck className="h-4 w-4 mr-2" />
                KDS Cozinha
              </Button>
              <Button
                variant="outline"
                className="justify-start h-10 text-xs font-bold uppercase tracking-widest"
                onClick={() => navigate("/principal/salao-pedidos/chamados")}
              >
                <Radio className="h-4 w-4 mr-2" />
                Chamados de salão
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card border border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">
                Próximas melhorias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Esta tela vai evoluir para mostrar mapa visual do salão em tempo real,
                tempos de preparo por setor e alertas proativos da operação.
              </p>
              <p>
                Use os atalhos acima para navegar entre telas de mesas, comandas,
                KDS, chamados e fila de pedidos enquanto centralizamos tudo aqui.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
