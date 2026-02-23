import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, Trophy, ArrowLeft } from "lucide-react";
import { useStaffPerformanceSettings, useStaffLeaderboard } from "@/hooks/useStaffPerformance";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function StaffPerformancePage() {
  const navigate = useNavigate();
  const { settings, isLoading, updateSettings } = useStaffPerformanceSettings();
  const { data: leaderboard } = useStaffLeaderboard();

  if (isLoading) return <DashboardLayout title="Performance da Equipe"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Performance da Equipe">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="w-8 h-8" />Performance da Equipe</h1>
              <p className="text-muted-foreground">Analytics de vendas, upsell e atendimento por funcionário</p>
            </div>
          </div>
          <Switch checked={settings?.enabled || false} onCheckedChange={(enabled) => updateSettings.mutate({ enabled })} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" />Ranking Semanal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {leaderboard?.length === 0 && <p className="text-muted-foreground text-center py-4">Sem dados ainda</p>}
              {leaderboard?.slice(0, 10).map((user, idx) => (
                <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-muted'}`}>{idx + 1}</div>
                    <span className="font-medium truncate max-w-[150px]">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">R$ {(user.total_sales / 100).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">{user.orders} pedidos</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Métricas Rastreadas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between"><Label>Vendas por Hora</Label><Switch checked={settings?.track_sales_per_hour || false} onCheckedChange={(v) => updateSettings.mutate({ track_sales_per_hour: v })} /></div>
              <div className="flex items-center justify-between"><Label>Ticket Médio</Label><Switch checked={settings?.track_avg_ticket || false} onCheckedChange={(v) => updateSettings.mutate({ track_avg_ticket: v })} /></div>
              <div className="flex items-center justify-between"><Label>Taxa de Upsell</Label><Switch checked={settings?.track_upsell_rate || false} onCheckedChange={(v) => updateSettings.mutate({ track_upsell_rate: v })} /></div>
              <div className="flex items-center justify-between"><Label>Rotatividade de Mesas</Label><Switch checked={settings?.track_table_turnover || false} onCheckedChange={(v) => updateSettings.mutate({ track_table_turnover: v })} /></div>
              <div className="flex items-center justify-between"><Label>Avaliações de Clientes</Label><Switch checked={settings?.track_customer_ratings || false} onCheckedChange={(v) => updateSettings.mutate({ track_customer_ratings: v })} /></div>
              <div className="flex items-center justify-between"><Label>Gamificação</Label><Switch checked={settings?.gamification_enabled || false} onCheckedChange={(v) => updateSettings.mutate({ gamification_enabled: v })} /></div>
              <div className="flex items-center justify-between"><Label>Mostrar Ranking</Label><Switch checked={settings?.show_leaderboard || false} onCheckedChange={(v) => updateSettings.mutate({ show_leaderboard: v })} /></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
