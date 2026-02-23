import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { usePredictiveUpsellingSettings, useUpsellingStats } from "@/hooks/usePredictiveUpselling";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function PredictiveUpsellingSettings() {
  const { settings, isLoading, updateSettings } = usePredictiveUpsellingSettings();
  const { data: stats } = useUpsellingStats();

  if (isLoading) return <DashboardLayout title="Upselling Preditivo"><div className="p-8 text-center">Carregando...</div></DashboardLayout>;

  return (
    <DashboardLayout title="Upselling Preditivo">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="w-8 h-8" />Upselling Preditivo</h1>
            <p className="text-muted-foreground">IA sugere produtos complementares para aumentar ticket</p>
          </div>
          <Switch checked={settings?.enabled || false} onCheckedChange={(enabled) => updateSettings.mutate({ enabled })} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats?.totalShown || 0}</div><p className="text-xs text-muted-foreground">Sugestões</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats?.totalClicked || 0}</div><p className="text-xs text-muted-foreground">Clicadas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats?.totalConverted || 0}</div><p className="text-xs text-muted-foreground">Convertidas</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats?.clickRate || 0}%</div><p className="text-xs text-muted-foreground">Taxa Clique</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div><p className="text-xs text-muted-foreground">Conversão</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold">R$ {((stats?.revenueAdded || 0) / 100).toFixed(0)}</div><p className="text-xs text-muted-foreground">Receita Extra</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Onde Mostrar Sugestões</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>No Totem/Kiosk</Label><Switch checked={settings?.show_on_kiosk || false} onCheckedChange={(v) => updateSettings.mutate({ show_on_kiosk: v })} /></div>
            <div className="flex items-center justify-between"><Label>No PDV</Label><Switch checked={settings?.show_on_pos || false} onCheckedChange={(v) => updateSettings.mutate({ show_on_pos: v })} /></div>
            <div className="flex items-center justify-between"><Label>No App do Garçom</Label><Switch checked={settings?.show_on_waiter_app || false} onCheckedChange={(v) => updateSettings.mutate({ show_on_waiter_app: v })} /></div>
            <div className="flex items-center justify-between"><Label>Sugestões por Horário</Label><Switch checked={settings?.time_based_suggestions || false} onCheckedChange={(v) => updateSettings.mutate({ time_based_suggestions: v })} /></div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
